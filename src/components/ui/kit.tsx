// Story Machine UI kit — the moodboard's primitives (public/redesign.html)
// as composable React components. One visual system: paper · ink · stamp.
// Tokens come from index.css @theme (bg-paper, text-ink, border-stamp, …).
import React from 'react';
import { clsx } from 'clsx';

// ── Panel ────────────────────────────────────────────────────────────────
// The framed surface everything lives in: hard ink border, offset shadow,
// title bar (ptop) with mono slug + right-aligned meta.

export function Panel({
  title,
  icon,
  meta,
  night = false,
  className,
  bodyClassName,
  children,
}: {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  meta?: React.ReactNode;
  night?: boolean;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={clsx(
        'bg-panel border-[1.5px] border-ink shadow-[6px_6px_0_rgba(33,29,21,.15)] relative',
        className,
      )}
    >
      {title != null && (
        <header
          className={clsx(
            'flex items-center gap-2 px-3 py-[9px] border-b-[1.5px] border-ink',
            night ? 'bg-night text-cream' : 'bg-bar',
          )}
        >
          {icon}
          <span className="font-mono font-bold text-[10px] tracking-[.12em] uppercase">
            {title}
          </span>
          {meta != null && (
            <span
              className={clsx(
                'ml-auto font-mono font-semibold text-[8px] tracking-[.1em] uppercase',
                night ? 'text-cream/60' : 'text-faint',
              )}
            >
              {meta}
            </span>
          )}
        </header>
      )}
      <div className={clsx('p-4 flex flex-col gap-[11px]', bodyClassName)}>{children}</div>
    </section>
  );
}

// ── Btn ──────────────────────────────────────────────────────────────────
// Mono, uppercase, hard border. default: panel → ink on hover.
// ink: filled ink → stamp on hover. stamp: filled stamp.

type BtnVariant = 'default' | 'ink' | 'stamp';

export function Btn({
  variant = 'default',
  className,
  type = 'button',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return (
    <button
      type={type}
      className={clsx(
        'inline-flex items-center justify-center gap-[7px] px-3.5 py-[9px]',
        'border-[1.5px] font-mono font-bold text-[9.5px] tracking-[.09em] uppercase',
        'cursor-pointer transition-colors duration-200 whitespace-nowrap',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-stamp focus-visible:outline-offset-2',
        'disabled:opacity-40 disabled:pointer-events-none',
        variant === 'default' && 'border-ink bg-panel text-ink hover:bg-ink hover:text-cream',
        variant === 'ink' && 'border-ink bg-ink text-cream hover:bg-stamp hover:border-stamp',
        variant === 'stamp' && 'border-stamp bg-stamp text-white hover:bg-stampdk',
        className,
      )}
      {...rest}
    />
  );
}

// ── Chip ─────────────────────────────────────────────────────────────────
// Tiny bordered tag. Variants map to the semantic palette.

type ChipVariant = 'default' | 'stamp' | 'ok' | 'warn' | 'cool';

const CHIP_VARIANT: Record<ChipVariant, string> = {
  default: 'border-ink text-ink',
  stamp: 'border-stamp text-stamp',
  ok: 'border-ok text-ok',
  warn: 'border-warn text-warn',
  cool: 'border-cool text-cool',
};

export function Chip({
  variant = 'default',
  className,
  children,
}: {
  variant?: ChipVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-[5px] px-[7px] py-[3px] bg-panel',
        'border-[1.2px] font-mono font-bold text-[8px] tracking-[.09em] uppercase',
        CHIP_VARIANT[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ── Stamp ────────────────────────────────────────────────────────────────
// The rotated verdict stamp. Reads once, loudly.

export function Stamp({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={clsx(
        'inline-block px-3.5 py-1.5 -rotate-[5deg]',
        'border-[2.5px] border-stamp text-stamp',
        'font-mono font-bold text-[15px] tracking-[.13em] uppercase',
        className,
      )}
    >
      {children}
    </span>
  );
}

// ── Bar ──────────────────────────────────────────────────────────────────
// Ink-fill progress bar. `pct` 0–100; fill defaults to ink.

export function Bar({
  pct,
  fill = 'ink',
  className,
  label,
}: {
  pct: number;
  fill?: 'ink' | 'stamp' | 'ok' | 'warn';
  className?: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <span
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={clsx('block h-[9px] bg-linefill relative overflow-hidden', className)}
    >
      <i
        className={clsx(
          'absolute top-0 bottom-0 left-0 block',
          fill === 'ink' && 'bg-ink',
          fill === 'stamp' && 'bg-stamp',
          fill === 'ok' && 'bg-ok',
          fill === 'warn' && 'bg-warn',
        )}
        style={{ width: `${clamped}%` }}
      />
    </span>
  );
}

// ── HandNote ─────────────────────────────────────────────────────────────
// The Caveat margin-hand annotation — the reader's pencil in the margin.

export function HandNote({
  ink = false,
  className,
  children,
}: {
  ink?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={clsx(
        'font-hand font-semibold text-lg leading-[1.05]',
        ink ? 'text-mute' : 'text-stamp',
        className,
      )}
    >
      {children}
    </span>
  );
}

// ── Stat ─────────────────────────────────────────────────────────────────
// The big mono number (health 74, tension 57, 96%).

export function Stat({
  className,
  children,
  sub,
}: {
  className?: string;
  children: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <span className={clsx('font-mono font-bold text-[40px] leading-[.9]', className)}>
      {children}
      {sub != null && <span className="text-[15px] text-faint">{sub}</span>}
    </span>
  );
}

// ── SectionH / Sub ───────────────────────────────────────────────────────
// The tiny tracked-out mono section label and its body-face caption.

export function SectionH({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h3
      className={clsx(
        'font-mono font-bold text-[9px] tracking-[.16em] uppercase text-faint',
        className,
      )}
    >
      {children}
    </h3>
  );
}

export function Sub({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <p className={clsx('font-sans font-medium text-[10px] text-faint m-0', className)}>{children}</p>;
}

// ── Card ─────────────────────────────────────────────────────────────────
// Inset option card on kraft paper; `sel` gets the ink border + stamp spine.

export function Card({
  sel = false,
  spine = false,
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { sel?: boolean; spine?: boolean }) {
  return (
    <div
      className={clsx(
        'border-[1.5px] bg-panel2 p-[11px]',
        sel
          ? 'border-ink bg-[#f7f2e6] shadow-[-3px_0_0_var(--color-stamp)]'
          : 'border-hair',
        spine && !sel && 'border-l-[3px] border-l-stamp',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

// ── Live ─────────────────────────────────────────────────────────────────
// The pulsing "LIVE · deterministic" indicator.

export function Live({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-[7px] font-mono font-semibold text-[9px] tracking-[.15em] uppercase text-stamp',
        className,
      )}
    >
      <i className="w-[7px] h-[7px] rounded-full bg-stamp animate-[sm-pulse_1.6s_ease-in-out_infinite]" />
      {children}
    </span>
  );
}
