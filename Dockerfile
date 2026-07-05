FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
# NODE_ENV is unset in this stage, so `npm ci` installs devDependencies too
# (npm only skips them when NODE_ENV=production at install time). That's
# required here: tsx (a devDependency) is what the runner stage's CMD uses to
# run server.ts directly, with no separate compile step for the server.
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
# dist/ is the Vite-built SPA; server/app.ts serves it statically from
# path.join(process.cwd(), 'dist') when NODE_ENV=production — cwd here is
# /app (WORKDIR above), so /app/dist lines up with no extra config.
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/server.ts ./server.ts
# server/** imports parseFountain from src/lib/fountain.ts at runtime
# (server/lib/breakdown.ts, server/routes/export.ts, server/nvm/analyze/
# fountain-analyzer.ts, locate.ts, deep-read.ts, fix.ts — verified exhaustively
# via `grep -rn "from '\.\./\.\./src\|from '\.\./\.\./\.\./src" server`).
# fountain.ts itself has zero imports (no React/DOM, no other src/ files), so
# copying just src/lib/ — never src/components, src/*.tsx, or any other
# frontend-only src/ path — is sufficient; those are bundled into dist/ at
# build time and are not needed server-side.
COPY --from=builder /app/src/lib ./src/lib
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Per-session SQLite persistence dir (server/lib/session-store.ts,
# SESSION_DB_DIR, default ./data/sessions — disk persistence is ON BY DEFAULT,
# not opt-in; set SESSION_DB_DIR=:memory: to disable). session-store.ts never
# mkdir's this path, and better-sqlite3 creates the db FILE but not a missing
# parent directory, so without the mkdir below the first session write would
# throw ENOENT. Mount a volume here for deployments that must survive
# container restarts, e.g.:
#   docker run -v storymachine-data:/app/data ...
RUN mkdir -p /app/data/sessions
VOLUME ["/app/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["npx", "tsx", "server.ts"]
