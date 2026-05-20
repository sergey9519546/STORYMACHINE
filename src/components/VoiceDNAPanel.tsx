// VoiceDNAPanel — Voice DNA Analyzer (Wave 31).
// Fetches GET /api/nvm/voice-dna and shows:
//   - Character similarity matrix (heatmap): how acoustically similar are pairs?
//   - Per-character voice fingerprint: signature words, dominant emotion, vocab size
//   - Acoustic twins alert: pairs whose voice overlap exceeds the threshold
//   - Global voice diversity score

import React, { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CharFingerprint {
  charId: string;
  vocabSize: number;
  signatureWords: string[];
  dominantEmotion: string;
  emotionRange: number;
  beliefCount: number;
}

interface SimPair {
  a: string;
  b: string;
  similarity: number;
  sharedWords: string[];
}

interface VoiceDNAData {
  characters: string[];
  fingerprints: CharFingerprint[];
  pairs: SimPair[];
  acousticTwins: SimPair[];
  diversityScore: number;   // 0-100: 100 = fully distinct voices
  totalBeliefOps: number;
  totalScenes: number;
}

interface Props { onClose: () => void; }

// ── Config ────────────────────────────────────────────────────────────────────

const EMOTION_COLOR: Record<string, string> = {
  fear: '#f87171', distress: '#fb923c', anger: '#ef4444',
  joy: '#4ade80', pride: '#a78bfa', shame: '#64748b', none: '#334155',
};

// Heat-map colour: 0 = green (distinct), 1 = red (identical)
function simColor(sim: number): string {
  if (sim <= 0) return '#064e3b';      // distinct — emerald
  if (sim < 0.15) return '#065f46';
  if (sim < 0.25) return '#fbbf24';   // moderate overlap — amber
  if (sim < 0.35) return '#f97316';   // warning — orange
  return '#ef4444';                    // acoustic twins — red
}

function simBg(sim: number): string {
  return simColor(sim) + '33';
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function VoiceDNAPanel({ onClose }: Props) {
  const [data, setData]           = useState<VoiceDNAData | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [selected, setSelected]   = useState<string | null>(null);
  const [tab, setTab]             = useState<'matrix' | 'fingerprints' | 'twins'>('matrix');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/nvm/voice-dna');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Server error');
      setData(await res.json());
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fp = data?.fingerprints ?? [];
  const chars = data?.characters ?? [];

  // Lookup helper: similarity for a pair
  function simFor(a: string, b: string): number {
    if (a === b) return 1;
    const pair = data?.pairs.find(p => (p.a === a && p.b === b) || (p.a === b && p.b === a));
    return pair?.similarity ?? 0;
  }

  const selectedFP = fp.find(f => f.charId === selected) ?? null;

  return (
    <div style={{
      background: '#0f172a', color: '#e2e8f0', borderRadius: 8,
      border: '1px solid #334155', width: 860, maxWidth: '98vw',
      maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      fontFamily: 'monospace', fontSize: 13,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 18px', borderBottom: '1px solid #334155', flexShrink: 0 }}>
        <div>
          <strong style={{ fontSize: 15 }}>Voice DNA Analyzer</strong>
          <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
            Stylometric fingerprints · pairwise voice similarity · acoustic twins
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {data && <DiversityGauge score={data.diversityScore} />}
          <button onClick={load} style={chipBtn('#1e293b')}>↺</button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
      </div>

      {loading && <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Analyzing voice DNA…</div>}
      {error && <div style={{ color: '#f87171', background: '#1e293b', padding: 12, margin: 12, borderRadius: 5 }}>{error}</div>}

      {data && data.totalBeliefOps === 0 && (
        <div style={{ color: '#475569', textAlign: 'center', padding: 40 }}>
          No UPDATE_BELIEF ops in committed scenes. Characters need beliefs to have voices.
        </div>
      )}

      {data && data.totalBeliefOps > 0 && (
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Left: character list */}
          <div style={{ width: 170, flexShrink: 0, borderRight: '1px solid #334155', overflowY: 'auto', padding: 10 }}>
            <div style={{ color: '#64748b', fontSize: 10, marginBottom: 6 }}>
              {chars.length} CHARACTER{chars.length !== 1 ? 'S' : ''} · {data.totalBeliefOps} BELIEFS
            </div>
            {fp.map(f => {
              const sel = f.charId === selected;
              return (
                <div key={f.charId} onClick={() => setSelected(sel ? null : f.charId)} style={{
                  background: sel ? '#1e2d4a' : '#1e293b',
                  border: `1px solid ${sel ? '#3b82f6' : '#334155'}`,
                  borderRadius: 5, padding: '7px 9px', marginBottom: 4, cursor: 'pointer',
                }}>
                  <div style={{ color: sel ? '#60a5fa' : '#e2e8f0', fontWeight: 700, fontSize: 12 }}>{f.charId}</div>
                  <div style={{ display: 'flex', gap: 5, marginTop: 2 }}>
                    <span style={{ color: '#64748b', fontSize: 9 }}>{f.vocabSize}w</span>
                    <span style={{ color: EMOTION_COLOR[f.dominantEmotion] ?? '#64748b', fontSize: 9 }}>{f.dominantEmotion}</span>
                  </div>
                  {f.signatureWords.length > 0 && (
                    <div style={{ color: '#475569', fontSize: 8, marginTop: 3, lineHeight: 1.4 }}>
                      sig: {f.signatureWords.slice(0, 3).join(', ')}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Acoustic twins badge */}
            {data.acousticTwins.length > 0 && (
              <div style={{ marginTop: 10, background: '#450a0a', border: '1px solid #ef4444', borderRadius: 5, padding: '6px 8px' }}>
                <div style={{ color: '#f87171', fontSize: 10, fontWeight: 700 }}>
                  ⚠ {data.acousticTwins.length} TWIN{data.acousticTwins.length !== 1 ? 'S' : ''}
                </div>
                <div style={{ color: '#94a3b8', fontSize: 9, marginTop: 2 }}>Voice overlap {'>'} 35%</div>
              </div>
            )}
          </div>

          {/* Right: tabs */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 1, padding: '8px 14px', borderBottom: '1px solid #334155', flexShrink: 0 }}>
              {(['matrix', 'fingerprints', 'twins'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  background: tab === t ? '#1e293b' : 'transparent',
                  border: `1px solid ${tab === t ? '#334155' : 'transparent'}`,
                  color: tab === t ? '#e2e8f0' : '#64748b',
                  borderRadius: 4, padding: '3px 10px', cursor: 'pointer',
                  fontFamily: 'monospace', fontSize: 10, fontWeight: tab === t ? 700 : 400,
                  textTransform: 'capitalize',
                }}>{t === 'twins' ? `Acoustic Twins (${data.acousticTwins.length})` : t}</button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
              {tab === 'matrix' && (
                <MatrixView chars={chars} simFor={simFor} selected={selected} onSelect={setSelected} />
              )}
              {tab === 'fingerprints' && (
                <FingerprintsView fingerprints={fp} selected={selected} />
              )}
              {tab === 'twins' && (
                <TwinsView pairs={data.pairs} twins={data.acousticTwins} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Matrix view ───────────────────────────────────────────────────────────────

function MatrixView({ chars, simFor, selected, onSelect }: {
  chars: string[]; simFor: (a: string, b: string) => number;
  selected: string | null; onSelect: (id: string | null) => void;
}) {
  if (chars.length === 0) return <div style={{ color: '#475569', textAlign: 'center', padding: 40 }}>No characters with beliefs.</div>;
  if (chars.length === 1) return <div style={{ color: '#475569', textAlign: 'center', padding: 40 }}>Only 1 character — need 2+ for similarity matrix.</div>;

  const cellSize = Math.min(72, Math.floor(580 / (chars.length + 1)));
  return (
    <div>
      <div style={{ color: '#64748b', fontSize: 10, marginBottom: 10 }}>
        VOICE SIMILARITY MATRIX — green=distinct · red=same voice · diagonal=self
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: 10 }}>
          <thead>
            <tr>
              <td style={{ width: cellSize, padding: 2 }} />
              {chars.map(c => (
                <td key={c} style={{ width: cellSize, padding: 2, color: selected === c ? '#60a5fa' : '#64748b', textAlign: 'center', fontSize: 9, fontWeight: selected === c ? 700 : 400 }}>
                  {c.slice(0, 6)}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {chars.map(row => (
              <tr key={row}>
                <td onClick={() => onSelect(selected === row ? null : row)}
                  style={{ color: selected === row ? '#60a5fa' : '#64748b', padding: '2px 6px', cursor: 'pointer', fontSize: 9, fontWeight: selected === row ? 700 : 400, whiteSpace: 'nowrap' }}>
                  {row.slice(0, 8)}
                </td>
                {chars.map(col => {
                  const sim = simFor(row, col);
                  const isSelf = row === col;
                  const isHighlighted = selected === row || selected === col;
                  return (
                    <td key={col} title={isSelf ? row : `${row}↔${col}: ${(sim * 100).toFixed(0)}%`}
                      style={{
                        width: cellSize, height: cellSize,
                        background: isSelf ? '#1e293b' : simBg(sim),
                        border: `1px solid ${isHighlighted && !isSelf ? '#3b82f6' : '#1e293b'}`,
                        textAlign: 'center', verticalAlign: 'middle',
                        cursor: isSelf ? 'default' : 'pointer',
                        fontSize: 9,
                        color: isSelf ? '#334155' : simColor(sim),
                        fontWeight: sim >= 0.35 ? 700 : 400,
                      }}>
                      {isSelf ? '—' : `${(sim * 100).toFixed(0)}%`}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
        {[
          { label: '0–15% distinct', color: '#064e3b' },
          { label: '15–25% overlap', color: '#fbbf24' },
          { label: '25–35% similar', color: '#f97316' },
          { label: '35%+ acoustic twin', color: '#ef4444' },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 14, height: 14, background: color + '33', border: `1px solid ${color}`, borderRadius: 2 }} />
            <span style={{ color: '#64748b', fontSize: 9 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Fingerprints view ─────────────────────────────────────────────────────────

function FingerprintsView({ fingerprints, selected }: { fingerprints: CharFingerprint[]; selected: string | null }) {
  const list = selected ? fingerprints.filter(f => f.charId === selected) : fingerprints;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {list.length === 0 && <div style={{ color: '#475569', textAlign: 'center', padding: 30 }}>Select a character in the left panel.</div>}
      {list.map(f => (
        <div key={f.charId} style={{ background: '#1e293b', borderRadius: 6, padding: '10px 14px', borderLeft: `3px solid ${EMOTION_COLOR[f.dominantEmotion] ?? '#64748b'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 13 }}>{f.charId}</span>
            <span style={{ color: '#64748b', fontSize: 10 }}>{f.vocabSize} unique words · {f.beliefCount} belief ops</span>
            <span style={{ color: EMOTION_COLOR[f.dominantEmotion] ?? '#64748b', fontSize: 10 }}>
              {f.dominantEmotion} ({f.emotionRange} emotions)
            </span>
          </div>
          {f.signatureWords.length > 0 ? (
            <div>
              <div style={{ color: '#64748b', fontSize: 9, marginBottom: 5 }}>SIGNATURE WORDS (unique to this character)</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {f.signatureWords.map(w => (
                  <span key={w} style={{ background: '#312e81', color: '#a5b4fc', borderRadius: 3, padding: '1px 6px', fontSize: 10 }}>{w}</span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: '#475569', fontSize: 10 }}>No signature words — all vocabulary is shared with other characters. Voice is undifferentiated.</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Twins view ────────────────────────────────────────────────────────────────

function TwinsView({ pairs, twins }: { pairs: SimPair[]; twins: SimPair[] }) {
  if (twins.length === 0) {
    return (
      <div>
        <div style={{ color: '#4ade80', background: '#052e16', border: '1px solid #16a34a', borderRadius: 6, padding: '12px 16px', marginBottom: 16 }}>
          ✓ No acoustic twins detected — all character voices are sufficiently distinct (similarity {'<'} 35%).
        </div>
        <div style={{ color: '#64748b', fontSize: 10, marginBottom: 8 }}>ALL PAIRS BY SIMILARITY</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {pairs.map(p => <PairRow key={`${p.a}|${p.b}`} pair={p} />)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ background: '#450a0a', border: '1px solid #ef4444', borderRadius: 6, padding: '10px 14px' }}>
        <div style={{ color: '#f87171', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>
          ⚠ {twins.length} Acoustic Twin{twins.length !== 1 ? 's' : ''} Detected
        </div>
        <div style={{ color: '#94a3b8', fontSize: 11 }}>
          These character pairs share {'>'} 35% vocabulary. Their voices risk sounding identical. Differentiate by: distinct belief domains, unique sentence structures, opposing emotional registers.
        </div>
      </div>
      {twins.map(p => <PairRow key={`${p.a}|${p.b}`} pair={p} highlight />)}
      {pairs.filter(p => p.similarity < 0.35).length > 0 && (
        <>
          <div style={{ color: '#64748b', fontSize: 10, marginTop: 6 }}>OTHER PAIRS</div>
          {pairs.filter(p => p.similarity < 0.35).map(p => <PairRow key={`${p.a}|${p.b}`} pair={p} />)}
        </>
      )}
    </div>
  );
}

function PairRow({ pair: p, highlight = false }: { pair: SimPair; highlight?: boolean }) {
  const color = simColor(p.similarity);
  const pct = Math.round(p.similarity * 100);
  return (
    <div style={{
      background: highlight ? '#1f0f0f' : '#1e293b',
      border: `1px solid ${highlight ? '#7f1d1d' : '#334155'}`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 5, padding: '7px 10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: p.sharedWords.length > 0 ? 5 : 0 }}>
        <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 12 }}>{p.a}</span>
        <span style={{ color: '#475569', fontSize: 10 }}>↔</span>
        <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 12 }}>{p.b}</span>
        <div style={{ flex: 1 }} />
        {/* Similarity bar */}
        <div style={{ width: 80, height: 6, background: '#334155', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
        </div>
        <span style={{ color, fontSize: 11, fontWeight: 700, width: 34, textAlign: 'right' }}>{pct}%</span>
      </div>
      {p.sharedWords.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <span style={{ color: '#475569', fontSize: 9 }}>shared:</span>
          {p.sharedWords.map(w => (
            <span key={w} style={{ color: '#64748b', fontSize: 9 }}>{w}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Diversity gauge ───────────────────────────────────────────────────────────

function DiversityGauge({ score }: { score: number }) {
  const color = score >= 75 ? '#4ade80' : score >= 50 ? '#fbbf24' : '#f87171';
  const label = score >= 75 ? 'Distinct' : score >= 50 ? 'Moderate' : 'Similar';
  return (
    <div style={{ textAlign: 'center', lineHeight: 1 }}>
      <div style={{ color, fontSize: 20, fontWeight: 700 }}>{score}</div>
      <div style={{ color: '#64748b', fontSize: 9 }}>Voice DNA</div>
      <div style={{ color, fontSize: 9 }}>{label}</div>
    </div>
  );
}

function chipBtn(bg: string): React.CSSProperties {
  return {
    background: bg, border: '1px solid #334155', borderRadius: 4,
    color: '#e2e8f0', padding: '3px 8px', cursor: 'pointer',
    fontFamily: 'monospace', fontSize: 11,
  };
}
