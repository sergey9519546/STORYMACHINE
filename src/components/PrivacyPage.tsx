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
//
// RE-VERIFIED 2026-09-04 against the stores that appeared after E4 was
// written: the ScriptIDE_State title_page_json column, per-snapshot
// health/verdict/sceneCount/analyzedAt, the automatic reset-backup copies
// under data/backups/session-resets/, the in-memory collaboration registry
// and its Y.Doc, and the doctor's in-process report cache. Two sentences on
// this page were false before that pass and are now true of the code rather
// than of the intention: the reset backups survived "Delete Everything" for
// their whole retention window, and a collaboration room minted by the
// session stayed joinable (with the draft still in the server's memory) for
// its whole 24h TTL. Every claim below is asserted by
// tests/routes/session-delete-memory-stores.test.ts,
// tests/core/session-delete-reset-backups.test.ts,
// tests/collab/room-purge.test.ts,
// tests/routes/no-writer-content-in-logs.test.ts, and section 4 of
// scripts/verify-e4-local-safety-net.mjs (a live browser run that byte-
// searches every store for a marker string after the delete).
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
              Each snapshot also carries the score it had when you took it —
              health, verdict, scene count, and when it was analyzed — so the
              editor can show your score moving across revisions. That is a
              number about your draft, kept in the same two browser stores as
              the draft itself and deleted with it.
            </p>
            <p className="text-sm leading-relaxed text-ink/80">
              A handful of small preferences also live in localStorage: theme,
              whether Live Notes / auto-analysis / typewriter sound are on, the
              Labs flag, which screen you were last on, and this browser's
              session ID (the opaque identifier that ties it to its server-side
              session below — not a login, not personally identifying on its
              own).
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
              that opaque session ID — your script draft, title page, snapshots,
              characters, research notes, and any simulation state, and nothing
              from any other visitor's session. A session your operator's
              server-side cleanup has not touched can sit indefinitely, but an{" "}
              <em>orphaned</em> file (not currently open, per this server's own
              retention window) is deleted automatically after a week of
              inactivity.
            </p>
            <p className="text-sm leading-relaxed text-ink/80">
              One thing does get copied automatically: if you use{" "}
              <strong>Reset simulation</strong>, the server first takes a
              verified snapshot of your whole session to a recovery folder, so a
              reset you did not mean can be undone. Those copies are capped (five
              per session, a week each) and Delete Everything removes them along
              with the live file. Nothing else is backed up unless your operator
              runs the backup script themselves — those copies live outside this
              app and only they can remove them.
            </p>
            <p className="text-sm leading-relaxed text-ink/80">
              If you open a <strong>share link</strong>, the server also holds
              the shared copy of that document in memory for as long as the room
              lives (a day at most, sooner if the server restarts). Anyone with
              the link can read and write it — that is what the link is for — and
              Delete Everything closes the rooms you created and drops their
              copies.
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
            <p className="text-sm leading-relaxed text-ink/80">
              The coverage letter is the same story: your script is posted to
              this server, analyzed here, and the letter comes back. Nor does
              your script end up in this server's own logs. The request log
              records the method, path and status of a request — not its body,
              and not the query string — and no route logs your script text,
              your title, or a character's name. A test asserts that by running
              the whole surface with a marker string and failing if it ever
              appears in the process output.
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
            <p className="text-sm leading-relaxed text-ink/80">
              On the server that same click also removes the reset-recovery
              copies described above, closes and drops any share-link rooms this
              session created, and clears the analysis this server had cached in
              memory for your script. The page then reloads without the share
              link, so it does not rejoin a room you just deleted.
            </p>
            <p className="text-sm leading-relaxed text-ink/80">
              What it cannot reach, stated plainly: files you exported yourself;
              copies a collaborator you shared a link with has already taken;
              and, if your operator ran the backup script by hand, the archive
              they made — that lives outside this app, and only they can delete
              it.
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
