import React, { useEffect, useState } from "react";
import { ChevronLeft, HardDrive, Server, Wifi, Trash2 } from "lucide-react";

// E4 — the honest privacy page StartScreen's one-sentence privacy claim
// ("Keyless by default — your script stays in this deployment unless you
// turn on AI features yourself.") links to. Reached via the #privacy hash
// route (App.tsx), same pattern as #verify (VerifyReport.tsx).
//
// Every claim on this page is written against, and only against, code this
// change actually ships:
//   - the browser storage claims describe src/lib/scriptide-draft-store.ts
//     (localStorage) and src/lib/scriptide-idb-store.ts (the IndexedDB
//     mirror added by this same change).
//   - the server storage claim describes server/lib/session-store.ts's
//     PERSIST_SESSIONS mode and README.md's "Session data (data/sessions/)"
//     section, which this page does not restate beyond what that section
//     already documents.
//   - the "nothing leaves unless AI is on" claim mirrors
//     docs/PATH_TO_EXCELLENCE.md's own stated differentiator and
//     StartScreen.tsx's E3 sentence verbatim in substance.
//   - the delete-everything description matches
//     src/components/SettingsPanel.tsx's SessionTab copy and
//     server/routes/config.ts's POST /api/session/delete handler exactly.
const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-stamp focus-visible:outline-offset-4";

interface AiConfigProbe {
  llmReady?: boolean;
}

export default function PrivacyPage() {
  // Best-effort, informational only: this page still renders its full,
  // correct claims even if this fetch never resolves (offline demo builds,
  // a slow first load) — see the fallback text below.
  const [llmReady, setLlmReady] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: AiConfigProbe | null) => {
        if (!cancelled && data && typeof data.llmReady === "boolean") {
          setLlmReady(data.llmReady);
        }
      })
      .catch(() => { /* informational only — page's claims stand either way */ });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-paper text-ink font-sans">
      <div className="film-grain" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-8 px-6 py-12 sm:px-10 sm:py-16">
        <header className="flex flex-col gap-4">
          <a
            href="#"
            className={`inline-flex w-fit min-h-[44px] items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-ink/60 transition-colors hover:text-stamp ${FOCUS_RING}`}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to start
          </a>
          <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-ink/50">
            What stays where
          </p>
          <h1 className="font-display text-4xl uppercase leading-none text-ink sm:text-5xl">
            Privacy
          </h1>
          <p className="max-w-[62ch] text-[15px] leading-relaxed text-ink/75">
            This page states plainly what this deployment keeps, where, and how to
            delete it. It backs the one-sentence claim on the entrance screen —
            nothing here is aspirational; every line describes code this build
            actually runs.
          </p>
        </header>

        <section aria-labelledby="privacy-browser-heading" className="sm-panel">
          <div className="sm-panel-body flex flex-col gap-3">
            <h2 id="privacy-browser-heading" className="sm-h flex items-center gap-2">
              <HardDrive className="h-4 w-4" aria-hidden="true" />
              What stays in this browser
            </h2>
            <p className="text-sm leading-relaxed text-ink/80">
              Your draft — script text, snapshots, characters, research notes, and
              title page — autosaves into this browser's <strong>localStorage</strong>{" "}
              on every edit, and is mirrored into this browser's{" "}
              <strong>IndexedDB</strong> on the same schedule. The IndexedDB copy
              exists because localStorage caps out around 5MB per origin — a long
              screenplay with a deep snapshot history can exceed that, and
              IndexedDB has much more room. Neither store is sent anywhere by
              itself; both live only on this device, in this browser.
            </p>
            <p className="text-sm leading-relaxed text-ink/80">
              A handful of small preferences also live in localStorage: theme,
              whether Live Notes / auto-analysis / typewriter sound are on, the
              Labs flag, and this browser's session ID (the opaque identifier that
              ties it to its server-side session below — not a login, not
              personally identifying on its own).
            </p>
          </div>
        </section>

        <section aria-labelledby="privacy-server-heading" className="sm-panel">
          <div className="sm-panel-body flex flex-col gap-3">
            <h2 id="privacy-server-heading" className="sm-h flex items-center gap-2">
              <Server className="h-4 w-4" aria-hidden="true" />
              What the server stores
            </h2>
            <p className="text-sm leading-relaxed text-ink/80">
              Unless this deployment's operator has configured otherwise, each
              browser's session gets its own SQLite file on the server, keyed by
              that opaque session ID — your script draft, snapshots, characters,
              research notes, and any simulation state, and nothing from any other
              visitor's session. There is no server-side backup of this by
              default; a session your operator's server-side cleanup has not
              touched can sit indefinitely, but an <em>orphaned</em> file (not
              currently open, per this server's own retention window) is deleted
              automatically after a week of inactivity.
            </p>
          </div>
        </section>

        <section aria-labelledby="privacy-network-heading" className="sm-panel">
          <div className="sm-panel-body flex flex-col gap-3">
            <h2 id="privacy-network-heading" className="sm-h flex items-center gap-2">
              <Wifi className="h-4 w-4" aria-hidden="true" />
              What leaves this deployment
            </h2>
            <p className="text-sm leading-relaxed text-ink/80">
              Nothing — by default. Script Doctor, coverage export, What-If Lab,
              Writers' Room, and interview receipts are all deterministic and run
              entirely on this server; none of them call out anywhere. Generative
              features (world-building, simulation dialogue, AI rewrites) are
              off unless this deployment has an AI provider key configured, and
              even then every call is made server-side — your script text never
              ships from the browser straight to a third party.
            </p>
            <p className="text-xs font-mono uppercase tracking-wide text-ink/50">
              {llmReady === null
                ? "Checking this deployment's AI configuration…"
                : llmReady
                  ? "This deployment: AI features are configured and available."
                  : "This deployment: keyless — no AI provider is configured."}
            </p>
          </div>
        </section>

        <section aria-labelledby="privacy-delete-heading" className="sm-panel">
          <div className="sm-panel-body flex flex-col gap-3">
            <h2 id="privacy-delete-heading" className="sm-h flex items-center gap-2">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Deleting it
            </h2>
            <p className="text-sm leading-relaxed text-ink/80">
              Inside the editor, open <strong>Settings</strong> (the gear icon) →{" "}
              <strong>Session</strong> tab → <strong>Delete Everything</strong>.
              After you confirm, it deletes your draft and every other local
              preference from this browser's localStorage and IndexedDB, and asks
              this server to permanently delete this session's saved data —
              evicting it from memory and, on a persistent deployment, removing
              its SQLite file from disk. Not a soft reset. It does not touch
              files you already exported to your computer, and it cannot recover
              anything once it runs.
            </p>
          </div>
        </section>

        <footer className="pt-4">
          <p className="sm-slug">Story Machine — local-first by default</p>
        </footer>
      </div>
    </div>
  );
}
