import React, { useRef, useState } from "react";
import { ShieldCheck, ShieldX, Upload, X, ChevronLeft } from "lucide-react";
import { trackEvent } from "../lib/analytics";

// P3 — "Verify this report" surface (ROADMAP §3 P3 exit gate: a third party
// can open a shared report and INDEPENDENTLY verify the score). This is the
// in-app counterpart to the verify block in every exported coverage report
// (server/lib/coverage-html.ts's buildFooterSection): a manager, contest
// reader, or peer holding the original script text pastes it here with the
// numbers the report claims, and the server recomputes the hash and re-runs
// the deterministic analysis — proof the export wasn't hand-edited.
//
// Reached via the #verify hash route (App.tsx) and the "Verify a report"
// link on the start screen. Deliberately outside the Labs gate: the verify
// flow is part of the product's trust story, not a research panel.

interface VerifyMismatch {
  field: string;
  expected: unknown;
  actual: unknown;
}

interface VerifyResponse {
  verified: boolean;
  checked?: string[];
  mismatches?: VerifyMismatch[];
  recomputed?: {
    contentHash: string;
    health?: number;
    verdict?: string;
    totalIssues?: number;
    healthPercentile?: number;
  };
  error?: string;
  message?: string;
}

const HASH_RE = /^[0-9a-f]{64}$/;
const MAX_SCRIPT_SIZE = 5 * 1024 * 1024; // matches StartScreen's open-file cap

const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-stamp focus-visible:outline-offset-4";

export default function VerifyReport() {
  const [scriptText, setScriptText] = useState("");
  const [scriptName, setScriptName] = useState<string | null>(null);
  const [contentHash, setContentHash] = useState("");
  const [health, setHealth] = useState("");
  const [verdict, setVerdict] = useState("");
  const [totalIssues, setTotalIssues] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;
    setFileError(null);
    if (!/\.(fountain|txt)$/i.test(file.name)) {
      setFileError(`"${file.name}" isn't a .fountain or .txt file. Verification needs the original script text.`);
      return;
    }
    if (file.size > MAX_SCRIPT_SIZE) {
      setFileError(`"${file.name}" is over the 5 MB limit for a single script.`);
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setFileError(`Couldn't read "${file.name}" — try again.`);
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== "string" || text.trim() === "") {
        setFileError(`"${file.name}" is empty — there's nothing to verify.`);
        return;
      }
      setScriptText(text);
      setScriptName(file.name);
    };
    reader.readAsText(file);
  };

  const handleVerify = () => {
    setFormError(null);
    setResult(null);

    if (scriptText.trim() === "") {
      setFormError("Paste the original script text (or load it from a file) — verification re-runs the analysis on the text itself.");
      return;
    }
    if (!HASH_RE.test(contentHash.trim())) {
      setFormError("The expected script-text hash must be the full 64-character lowercase hex SHA-256 printed in the report's verify block.");
      return;
    }

    const expected: Record<string, unknown> = { contentHash: contentHash.trim() };
    if (health.trim() !== "") {
      const parsed = Number(health);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
        setFormError("Health must be a number between 0 and 100, exactly as printed in the report.");
        return;
      }
      expected.health = parsed;
    }
    if (verdict !== "") expected.verdict = verdict;
    if (totalIssues.trim() !== "") {
      const parsed = Number(totalIssues);
      if (!Number.isInteger(parsed) || parsed < 0) {
        setFormError("Total issues must be a whole number, exactly as printed in the report.");
        return;
      }
      expected.totalIssues = parsed;
    }

    setBusy(true);
    fetch("/api/export/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fountain: scriptText, expected }),
    })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as VerifyResponse | null;
        if (!res.ok) {
          throw new Error(body?.message ?? body?.error ?? `Verification failed (${res.status})`);
        }
        if (!body) throw new Error("Verification returned an unreadable response.");
        setResult(body);
        trackEvent("verify_run", { verified: body.verified });
      })
      .catch((err: unknown) => {
        setFormError(err instanceof Error ? err.message : "Verification failed");
      })
      .finally(() => setBusy(false));
  };

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
            Independent verification
          </p>
          <h1 className="font-display text-4xl uppercase leading-none text-ink sm:text-5xl">
            Verify a report
          </h1>
          <p className="max-w-[62ch] text-[15px] leading-relaxed text-ink/75">
            Every Story Machine coverage report carries a verify block with a full
            script-text hash and the numbers it claims. Paste the{" "}
            <em>original script text</em> and those numbers below — the engine
            re-runs the deterministic analysis and every value must match, proving
            the report wasn&rsquo;t hand-edited.
          </p>
        </header>

        <section aria-labelledby="verify-script-heading" className="sm-panel">
          <div className="sm-panel-body flex flex-col gap-4">
            <div className="flex items-end justify-between gap-4">
              <h2 id="verify-script-heading" className="sm-h">
                1 · Original script text
              </h2>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`sm-btn flex items-center gap-2 px-4 py-2 ${FOCUS_RING}`}
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                Load .fountain / .txt
              </button>
              <input
                type="file"
                accept=".fountain,.txt"
                ref={fileInputRef}
                onChange={handleFile}
                className="hidden"
                aria-label="Load a script file"
              />
            </div>
            {scriptName && (
              <p className="sm-slug">
                Loaded: {scriptName} ({scriptText.length.toLocaleString()} characters)
              </p>
            )}
            <textarea
              value={scriptText}
              onChange={(e) => { setScriptText(e.target.value); setScriptName(null); }}
              rows={10}
              spellCheck={false}
              placeholder={"INT. WAREHOUSE - NIGHT\n\nRain hammers the tin roof…"}
              aria-label="Original script text"
              className={`w-full resize-y border border-ink/25 bg-paper p-4 font-mono text-sm leading-relaxed text-ink placeholder:text-ink/30 ${FOCUS_RING}`}
            />
            {fileError && (
              <div className="sm-card border-[var(--sm-stamp)]" role="alert">
                <div className="flex items-center justify-between gap-3">
                  <span className="sm-slug">{fileError}</span>
                  <button
                    type="button"
                    onClick={() => setFileError(null)}
                    aria-label="Dismiss error"
                    className={`min-h-[44px] min-w-[44px] leading-none transition-colors hover:text-[var(--sm-stamp)] ${FOCUS_RING}`}
                  >
                    <X className="mx-auto h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="verify-claims-heading" className="sm-panel">
          <div className="sm-panel-body flex flex-col gap-4">
            <h2 id="verify-claims-heading" className="sm-h">
              2 · What the report claims
            </h2>
            <label className="flex flex-col gap-2">
              <span className="sm-slug">Script-text hash (SHA-256, full 64 characters) — required</span>
              <input
                type="text"
                value={contentHash}
                onChange={(e) => setContentHash(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                placeholder="e19e6cc2…"
                className={`w-full border border-ink/25 bg-paper px-4 py-3 font-mono text-sm text-ink placeholder:text-ink/30 ${FOCUS_RING}`}
              />
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-2">
                <span className="sm-slug">Health (optional)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={health}
                  onChange={(e) => setHealth(e.target.value)}
                  autoComplete="off"
                  placeholder="72.5"
                  className={`w-full border border-ink/25 bg-paper px-4 py-3 font-mono text-sm text-ink placeholder:text-ink/30 ${FOCUS_RING}`}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="sm-slug">Verdict (optional)</span>
                <select
                  value={verdict}
                  onChange={(e) => setVerdict(e.target.value)}
                  className={`w-full border border-ink/25 bg-paper px-4 py-3 font-mono text-sm text-ink ${FOCUS_RING}`}
                >
                  <option value="">— not checked —</option>
                  <option value="RECOMMEND">RECOMMEND</option>
                  <option value="CONSIDER">CONSIDER</option>
                  <option value="PASS">PASS</option>
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="sm-slug">Total issues (optional)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={totalIssues}
                  onChange={(e) => setTotalIssues(e.target.value)}
                  autoComplete="off"
                  placeholder="38"
                  className={`w-full border border-ink/25 bg-paper px-4 py-3 font-mono text-sm text-ink placeholder:text-ink/30 ${FOCUS_RING}`}
                />
              </label>
            </div>
          </div>
        </section>

        <div className="flex flex-col items-start gap-4">
          <button
            type="button"
            onClick={handleVerify}
            disabled={busy}
            aria-busy={busy}
            className={`sm-btn sm-btn--stamp px-8 py-4 ${FOCUS_RING} ${busy ? "cursor-wait opacity-50" : ""}`}
          >
            {busy ? "Re-running analysis…" : "Verify"}
          </button>
          {formError && (
            <div className="sm-card border-[var(--sm-stamp)] w-full" role="alert">
              <span className="sm-slug">{formError}</span>
            </div>
          )}
        </div>

        {result && (
          <section
            aria-live="polite"
            className={`sm-panel ${result.verified ? "" : "border-[var(--sm-stamp)]"}`}
          >
            <div className="sm-panel-body flex flex-col gap-4">
              <div className="flex items-center gap-3">
                {result.verified ? (
                  <>
                    <ShieldCheck className="h-6 w-6 text-green-700" aria-hidden="true" />
                    <p className="font-display text-2xl uppercase text-ink">Verified</p>
                  </>
                ) : (
                  <>
                    <ShieldX className="h-6 w-6 text-[var(--sm-stamp)]" aria-hidden="true" />
                    <p className="font-display text-2xl uppercase text-ink">Does not match</p>
                  </>
                )}
              </div>
              <p className="text-[15px] leading-relaxed text-ink/75">
                {result.verified
                  ? `The engine re-ran the analysis on the submitted text and every checked value matched (${(result.checked ?? []).join(", ")}). This report is authentic engine output for this script.`
                  : "At least one checked value does not match what the engine produces for the submitted text. Either the text isn't the text the report was generated from, or the report's numbers were altered."}
              </p>
              {result.mismatches && result.mismatches.length > 0 && (
                <table className="w-full border-collapse font-mono text-sm">
                  <thead>
                    <tr className="border-b border-ink/25 text-left">
                      <th className="py-2 pr-4 font-bold">Field</th>
                      <th className="py-2 pr-4 font-bold">Report claims</th>
                      <th className="py-2 font-bold">Engine recomputes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.mismatches.map((m) => (
                      <tr key={m.field} className="border-b border-ink/10">
                        <td className="py-2 pr-4">{m.field}</td>
                        <td className="py-2 pr-4 text-[var(--sm-stamp)]">{String(m.expected)}</td>
                        <td className="py-2">{String(m.actual)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {result.recomputed && (
                <p className="sm-slug">
                  Recomputed hash: {result.recomputed.contentHash.slice(0, 12)}…
                  {result.recomputed.health !== undefined && ` · health ${result.recomputed.health}`}
                  {result.recomputed.verdict && ` · ${result.recomputed.verdict}`}
                </p>
              )}
            </div>
          </section>
        )}

        <footer className="border-t border-[var(--sm-hair)] pt-6 text-center">
          <p className="sm-slug">Story Machine — deterministic analysis, independently verifiable</p>
        </footer>
      </div>
    </div>
  );
}
