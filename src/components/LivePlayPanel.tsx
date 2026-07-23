// LivePlayPanel — Author-Presence Live Story Interface (Wave 33).
// Provides:
//   • Running scene feed (committed beats from GET /api/nvm/live/feed)
//   • Move textbox with author-verb picker (STEER / INJECT / OVERRULE)
//   • Submit author move to POST /api/nvm/live/move
//   • Visual feedback: last move result, tier-1 gate status

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type AuthorVerb = 'STEER' | 'INJECT' | 'OVERRULE';

interface CommitFeedEntry {
  commitId: string;
  parentId: string | null;
  sceneIdx: number;
  createdAt: number;
  opSummary: string;
  deltaSummary: { facts: number; beliefs: number; relationships: number };
}

interface FeedData {
  commits: CommitFeedEntry[];
  totalCommits: number;
}

interface MoveResult {
  verb: AuthorVerb;
  summary: string;
  commitId: string | null;
  tier1Pass: boolean;
  ambiguous: boolean;
  ops?: unknown[];
}

interface Props { onClose: () => void; }

// ── Verb descriptors ──────────────────────────────────────────────────────────

const VERB_INFO: Record<AuthorVerb, { label: string; color: string; hint: string; example: string }> = {
  STEER: {
    label: 'STEER',
    color: '#7c3aed',
    hint: 'Bias a character toward a behaviour.',
    example: 'Steer Alice toward confronting Bob about the money',
  },
  INJECT: {
    label: 'INJECT',
    color: '#0369a1',
    hint: 'Add a fact, clue, or pressure into the world.',
    example: 'Inject clue: a torn envelope under the desk',
  },
  OVERRULE: {
    label: 'OVERRULE',
    color: '#b45309',
    hint: 'Revert the last committed scene.',
    example: 'Overrule — that scene didn\'t work',
  },
};

// ── Panel ─────────────────────────────────────────────────────────────────────

export function LivePlayPanel({ onClose }: Props) {
  const [feed, setFeed]           = useState<FeedData | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [verb, setVerb]           = useState<AuthorVerb>('INJECT');
  const [moveText, setMoveText]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<MoveResult | null>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);

  const loadFeed = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/nvm/live/feed');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Server error');
      setFeed(await res.json());
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  // Auto-scroll feed to bottom when commits arrive
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [feed?.totalCommits]);

  const submitMove = useCallback(async () => {
    if (!moveText.trim() || submitting) return;
    setSubmitting(true);
    setLastResult(null);
    try {
      // Prefix with verb if not already present (let the server parse it)
      const fullText = /^\s*(steer|inject|overrule|undo|revert)\b/i.test(moveText)
        ? moveText
        : `${verb} ${moveText}`;
      const res = await fetch('/api/nvm/live/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullText }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Server error');
      const result: MoveResult = await res.json();
      setLastResult(result);
      setMoveText('');
      await loadFeed(); // Refresh feed
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSubmitting(false); }
  }, [moveText, verb, submitting, loadFeed]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitMove();
  };

  const advanceWorld = useCallback(async (beats: number) => {
    setSubmitting(true); setError(null);
    try {
      const res = await fetch('/api/nvm/live/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beats }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Server error');
      await loadFeed();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSubmitting(false); }
  }, [submitting, loadFeed]);

  const commits = feed?.commits ?? [];

  return (
    <div style={{
      background: 'var(--sm-night)', color: 'var(--sm-cream)', borderRadius: 8,
      border: '1px solid var(--sm-night-line)', width: 860, maxWidth: '98vw',
      maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--sm-font-mono)', fontSize: 13,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '13px 18px', borderBottom: '1px solid var(--sm-night-line)', flexShrink: 0,
      }}>
        <div>
          <strong style={{ fontSize: 15 }}>Author Presence</strong>
          <div style={{ color: 'var(--sm-ink-mute)', fontSize: 11, marginTop: 2 }}>
            Live story control · STEER · INJECT · OVERRULE
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadFeed} style={chipBtn('var(--sm-night-2)')}>↺</button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--sm-cream-mute)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--sm-stamp)', background: 'var(--sm-night-2)', padding: 10, margin: '8px 14px', borderRadius: 5, fontSize: 11 }}>
          {error}
        </div>
      )}

      {/* Two-column layout: feed left, controls right */}
      <div style={{ flex: 1, overflowY: 'hidden', display: 'flex', gap: 0 }}>

        {/* Scene feed */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 14, borderRight: '1px solid var(--sm-night-2)' }}>
          <div style={{ color: '#475569', fontSize: 10, marginBottom: 8 }}>
            SCENE LEDGER — {commits.length} beat{commits.length !== 1 ? 's' : ''} committed
          </div>
          {loading && <div style={{ color: 'var(--sm-ink-mute)', textAlign: 'center', padding: 20 }}>Loading…</div>}
          {!loading && commits.length === 0 && (
            <div style={{ color: 'var(--sm-night-line)', textAlign: 'center', padding: 30, fontSize: 11 }}>
              No scenes committed yet.<br />
              Use the controls to inject your first beat.
            </div>
          )}
          {commits.map((c, i) => (
            <CommitRow key={c.commitId} commit={c} index={i} />
          ))}
          <div ref={feedEndRef} />
        </div>

        {/* Author controls */}
        <div style={{ width: 310, flexShrink: 0, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Verb picker */}
          <div>
            <div style={{ color: '#475569', fontSize: 10, marginBottom: 6 }}>AUTHOR VERB</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['STEER', 'INJECT', 'OVERRULE'] as AuthorVerb[]).map(v => (
                <button
                  key={v}
                  onClick={() => setVerb(v)}
                  style={{
                    flex: 1, padding: '5px 0', borderRadius: 5, cursor: 'pointer',
                    fontSize: 10, fontFamily: 'var(--sm-font-mono)', fontWeight: 700,
                    border: `1px solid ${verb === v ? VERB_INFO[v].color : 'var(--sm-night-line)'}`,
                    background: verb === v ? VERB_INFO[v].color + '22' : 'var(--sm-night-2)',
                    color: verb === v ? VERB_INFO[v].color : 'var(--sm-ink-mute)',
                    transition: 'all 0.1s',
                  }}
                >{v}</button>
              ))}
            </div>
            <div style={{ color: '#475569', fontSize: 10, marginTop: 5 }}>
              {VERB_INFO[verb].hint}
            </div>
          </div>

          {/* Move textbox */}
          <div>
            <div style={{ color: '#475569', fontSize: 10, marginBottom: 6 }}>MOVE TEXT</div>
            <textarea
              value={moveText}
              onChange={e => setMoveText(e.target.value)}
              onKeyDown={handleKey}
              placeholder={VERB_INFO[verb].example}
              rows={4}
              style={{
                width: '100%', background: 'var(--sm-night-2)', border: '1px solid var(--sm-night-line)',
                borderRadius: 5, color: 'var(--sm-cream)', fontFamily: 'var(--sm-font-mono)',
                fontSize: 11, padding: '7px 9px', resize: 'vertical',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
            <div style={{ color: 'var(--sm-night-line)', fontSize: 9, marginTop: 3 }}>
              Ctrl+Enter to submit · prefix optional (STEER / INJECT / OVERRULE)
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={submitMove}
            disabled={submitting || !moveText.trim()}
            style={{
              background: submitting ? 'var(--sm-night-2)' : VERB_INFO[verb].color,
              border: 'none', borderRadius: 5, color: '#fff',
              padding: '8px 0', cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--sm-font-mono)', fontWeight: 700, fontSize: 12,
              opacity: moveText.trim() ? 1 : 0.5,
              transition: 'background 0.15s',
            }}
          >
            {submitting ? 'Committing…' : `▶ ${verb}`}
          </button>

          {/* Advance World (reactive beats) */}
          <div>
            <div style={{ color: '#475569', fontSize: 10, marginBottom: 6 }}>ADVANCE WORLD</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 2, 3].map(n => (
                <button
                  key={n}
                  onClick={() => advanceWorld(n)}
                  disabled={submitting}
                  style={{
                    flex: 1, padding: '5px 0', borderRadius: 5, cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: 10, fontFamily: 'var(--sm-font-mono)',
                    border: '1px solid var(--sm-night-line)', background: 'var(--sm-night-2)', color: 'var(--sm-ink-mute)',
                  }}
                >{n} beat{n !== 1 ? 's' : ''}</button>
              ))}
            </div>
            <div style={{ color: 'var(--sm-night-line)', fontSize: 9, marginTop: 3 }}>
              NPC reactions fire from current world state
            </div>
          </div>

          {/* Last result */}
          {lastResult && <MoveResultCard result={lastResult} />}

          {/* Commit stats */}
          {feed && feed.totalCommits > 0 && (
            <div style={{ background: 'var(--sm-night-2)', borderRadius: 5, padding: '8px 10px' }}>
              <div style={{ color: 'var(--sm-ink-mute)', fontSize: 9, marginBottom: 4 }}>LEDGER STATS</div>
              <div style={{ color: 'var(--sm-cream-mute)', fontSize: 11 }}>
                {feed.totalCommits} commits
              </div>
              <div style={{ color: '#475569', fontSize: 10, marginTop: 3 }}>
                {commits.reduce((s, c) => s + c.deltaSummary.beliefs, 0)} beliefs &nbsp;·&nbsp;
                {commits.reduce((s, c) => s + c.deltaSummary.facts, 0)} facts
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function CommitRow({ commit: c, index }: { commit: CommitFeedEntry; index: number }) {
  const age = Date.now() - c.createdAt;
  const ageStr = age < 60_000 ? `${Math.round(age / 1000)}s ago`
    : age < 3_600_000 ? `${Math.round(age / 60_000)}m ago`
    : `${Math.round(age / 3_600_000)}h ago`;

  return (
    <div style={{
      background: 'var(--sm-night-2)', borderRadius: 4, padding: '6px 9px',
      marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ color: 'var(--sm-night-line)', fontSize: 9, width: 18, flexShrink: 0 }}>
        {index + 1}
      </span>
      <span style={{ color: '#475569', fontSize: 9, width: 55, flexShrink: 0 }}>
        scene {c.sceneIdx}
      </span>
      <span style={{ color: 'var(--sm-cream-mute)', fontSize: 10, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {c.opSummary}
      </span>
      <span style={{ color: 'var(--sm-night-line)', fontSize: 9, flexShrink: 0 }}>{ageStr}</span>
    </div>
  );
}

function MoveResultCard({ result }: { result: MoveResult }) {
  const color = !result.tier1Pass ? 'var(--sm-stamp)' : result.ambiguous ? 'var(--sm-warn)' : 'var(--sm-ok)';
  const status = !result.tier1Pass ? 'PROOF REJECTED' : result.ambiguous ? 'AMBIGUOUS' : 'COMMITTED';

  return (
    <div style={{
      background: 'var(--sm-night-2)', border: `1px solid ${color}22`,
      borderRadius: 5, padding: '8px 10px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: 'var(--sm-ink-mute)', fontSize: 9 }}>LAST MOVE</span>
        <span style={{ color, fontSize: 9, fontWeight: 700 }}>{status}</span>
      </div>
      <div style={{ color: 'var(--sm-cream-mute)', fontSize: 10 }}>{result.summary}</div>
      {result.commitId && (
        <div style={{ color: 'var(--sm-night-line)', fontSize: 9, marginTop: 4 }}>
          id: {result.commitId.slice(0, 8)}…
        </div>
      )}
    </div>
  );
}

function chipBtn(bg: string): React.CSSProperties {
  return {
    background: bg, border: '1px solid var(--sm-night-line)', borderRadius: 4,
    color: 'var(--sm-cream)', padding: '3px 8px', cursor: 'pointer',
    fontFamily: 'var(--sm-font-mono)', fontSize: 11,
  };
}
