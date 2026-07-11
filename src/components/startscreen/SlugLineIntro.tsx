import { useEffect, useRef, useState } from "react";

// The signature move (see StartScreen.tsx header comment for the full brief):
// a screenplay slug line types on in Courier, cursor blinking, then resolves
// into the tool. Exactly one animated entrance on this screen — everything
// else is a static reveal keyed off this component's completion.
const SLUG_LINES = [
  "FADE IN:",
  "INT. STORY MACHINE — DAY",
  "The page, read the way a studio reader reads it.",
] as const;

const FULL_TEXT = SLUG_LINES.join("\n");
// Fast, one pass, ~1.2s total budget end to end (brief's cap) — not a loop,
// not a gimmick.
const TYPE_BUDGET_MS = 1200;

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    // Safari < 14 only has the deprecated addListener; both are wired for
    // broad support.
    if (mq.addEventListener) mq.addEventListener("change", handleChange);
    else mq.addListener(handleChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handleChange);
      else mq.removeListener(handleChange);
    };
  }, []);

  return reduced;
}

interface SlugLineIntroProps {
  /** Fires once, the instant the reveal is visually complete (typed-out or
   *  reduced-motion's instant render), so the screen below can key its
   *  resolve-into-the-tool reveal off a single source of truth. */
  onComplete?: () => void;
}

export function SlugLineIntro({ onComplete }: SlugLineIntroProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [typedLength, setTypedLength] = useState(reducedMotion ? FULL_TEXT.length : 0);
  const [isDone, setIsDone] = useState(reducedMotion);
  const firedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    // a11y: prefers-reduced-motion renders the final slug line instantly,
    // no typing pass at all.
    if (reducedMotion) {
      setTypedLength(FULL_TEXT.length);
      setIsDone(true);
      if (!firedRef.current) {
        firedRef.current = true;
        onCompleteRef.current?.();
      }
      return;
    }

    firedRef.current = false;
    setTypedLength(0);
    setIsDone(false);
    const perCharMs = TYPE_BUDGET_MS / FULL_TEXT.length;
    let charIndex = 0;
    const id = window.setInterval(() => {
      charIndex += 1;
      setTypedLength(charIndex);
      if (charIndex >= FULL_TEXT.length) {
        window.clearInterval(id);
        setIsDone(true);
        if (!firedRef.current) {
          firedRef.current = true;
          onCompleteRef.current?.();
        }
      }
    }, perCharMs);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  const typedText = FULL_TEXT.slice(0, typedLength);
  const lines = typedText.split("\n");
  const lastLineIndex = lines.length - 1;

  const lineClass = (idx: number) => {
    if (idx === 0) {
      return "text-xs sm:text-sm uppercase tracking-[0.35em] text-ink/55";
    }
    if (idx === 1) {
      return "mt-2 text-sm sm:text-base uppercase tracking-[0.2em] text-ink/80";
    }
    return "mt-4 text-base sm:text-lg leading-snug text-ink max-w-[42ch]";
  };

  return (
    // data-slug-done: hook for the manual browser check (and any future
    // test) to await the reveal finishing without racing a fixed timeout.
    <div className="font-courier" data-slug-done={isDone}>
      {/* Decorative: the character-by-character reveal is presentational
          and shouldn't be announced mid-type. */}
      <div aria-hidden="true">
        {lines.map((line, idx) => (
          <p key={idx} className={lineClass(idx)}>
            {line}
            {idx === lastLineIndex && (
              <span className="ml-1 inline-block h-[1em] w-[0.5em] translate-y-[0.15em] bg-ink align-middle animate-blink" />
            )}
          </p>
        ))}
      </div>
      {/* Accessible copy: present immediately regardless of animation
          progress, read once as ordinary text. */}
      <p className="sr-only">{SLUG_LINES.join(". ")}</p>
    </div>
  );
}
