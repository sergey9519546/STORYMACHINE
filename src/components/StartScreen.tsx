import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Settings, FileText, X, ChevronRight, ChevronLeft, Cpu, Upload, FilePlus2 } from "lucide-react";
import { StoryConfig } from "../types";
import { EXPLAINERS } from "./startscreen/explainers.config";
import { ExplainerCard } from "./startscreen/ExplainerCard";
import { StoryConfigForm, UploadedFile } from "./startscreen/StoryConfigForm";
import { SlugLineIntro, usePrefersReducedMotion } from "./startscreen/SlugLineIntro";
import {
  appendUploadedFiles,
  filterUploadableFiles,
  readUploadedFiles,
} from "../lib/uploaded-files";

interface StartScreenProps {
  onStart: (config: StoryConfig) => void;
  isGenerating: boolean;
  onOpenStoryMachine?: () => void;
}

// A minimal default config for the two "skip the wizard entirely" entry
// points below (open editor directly / open a script file). Intentionally
// duplicated rather than imported from App.tsx's DEFAULT_STORY_CONFIG: App
// lazy-imports StartScreen, so a reverse static import here would form an
// import cycle; this object is tiny and has no behavior to drift out of sync.
const DEFAULT_STORY_CONFIG: StoryConfig = {
  theme: "Untitled Story",
  backstory: "",
  format: "film",
  structure: "save_the_cat",
  directorStyle: "fincher",
  emotionalArc: "man_in_a_hole",
};

// Journey-audit finding D/C: "open a script file" support. Only .fountain/.txt
// can be dropped straight into the editor as Fountain source; .fdx is Final
// Draft XML and this app has no client-side .fdx→Fountain converter (src/lib/
// fdx.ts only exports the reverse direction, Fountain→FDX — the only .fdx
// *import* conversion lives server-side, in ScriptDoctorPanel's upload flow).
const OPEN_FILE_EXTS = /\.(fountain|txt|fdx)$/i;
const MAX_OPEN_FILE_SIZE = 5 * 1024 * 1024; // 5 MB — generous for a feature-length script

// Motion grammar: one easing, two durations, sitewide (brief's "Reading
// Room" spec). These mirror index.css's --ease-out-expo / --dur-micro /
// --dur-reveal token values exactly — kept as JS constants because Framer
// Motion's `transition` prop needs numbers/arrays, not CSS custom
// properties. CSS-only hover transitions below reference the tokens
// directly via arbitrary values (e.g. `ease-[var(--ease-out-expo)]`).
const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];
const DUR_MICRO = 0.2; // var(--dur-micro), seconds
const DUR_REVEAL = 0.7; // var(--dur-reveal), seconds

const MICRO_TRANSITION = "duration-[var(--dur-micro)] ease-[var(--ease-out-expo)]";
const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-stamp focus-visible:outline-offset-4";

export default function StartScreen({
  onStart,
  isGenerating,
  onOpenStoryMachine,
}: StartScreenProps) {
  const [theme, setTheme] = useState("");
  const [backstory, setBackstory] = useState("");
  const [format, setFormat] = useState<StoryConfig["format"]>("film");
  const [structure, setStructure] = useState<StoryConfig["structure"]>("save_the_cat");
  const [directorStyle, setDirectorStyle] = useState<StoryConfig["directorStyle"]>("fincher");
  const [emotionalArc, setEmotionalArc] = useState<StoryConfig["emotionalArc"]>("man_in_a_hole");
  const [step, setStep] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // "Open a script file" (finding D): a second, always-available entry point
  // — now on the entrance itself — that goes straight into the editor,
  // distinct from the "Ingested Files" uploads inside the wizard, which only
  // ever become hidden AI context.
  const [openFileError, setOpenFileError] = useState<string | null>(null);
  const openFileInputRef = useRef<HTMLInputElement>(null);

  // The restructure: entrance (script-first front door) vs. the original
  // 5-step wizard, now a deliberate secondary path reached via "Start a new
  // story from scratch". Nothing about the wizard's own step machinery
  // changes — this just gates whether it's mounted.
  const [view, setView] = useState<"entrance" | "wizard">("entrance");

  // Second half of the signature move: the slug line "resolves into the
  // tool" — the primary actions fade/lift in only once typing completes.
  // Reduced-motion users get isIntroResolved=true from first paint (see
  // usePrefersReducedMotion / SlugLineIntro's own instant-render branch), so
  // this reveal never animates for them — main renders already-visible.
  const reducedMotion = usePrefersReducedMotion();
  const [isIntroResolved, setIsIntroResolved] = useState(reducedMotion);
  React.useEffect(() => {
    // If the OS setting flips mid-visit, don't leave the primary actions
    // stuck invisible waiting on an animation that will no longer run.
    if (reducedMotion) setIsIntroResolved(true);
  }, [reducedMotion]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // H3: Read dropped files (batch, functional update — same path as StoryConfigForm upload).
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = filterUploadableFiles(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;
    void readUploadedFiles(droppedFiles).then((batch) => {
      if (batch.length === 0) return;
      setUploadedFiles((prev) => appendUploadedFiles(prev, batch));
    });
  };

  // Opens an uploaded script file straight into ScriptIDE, skipping the
  // wizard. .fountain/.txt content becomes the editor's initial draft by
  // writing the exact localStorage key ScriptIDE's lsGet("script_draft")
  // reads on mount (see ScriptIDE.tsx). .fdx has no client-side converter, so
  // it's handed off via sessionStorage for ScriptIDE to surface as a toast
  // pointing at Script Doctor's server-side conversion instead of silently
  // dumping raw Final Draft XML into the Fountain editor.
  const handleOpenScriptFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (openFileInputRef.current) openFileInputRef.current.value = "";
    if (!file) return;
    setOpenFileError(null);

    if (!OPEN_FILE_EXTS.test(file.name)) {
      setOpenFileError(`"${file.name}" isn't a .fountain, .txt, or .fdx file.`);
      return;
    }
    if (file.size === 0) {
      setOpenFileError(`"${file.name}" is empty — there's nothing to open.`);
      return;
    }
    if (file.size > MAX_OPEN_FILE_SIZE) {
      setOpenFileError(`"${file.name}" is over the 5 MB limit for a single script.`);
      return;
    }

    const isFdx = /\.fdx$/i.test(file.name);
    const reader = new FileReader();
    reader.onerror = () => {
      setOpenFileError(`Couldn't read "${file.name}" — try re-saving it and uploading again.`);
    };
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== "string" || text.trim() === "") {
        setOpenFileError(`"${file.name}" is empty — there's nothing to open.`);
        return;
      }
      try {
        if (isFdx) {
          sessionStorage.setItem("sm_fdx_import_pending", file.name);
        } else {
          localStorage.setItem("script_draft", text);
        }
      } catch {
        setOpenFileError(`Couldn't open "${file.name}" — your browser is blocking local storage (private mode?).`);
        return;
      }
      onStart(DEFAULT_STORY_CONFIG);
    };
    reader.readAsText(file);
  };

  const handleStart = () => {
    const combinedBackstory = [
      backstory ? `--- MANUAL CONTEXT ---\n${backstory}` : "",
      ...uploadedFiles.map(f => `--- ${f.category.toUpperCase()} DOCUMENT: ${f.name} ---\n${f.content}`)
    ].filter(Boolean).join("\n\n");

    onStart({
      theme: theme || "A psychological thriller about betrayal",
      backstory: combinedBackstory,
      format,
      structure,
      directorStyle,
      emotionalArc,
    });
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 5));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleSample = () => {
    // One-click sample: hand off to ScriptIDE via the same sessionStorage
    // idiom as the .fdx pending flag. The IDE opens Script Doctor and
    // triggers its existing "Try a sample script" flow, so provenance stays
    // "sample" end to end (draft history is never polluted — see
    // ScriptDoctorPanel's isSampleRun).
    try { sessionStorage.setItem("sm_sample_pending", "1"); } catch { /* still opens the editor */ }
    onStart(DEFAULT_STORY_CONFIG);
  };

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-paper text-ink font-sans">
      <div className="film-grain" aria-hidden="true" />

      <AnimatePresence mode="wait">
        {view === "entrance" ? (
          <motion.div
            key="entrance"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR_MICRO, ease: EASE_OUT_EXPO }}
            className="relative z-10 w-full"
          >
            {/* ── Hero: wordmark + bring a script (primary task) ── */}
            <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-14 px-6 py-14 sm:gap-16 sm:px-10 sm:py-20">
              <header className="flex flex-col gap-6 sm:gap-8">
                <p className="hidden font-mono text-[11px] uppercase tracking-[0.4em] text-ink/50 sm:block">
                  Coverage Report — Reader&rsquo;s Copy
                </p>
                <h1
                  className="font-display uppercase leading-[0.82] text-ink"
                  style={{ fontSize: "clamp(3.25rem, 12vw, 9.5rem)" }}
                >
                  Story Machine
                </h1>
                <SlugLineIntro onComplete={() => setIsIntroResolved(true)} />
              </header>

              <motion.main
                initial={{ opacity: 0, y: 12 }}
                animate={isIntroResolved ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                transition={{ duration: DUR_REVEAL, ease: EASE_OUT_EXPO }}
                className="flex flex-col gap-10 sm:gap-12"
                inert={!isIntroResolved || undefined}
              >
                <section aria-labelledby="entrance-actions-heading" className="flex flex-col gap-4 sm:gap-5">
                  <h2
                    id="entrance-actions-heading"
                    className="font-mono text-xs uppercase tracking-[0.3em] text-ink/50"
                  >
                    Bring A Script
                  </h2>

                  <button
                    type="button"
                    onClick={handleSample}
                    disabled={isGenerating}
                    className={`group relative flex min-h-[44px] flex-col gap-2 border border-ink bg-ink px-7 py-7 text-left text-paper transition-transform ${MICRO_TRANSITION} hover:-translate-y-[2px] disabled:pointer-events-none disabled:opacity-40 sm:px-9 sm:py-8 ${FOCUS_RING}`}
                  >
                    <span className="absolute -top-3 -right-3 rotate-[6deg] border border-stamp bg-paper px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.25em] text-stamp">
                      Reader&rsquo;s Pick
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-paper/60">
                      Fastest way in
                    </span>
                    <span className="flex items-center gap-3 font-display text-2xl uppercase tracking-wide sm:text-3xl">
                      <Sparkles className="h-6 w-6 shrink-0" aria-hidden="true" />
                      Try The Sample Script
                    </span>
                    <span className="max-w-[52ch] font-sans text-sm text-paper/70">
                      See a full coverage read on a script that&rsquo;s already loaded — no setup required.
                    </span>
                  </button>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                    <button
                      type="button"
                      onClick={() => onStart(DEFAULT_STORY_CONFIG)}
                      disabled={isGenerating}
                      className={`flex min-h-[44px] items-center justify-center gap-3 border border-ink bg-transparent px-6 py-5 font-mono text-sm uppercase tracking-[0.15em] text-ink transition-colors ${MICRO_TRANSITION} hover:bg-ink hover:text-paper disabled:pointer-events-none disabled:opacity-40 ${FOCUS_RING}`}
                    >
                      <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                      I Have A Script — Open The Editor
                    </button>
                    <button
                      type="button"
                      onClick={() => openFileInputRef.current?.click()}
                      disabled={isGenerating}
                      className={`flex min-h-[44px] items-center justify-center gap-3 border border-ink bg-transparent px-6 py-5 font-mono text-sm uppercase tracking-[0.15em] text-ink transition-colors ${MICRO_TRANSITION} hover:bg-ink hover:text-paper disabled:pointer-events-none disabled:opacity-40 ${FOCUS_RING}`}
                    >
                      <Upload className="h-4 w-4 shrink-0" aria-hidden="true" />
                      Open A Script File
                    </button>
                    <input
                      type="file"
                      accept=".fountain,.txt,.fdx"
                      ref={openFileInputRef}
                      onChange={handleOpenScriptFile}
                      className="hidden"
                      aria-label="Open a script file"
                    />
                  </div>

                  {openFileError && (
                    <div className="flex items-center justify-between gap-3 border border-stamp bg-paper px-4 py-3 font-mono text-xs text-ink">
                      <span>{openFileError}</span>
                      <button
                        type="button"
                        onClick={() => setOpenFileError(null)}
                        aria-label="Dismiss error"
                        className={`min-h-[44px] min-w-[44px] font-bold leading-none text-ink transition-colors ${MICRO_TRANSITION} hover:text-stamp ${FOCUS_RING}`}
                      >
                        <X className="mx-auto h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </section>

                <div className="flex flex-col items-start gap-4 pt-1 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setView("wizard")}
                    disabled={isGenerating}
                    className={`group inline-flex min-h-[44px] items-center gap-2 py-2 font-mono text-sm uppercase tracking-[0.2em] text-ink/70 underline decoration-ink/30 underline-offset-4 transition-colors ${MICRO_TRANSITION} hover:text-stamp hover:decoration-stamp disabled:pointer-events-none disabled:opacity-40 ${FOCUS_RING}`}
                  >
                    <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                    Start a new story from scratch
                    <ChevronRight
                      className={`h-4 w-4 transition-transform ${MICRO_TRANSITION} group-hover:translate-x-1`}
                      aria-hidden="true"
                    />
                  </button>
                  <a
                    href="#how-it-works"
                    className={`inline-flex min-h-[44px] items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-ink/50 transition-colors ${MICRO_TRANSITION} hover:text-ink ${FOCUS_RING}`}
                  >
                    How the desk works
                    <ChevronRight className="h-3.5 w-3.5 rotate-90" aria-hidden="true" />
                  </a>
                </div>
              </motion.main>
            </div>

            {/* ── Scroll depth: product story (supporting → explore layers) ── */}
            <div className="border-t border-ink/15 bg-paper-edge/40">
              <div className="mx-auto flex w-full max-w-5xl flex-col gap-20 px-6 py-16 sm:gap-24 sm:px-10 sm:py-24">

                {/* Desk map */}
                <section id="how-it-works" aria-labelledby="desk-heading" className="scroll-mt-10">
                  <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-ink/45">
                    The reading room
                  </p>
                  <h2
                    id="desk-heading"
                    className="mt-3 font-display text-4xl uppercase leading-none text-ink sm:text-5xl"
                  >
                    One desk. Three jobs.
                  </h2>
                  <p className="mt-4 max-w-[54ch] text-base leading-relaxed text-ink/70">
                    Bring a script. Get coverage. Ship or simulate. The page stays center —
                    tools come to the page, not the other way around.
                  </p>

                  <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
                    {[
                      {
                        slug: "01 · Write",
                        title: "Script desk",
                        body: "Fountain on paper. Scenes and cast in the rail. Live notes only when you ask.",
                      },
                      {
                        slug: "02 · Coverage",
                        title: "Script Doctor",
                        body: "Deterministic passes. A verdict, a score, ranked issues — jump straight to the line.",
                      },
                      {
                        slug: "03 · Ship",
                        title: "Export · Simulate",
                        body: "PDF, FDX, snapshots — or seed OASIS and watch characters act under pressure.",
                      },
                    ].map((card) => (
                      <article
                        key={card.slug}
                        className="flex flex-col gap-3 border border-ink/20 bg-paper p-5 sm:p-6"
                      >
                        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-stamp">
                          {card.slug}
                        </p>
                        <h3 className="font-display text-2xl uppercase leading-none text-ink">
                          {card.title}
                        </h3>
                        <p className="text-sm leading-relaxed text-ink/65">{card.body}</p>
                      </article>
                    ))}
                  </div>
                </section>

                {/* Coverage detail */}
                <section aria-labelledby="coverage-heading" className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
                  <div className="lg:col-span-5">
                    <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-ink/45">
                      Coverage
                    </p>
                    <h2
                      id="coverage-heading"
                      className="mt-3 font-display text-3xl uppercase leading-none text-ink sm:text-4xl"
                    >
                      A studio read you can inspect
                    </h2>
                    <p className="mt-4 max-w-[42ch] text-sm leading-relaxed text-ink/70">
                      No black-box score. Every note traces to a pass, a scene, a line.
                      Re-run and the result stays reproducible.
                    </p>
                  </div>
                  <div className="border border-ink bg-paper p-6 lg:col-span-7 sm:p-8">
                    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/15 pb-5">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink/45">
                          Verdict
                        </p>
                        <p
                          className="mt-2 inline-block rotate-[-4deg] border-2 border-stamp px-3 py-1 font-mono text-sm font-bold uppercase tracking-[0.2em] text-stamp"
                        >
                          Consider
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink/45">
                          Health
                        </p>
                        <p className="font-display text-5xl leading-none text-ink">76</p>
                      </div>
                    </div>
                    <ul className="mt-5 space-y-3 font-mono text-[12px] uppercase tracking-wider text-ink/75">
                      <li className="flex justify-between gap-4 border-b border-ink/10 pb-2">
                        <span>Top issue</span>
                        <span className="text-stamp">Climax engagement</span>
                      </li>
                      <li className="flex justify-between gap-4 border-b border-ink/10 pb-2">
                        <span>Critical · Major · Minor</span>
                        <span>3 · 38 · 159</span>
                      </li>
                      <li className="flex justify-between gap-4">
                        <span>LLM in the verdict path</span>
                        <span>None</span>
                      </li>
                    </ul>
                  </div>
                </section>

                {/* OASIS / Story Machine */}
                <section aria-labelledby="oasis-heading" className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                  <div className="border border-ink bg-ink p-6 text-paper sm:p-8 lg:col-span-7">
                    <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-paper/50">
                      OASIS
                    </p>
                    <h2
                      id="oasis-heading"
                      className="mt-3 font-display text-3xl uppercase leading-none sm:text-4xl"
                    >
                      Story Machine simulation
                    </h2>
                    <p className="mt-4 max-w-[48ch] text-sm leading-relaxed text-paper/70">
                      Perspective-bounded characters. Beliefs, pressure, and choices that
                      leave a ledger you can export back to the script desk.
                    </p>
                    <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {[
                        { t: "Stage", d: "Locations, adjacency, who is present" },
                        { t: "Agents", d: "Masks, motives, suspicion, emotion" },
                        { t: "Ledger", d: "Every action timestamped and typed" },
                        { t: "Export", d: "Fountain back into the editor" },
                      ].map((item) => (
                        <div key={item.t} className="border border-paper/20 p-4">
                          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-stamp">
                            {item.t}
                          </p>
                          <p className="mt-2 text-sm text-paper/75">{item.d}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenStoryMachine?.()}
                      className={`mt-8 inline-flex min-h-[44px] items-center gap-2 border border-paper bg-paper px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-ink transition-colors ${MICRO_TRANSITION} hover:bg-stamp hover:border-stamp hover:text-paper ${FOCUS_RING}`}
                    >
                      <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
                      Open OASIS Story Machine
                    </button>
                  </div>

                  <div className="flex flex-col justify-between gap-6 border border-ink/20 bg-paper p-6 sm:p-8 lg:col-span-5">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-ink/45">
                        Continuity
                      </p>
                      <h3 className="mt-3 font-display text-2xl uppercase leading-none text-ink">
                        Same artifact. Different light.
                      </h3>
                      <p className="mt-4 text-sm leading-relaxed text-ink/70">
                        Draft in the desk. Diagnose in Coverage. Simulate in OASIS.
                        Export returns to the same page — selection and draft preserved.
                      </p>
                    </div>
                    <ol className="space-y-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/80">
                      <li className="flex gap-3 border-b border-ink/10 pb-2">
                        <span className="text-stamp">1</span> Bring or write a script
                      </li>
                      <li className="flex gap-3 border-b border-ink/10 pb-2">
                        <span className="text-stamp">2</span> Run coverage · pick a fix
                      </li>
                      <li className="flex gap-3 border-b border-ink/10 pb-2">
                        <span className="text-stamp">3</span> Simulate if you need pressure
                      </li>
                      <li className="flex gap-3">
                        <span className="text-stamp">4</span> Ship PDF · FDX · snapshot
                      </li>
                    </ol>
                  </div>
                </section>

                {/* Rules / trust */}
                <section
                  aria-labelledby="rules-heading"
                  className="border border-ink/15 bg-paper px-6 py-8 sm:px-10 sm:py-10"
                >
                  <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-ink/45">
                        Machine truth
                      </p>
                      <h2
                        id="rules-heading"
                        className="mt-2 font-display text-3xl uppercase leading-none text-ink sm:text-4xl"
                      >
                        3,216 rules. Keyless-first.
                      </h2>
                      <p className="mt-3 max-w-[50ch] text-sm leading-relaxed text-ink/65">
                        Analysis and coverage run without an AI key. Generation stays optional —
                        copilot, rewrites, and simulation turns wait until you configure one.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {["Deterministic", "Inspectable", "Reproducible"].map((chip) => (
                        <span
                          key={chip}
                          className="border border-ink/30 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/70"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Closing CTA */}
                <section className="flex flex-col items-start gap-6 border-t border-ink/15 pt-12 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-display text-3xl uppercase leading-none text-ink">
                      Ready for the page
                    </h2>
                    <p className="mt-2 max-w-[40ch] text-sm text-ink/65">
                      Start with a sample, open your draft, or step into simulation.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleSample}
                      disabled={isGenerating}
                      className={`min-h-[44px] border border-ink bg-ink px-5 py-3 font-mono text-xs uppercase tracking-[0.2em] text-paper transition-colors ${MICRO_TRANSITION} hover:bg-stamp hover:border-stamp disabled:opacity-40 ${FOCUS_RING}`}
                    >
                      Try sample
                    </button>
                    <button
                      type="button"
                      onClick={() => onStart(DEFAULT_STORY_CONFIG)}
                      disabled={isGenerating}
                      className={`min-h-[44px] border border-ink px-5 py-3 font-mono text-xs uppercase tracking-[0.2em] text-ink transition-colors ${MICRO_TRANSITION} hover:bg-ink hover:text-paper disabled:opacity-40 ${FOCUS_RING}`}
                    >
                      Open editor
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenStoryMachine?.()}
                      className={`min-h-[44px] border border-ink/40 px-5 py-3 font-mono text-xs uppercase tracking-[0.2em] text-ink/80 transition-colors ${MICRO_TRANSITION} hover:border-ink hover:text-ink ${FOCUS_RING}`}
                    >
                      Open OASIS
                    </button>
                  </div>
                </section>
              </div>
            </div>

            <footer className="border-t border-ink/15 py-8 text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50">
                Story Machine · coverage desk · OASIS simulation
              </p>
            </footer>
          </motion.div>
        ) : (
          <motion.div
            key="wizard"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: DUR_REVEAL, ease: EASE_OUT_EXPO }}
            className="relative z-10 mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-12 sm:px-10 sm:py-16"
          >
            <div className="flex flex-col gap-6 border-b border-ink/15 pb-8">
              <button
                type="button"
                onClick={() => setView("entrance")}
                disabled={isGenerating}
                className={`inline-flex w-fit min-h-[44px] items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-ink/60 transition-colors ${MICRO_TRANSITION} hover:text-stamp disabled:pointer-events-none disabled:opacity-40 ${FOCUS_RING}`}
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Back to entrance
              </button>
              <div className="flex items-end justify-between gap-6">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.3em] text-ink/50">
                    New Story — Configuration
                  </p>
                  <h2 className="mt-2 font-display text-3xl uppercase leading-none text-ink sm:text-4xl">
                    Step {step} of 5
                  </h2>
                </div>
                <div className="flex gap-2" role="list" aria-label="Wizard progress">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={i}
                      role="listitem"
                      aria-current={i === step ? "step" : undefined}
                      className={`h-2 w-8 border transition-colors duration-[var(--dur-micro)] sm:w-10 ${
                        i <= step ? "border-stamp bg-stamp" : "border-ink/40 bg-transparent"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex min-h-[500px] flex-1 flex-col border border-ink/15 bg-paper-edge/40 p-6 sm:p-10">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: DUR_MICRO, ease: EASE_OUT_EXPO }}
                    className="flex-1"
                  >
                    <StoryConfigForm
                      theme={theme}
                      onThemeChange={setTheme}
                      backstory={backstory}
                      onBackstoryChange={setBackstory}
                      uploadedFiles={uploadedFiles}
                      onUploadedFilesChange={setUploadedFiles}
                      onPreviewFile={setPreviewFile}
                      isGenerating={isGenerating}
                      isDragging={isDragging}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    />
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: DUR_MICRO, ease: EASE_OUT_EXPO }}
                    className="flex-1"
                  >
                    <ExplainerCard
                      title="Format"
                      icon={Settings}
                      options={EXPLAINERS.format}
                      selectedValue={format}
                      onSelect={(val) => setFormat(val as StoryConfig["format"])}
                    />
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: DUR_MICRO, ease: EASE_OUT_EXPO }}
                    className="flex-1"
                  >
                    <ExplainerCard
                      title="Structure"
                      icon={Settings}
                      options={EXPLAINERS.structure}
                      selectedValue={structure}
                      onSelect={(val) => setStructure(val as StoryConfig["structure"])}
                    />
                  </motion.div>
                )}

                {step === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: DUR_MICRO, ease: EASE_OUT_EXPO }}
                    className="flex-1"
                  >
                    <ExplainerCard
                      title="Director Style"
                      icon={Settings}
                      options={EXPLAINERS.directorStyle}
                      selectedValue={directorStyle}
                      onSelect={(val) => setDirectorStyle(val as StoryConfig["directorStyle"])}
                    />
                  </motion.div>
                )}

                {step === 5 && (
                  <motion.div
                    key="step5"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: DUR_MICRO, ease: EASE_OUT_EXPO }}
                    className="flex-1"
                  >
                    <ExplainerCard
                      title="Emotional Arc"
                      icon={Settings}
                      options={EXPLAINERS.emotionalArc}
                      selectedValue={emotionalArc}
                      onSelect={(val) => setEmotionalArc(val as StoryConfig["emotionalArc"])}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-12 flex items-center justify-between border-t border-ink/15 pt-8">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={isGenerating}
                    className={`flex min-h-[44px] items-center gap-2 border border-ink px-6 py-4 font-mono text-sm uppercase tracking-[0.15em] text-ink transition-colors ${MICRO_TRANSITION} hover:bg-ink hover:text-paper disabled:pointer-events-none disabled:opacity-40 ${FOCUS_RING}`}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    Back
                  </button>
                ) : (
                  <div />
                )}

                {step < 5 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={isGenerating || (step === 1 && !theme)}
                    className={`flex min-h-[44px] items-center gap-2 border border-ink bg-ink px-8 py-4 font-mono text-sm uppercase tracking-[0.15em] text-paper transition-colors ${MICRO_TRANSITION} hover:bg-stamp hover:border-stamp disabled:pointer-events-none disabled:opacity-40 ${FOCUS_RING}`}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStart}
                    disabled={isGenerating}
                    className={`flex min-h-[44px] items-center gap-2 border border-stamp bg-stamp px-8 py-4 font-mono text-sm uppercase tracking-[0.15em] text-paper transition-colors ${MICRO_TRANSITION} hover:bg-ink hover:border-ink disabled:pointer-events-none disabled:opacity-40 ${FOCUS_RING}`}
                  >
                    {isGenerating ? (
                      <>
                        <Sparkles className="h-5 w-5 animate-spin" aria-hidden="true" />
                        Initializing...
                      </>
                    ) : (
                      <>
                        Begin Sequence
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR_MICRO, ease: EASE_OUT_EXPO }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/80 p-6"
            onClick={() => setPreviewFile(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: DUR_MICRO, ease: EASE_OUT_EXPO }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[80vh] w-full max-w-3xl flex-col border border-ink bg-paper"
            >
              <div className="flex items-center justify-between gap-4 border-b border-ink/15 bg-paper-edge px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="h-4 w-4 shrink-0 text-stamp" aria-hidden="true" />
                  <h3 className="max-w-[300px] truncate font-mono text-sm uppercase tracking-[0.15em] text-ink">
                    {previewFile.name}
                  </h3>
                  <span className="shrink-0 border border-ink/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-ink/70">
                    {previewFile.category}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  aria-label="Close preview"
                  className={`flex min-h-[44px] min-w-[44px] items-center justify-center text-ink transition-colors ${MICRO_TRANSITION} hover:text-stamp ${FOCUS_RING}`}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto whitespace-pre-wrap p-6 font-mono text-sm text-ink/80">
                {previewFile.content}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
