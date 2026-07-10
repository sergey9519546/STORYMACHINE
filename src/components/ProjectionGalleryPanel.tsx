// ProjectionGalleryPanel — G3 Holographic Projection UI.
// One canon, every format. All 16 ProjectionTargets + P2 export (FDX/DOCX/PDF).
// Tab order groups the Output Syntax additions: documents (treatment, outline),
// alternate drafts (dialogue_only, epistolary), then engine views
// (simulation_log, director_commentary). Server-authoritative target list:
// server/routes/nvm/debug.ts's VALID array.

import React, { useState, useCallback } from 'react';

type ProjectionTarget =
  | 'fountain' | 'novel' | 'stage' | 'comic' | 'interactive'
  | 'pitch' | 'bible' | 'rewatch' | 'cutting_room' | 'sidecar'
  | 'treatment' | 'outline' | 'dialogue_only' | 'epistolary'
  | 'simulation_log' | 'director_commentary';

interface Artifact {
  target: ProjectionTarget;
  content: string;
  metadata: Record<string, unknown>;
}

interface TabSpec {
  id: ProjectionTarget;
  label: string;
  icon: string;
  ext: string;
  mime: string;
  description: string;
  color: string;
}

const TABS: TabSpec[] = [
  { id: 'fountain',     label: 'Screenplay',    icon: '🎬', ext: 'fountain', mime: 'text/plain',       description: 'Fountain-formatted screenplay',                color: '#a78bfa' },
  { id: 'novel',        label: 'Novel',         icon: '📖', ext: 'md',       mime: 'text/markdown',    description: 'Prose narrative markdown',                     color: '#60a5fa' },
  { id: 'stage',        label: 'Stage Play',    icon: '🎭', ext: 'txt',      mime: 'text/plain',       description: 'Stage directions & dialogue',                  color: '#34d399' },
  { id: 'comic',        label: 'Comic',         icon: '💬', ext: 'json',     mime: 'application/json', description: 'Panel-by-panel storyboard JSON',               color: '#fb923c' },
  { id: 'interactive',  label: 'Living Story',  icon: '⚙️', ext: 'json',     mime: 'application/json', description: 'Replayable executable story JSON',             color: '#f472b6' },
  { id: 'pitch',        label: 'Pitch',         icon: '📣', ext: 'md',       mime: 'text/markdown',    description: 'One-page pitch document',                      color: '#fbbf24' },
  { id: 'bible',        label: 'Story Bible',   icon: '📚', ext: 'md',       mime: 'text/markdown',    description: 'Full world & character reference',             color: '#38bdf8' },
  { id: 'rewatch',      label: 'Rewatch',       icon: '🔁', ext: 'md',       mime: 'text/markdown',    description: 'Annotated second-viewing guide',               color: '#a3e635' },
  { id: 'cutting_room', label: 'Cutting Room',  icon: '✂️', ext: 'md',       mime: 'text/markdown',    description: 'Rejected ghost candidates',                    color: '#94a3b8' },
  { id: 'sidecar',      label: 'Sidecar',       icon: '📊', ext: 'json',     mime: 'application/json', description: 'NVM quality metrics for CI/tooling',           color: '#e879f9' },
  // Documents
  { id: 'treatment',           label: 'Treatment',    icon: '📝', ext: 'txt', mime: 'text/plain', description: 'Treatment — prose development document with logline',                        color: '#f59e0b' },
  { id: 'outline',             label: 'Beat Outline', icon: '🗂️', ext: 'txt', mime: 'text/plain', description: 'Beat Outline — numbered beat sheet with act breaks',                          color: '#22d3ee' },
  // Drafts
  { id: 'dialogue_only',       label: 'Table Read',   icon: '🗣️', ext: 'txt', mime: 'text/plain', description: 'Table Read — spoken lines only, for voice testing',                           color: '#4ade80' },
  { id: 'epistolary',          label: 'Epistolary',   icon: '✉️', ext: 'txt', mime: 'text/plain', description: 'Epistolary — the story as first-person letters and journal entries',          color: '#c084fc' },
  // Engine views
  { id: 'simulation_log',      label: 'Sim Log',      icon: '🧾', ext: 'txt', mime: 'text/plain', description: 'Simulation Log — the objective what-happened ledger',                         color: '#f87171' },
  { id: 'director_commentary', label: 'Commentary',   icon: '🎙️', ext: 'txt', mime: 'text/plain', description: "Director's Commentary — what the machinery is doing under each scene",        color: '#fde047' },
];

interface Props { onClose: () => void; }

export function ProjectionGalleryPanel({ onClose }: Props) {
  const [activeTab, setActiveTab]   = useState<ProjectionTarget>('fountain');
  const [artifacts, setArtifacts]   = useState<Partial<Record<ProjectionTarget, Artifact>>>({});
  const [loading, setLoading]       = useState<Partial<Record<ProjectionTarget, boolean>>>({});
  const [errors, setErrors]         = useState<Partial<Record<ProjectionTarget, string>>>({});

  const loadArtifact = useCallback(async (target: ProjectionTarget) => {
    if (artifacts[target] || loading[target]) return;
    setLoading(l => ({ ...l, [target]: true }));
    setErrors(e => ({ ...e, [target]: undefined }));
    try {
      const res = await fetch(`/api/nvm/project/${target}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Server error' }));
        throw new Error(body.error ?? 'Server error');
      }
      const data: Artifact = await res.json();
      setArtifacts(a => ({ ...a, [target]: data }));
    } catch (e) {
      setErrors(err => ({ ...err, [target]: e instanceof Error ? e.message : String(e) }));
    } finally {
      setLoading(l => ({ ...l, [target]: false }));
    }
  }, [artifacts, loading]);

  function handleTabSelect(id: ProjectionTarget) {
    setActiveTab(id);
    loadArtifact(id);
  }

  function handleRefresh() {
    setArtifacts(a => { const n = { ...a }; delete n[activeTab]; return n; });
    setErrors(e => { const n = { ...e }; delete n[activeTab]; return n; });
    setTimeout(() => loadArtifact(activeTab), 0);
  }

  function downloadArtifact(tab: TabSpec, artifact: Artifact) {
    const blob = new Blob([artifact.content], { type: tab.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `storymachine-${tab.id}.${tab.ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // P2 export helpers — only shown when fountain content is loaded
  async function exportFountainAs(format: 'fdx' | 'docx' | 'print-html') {
    const artifact = artifacts['fountain'];
    if (!artifact) return;
    const body = JSON.stringify({ fountain: artifact.content, title: 'Screenplay' });
    const headers = { 'Content-Type': 'application/json' };

    if (format === 'print-html') {
      // Open in new tab so browser PDF print kicks in
      const res = await fetch('/api/export/print-html', { method: 'POST', headers, body });
      if (!res.ok) return;
      const html = await res.text();
      const w = window.open('', '_blank');
      if (w) { w.document.open(); w.document.write(html); w.document.close(); }
      return;
    }

    const endpoint = format === 'fdx' ? '/api/export/fdx' : '/api/export/docx';
    const ext = format === 'fdx' ? 'fdx' : 'docx';
    const mime = format === 'fdx' ? 'application/xml' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const res = await fetch(endpoint, { method: 'POST', headers, body });
    if (!res.ok) return;
    const blob = new Blob([await res.arrayBuffer()], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `screenplay.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const currentTab = TABS.find(t => t.id === activeTab)!;
  const currentArtifact = artifacts[activeTab];
  const isLoading = loading[activeTab];
  const currentError = errors[activeTab];

  return (
    <div style={{
      background: '#0f172a', color: '#e2e8f0', borderRadius: 8,
      padding: 0, width: 860, maxWidth: '98vw', fontFamily: 'monospace',
      fontSize: 13, border: '1px solid #334155',
      maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #334155' }}>
        <div>
          <strong style={{ fontSize: 15 }}>Projection Gallery — G3 Holographic Output</strong>
          <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>One canon · every format · pure projection</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid #334155', background: '#0c1525', flexShrink: 0 }}>
        {TABS.map(tab => {
          const isActive = tab.id === activeTab;
          const hasData = !!artifacts[tab.id];
          const isErr = !!errors[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => handleTabSelect(tab.id)}
              style={{
                background: isActive ? '#1e293b' : 'transparent',
                border: 'none',
                borderBottom: isActive ? `2px solid ${tab.color}` : '2px solid transparent',
                color: isActive ? '#e2e8f0' : '#64748b',
                padding: '9px 12px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: 12,
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'color 0.15s',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {hasData && !isErr && <span style={{ width: 6, height: 6, borderRadius: '50%', background: tab.color, display: 'inline-block' }} />}
              {isErr && <span style={{ color: '#f87171', fontSize: 10 }}>!</span>}
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Action bar */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <span style={{ color: currentTab.color, marginRight: 6 }}>{currentTab.icon}</span>
            <strong>{currentTab.label}</strong>
            <span style={{ color: '#64748b', marginLeft: 8, fontSize: 11 }}>{currentTab.description}</span>
          </div>
          {!currentArtifact && !isLoading && !currentError && (
            <button onClick={() => loadArtifact(activeTab)} style={btnStyle('#7c3aed')}>
              Load projection
            </button>
          )}
          {currentArtifact && (
            <>
              <button onClick={handleRefresh} style={btnStyle('#1e293b')}>↺ Refresh</button>
              <button onClick={() => downloadArtifact(currentTab, currentArtifact)} style={btnStyle('#065f46')}>
                ↓ Download .{currentTab.ext}
              </button>
              {activeTab === 'fountain' && (
                <>
                  <button onClick={() => exportFountainAs('fdx')} style={btnStyle('#1e3a5f')} title="Export as Final Draft FDX">↓ FDX</button>
                  <button onClick={() => exportFountainAs('docx')} style={btnStyle('#1e3a5f')} title="Export as Microsoft Word DOCX">↓ DOCX</button>
                  <button onClick={() => exportFountainAs('print-html')} style={btnStyle('#1e3a5f')} title="Open print view for PDF">⎙ PDF</button>
                </>
              )}
            </>
          )}
        </div>

        {/* Metadata bar */}
        {currentArtifact && Object.keys(currentArtifact.metadata).length > 0 && (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', background: '#1e293b', borderRadius: 5, padding: '7px 12px' }}>
            {Object.entries(currentArtifact.metadata).map(([k, v]) => (
              <div key={k}>
                <span style={{ color: '#64748b', fontSize: 11, marginRight: 4 }}>{k}:</span>
                <span style={{ color: currentTab.color }}>{String(v)}</span>
              </div>
            ))}
          </div>
        )}

        {/* States */}
        {isLoading && (
          <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>
            Projecting {currentTab.label}…
          </div>
        )}
        {currentError && (
          <div style={{ color: '#f87171', background: '#1e293b', borderRadius: 5, padding: '10px 14px' }}>
            {currentError}
          </div>
        )}

        {/* Idle state */}
        {!currentArtifact && !isLoading && !currentError && (
          <IdleState tab={currentTab} onLoad={() => loadArtifact(activeTab)} />
        )}

        {/* Content rendering */}
        {currentArtifact && (
          <ContentRenderer artifact={currentArtifact} tab={currentTab} />
        )}
      </div>
    </div>
  );
}

// ── Idle placeholder ──────────────────────────────────────────────────────────

function IdleState({ tab, onLoad }: { tab: TabSpec; onLoad: () => void }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 60, gap: 14, color: '#475569', textAlign: 'center',
    }}>
      <div style={{ fontSize: 48 }}>{tab.icon}</div>
      <div style={{ fontSize: 14, color: '#64748b' }}>{tab.description}</div>
      <div style={{ fontSize: 12, color: '#334155' }}>
        Projection is lazy-loaded — click to compile from current canon
      </div>
      <button onClick={onLoad} style={{ ...btnStyle('#7c3aed'), marginTop: 8, padding: '9px 20px' }}>
        Project → {tab.label}
      </button>
    </div>
  );
}

// ── Content renderer ──────────────────────────────────────────────────────────

function ContentRenderer({ artifact, tab }: { artifact: Artifact; tab: TabSpec }) {
  const { content, target } = artifact;

  if (target === 'comic') {
    return <ComicRenderer content={content} color={tab.color} />;
  }
  if (target === 'sidecar') {
    return <SidecarRenderer content={content} color={tab.color} />;
  }
  if (target === 'interactive') {
    return <JsonRenderer content={content} color={tab.color} label="Living Story JSON" />;
  }
  if (target === 'rewatch') {
    return <RewatchRenderer content={content} color={tab.color} />;
  }

  // Default: monospace text block (fountain, novel, stage, pitch, bible,
  // cutting_room, and the six document/draft/engine-view targets: treatment,
  // outline, dialogue_only, epistolary, simulation_log, director_commentary —
  // all of which project as plain preformatted text)
  return (
    <pre style={{
      background: '#0c1525', border: '1px solid #334155', borderRadius: 5,
      padding: 16, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      color: '#cbd5e1', fontSize: 12, lineHeight: 1.7, flex: 1,
    }}>
      {content || '(empty — no committed ops yet)'}
    </pre>
  );
}

// ── Comic panel renderer ──────────────────────────────────────────────────────

function ComicRenderer({ content, color }: { content: string; color: string }) {
  let panels: Array<{ scene: number; panel: number; caption: string; visual?: string }> = [];
  try { panels = JSON.parse(content); } catch { /* ignore */ }

  if (panels.length === 0) {
    return <EmptyContent label="No visual ops in canon yet (add RECORD_VISUAL_FACT, UPDATE_BELIEF, or SHIFT_RELATIONSHIP ops)" />;
  }

  const byScene = panels.reduce<Record<number, typeof panels>>((acc, p) => {
    if (!acc[p.scene]) acc[p.scene] = [];
    acc[p.scene].push(p);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Object.entries(byScene).map(([scene, ps]) => (
        <div key={scene}>
          <div style={{ color: '#64748b', fontSize: 11, marginBottom: 6 }}>SCENE {scene}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
            {ps.map((p, i) => (
              <div key={i} style={{
                background: '#1e293b', borderRadius: 5, padding: '10px 12px',
                border: `1px solid ${p.visual === 'FULL_BLEED' ? color : '#334155'}`,
                minHeight: 80, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                <div style={{ fontSize: 10, color: '#475569', marginBottom: 6 }}>
                  PANEL {p.panel}{p.visual ? ` · ${p.visual}` : ''}
                </div>
                <div style={{ color: '#cbd5e1', fontSize: 12, lineHeight: 1.5 }}>{p.caption}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Rewatch renderer — highlights irony/clue notes ────────────────────────────

function RewatchRenderer({ content, color }: { content: string; color: string }) {
  const lines = content.split('\n');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {lines.map((line, i) => {
        const isWarning = line.startsWith('⚠️');
        const isClue    = line.startsWith('🔍');
        const isHeading = line.startsWith('###');
        return (
          <div key={i} style={{
            padding: isWarning || isClue ? '5px 10px' : isHeading ? '10px 0 2px' : '1px 0',
            background: isWarning ? '#2d1515' : isClue ? '#1a2b1a' : 'transparent',
            borderLeft: isWarning ? `3px solid #f87171` : isClue ? `3px solid ${color}` : 'none',
            borderRadius: isWarning || isClue ? 4 : 0,
            color: isHeading ? '#94a3b8' : '#cbd5e1',
            fontSize: isHeading ? 13 : 12,
            fontWeight: isHeading ? 700 : 400,
          }}>
            {line || ' '}
          </div>
        );
      })}
    </div>
  );
}

// ── Sidecar renderer — structured quality metrics ─────────────────────────────

function SidecarRenderer({ content, color }: { content: string; color: string }) {
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(content); } catch { /* ignore */ }

  const topLevel = Object.entries(data).filter(([, v]) => typeof v !== 'object' || v === null);
  const nested   = Object.entries(data).filter(([, v]) => typeof v === 'object' && v !== null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Scalar metrics grid */}
      {topLevel.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
          {topLevel.map(([k, v]) => (
            <div key={k} style={{ background: '#1e293b', borderRadius: 5, padding: '10px 12px' }}>
              <div style={{ color: '#64748b', fontSize: 10, marginBottom: 3 }}>{k}</div>
              <div style={{ color, fontSize: 18, fontWeight: 700 }}>{String(v)}</div>
            </div>
          ))}
        </div>
      )}
      {/* Nested objects as JSON */}
      {nested.length > 0 && (
        <pre style={{
          background: '#0c1525', border: '1px solid #334155', borderRadius: 5,
          padding: 14, margin: 0, fontSize: 11, color: '#94a3b8',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {JSON.stringify(Object.fromEntries(nested), null, 2)}
        </pre>
      )}
    </div>
  );
}

// ── Generic JSON renderer ─────────────────────────────────────────────────────

function JsonRenderer({ content, color: _color, label }: { content: string; color: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ color: '#64748b', fontSize: 11 }}>{label}</div>
      <pre style={{
        background: '#0c1525', border: '1px solid #334155', borderRadius: 5,
        padding: 16, margin: 0, fontSize: 11, color: '#94a3b8',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word', flex: 1,
      }}>
        {content}
      </pre>
    </div>
  );
}

function EmptyContent({ label }: { label: string }) {
  return <div style={{ color: '#475569', padding: '30px 0', textAlign: 'center', fontSize: 12 }}>{label}</div>;
}

// ── Shared styles ─────────────────────────────────────────────────────────────

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: '6px 12px', border: 'none', borderRadius: 5,
    background: bg, color: '#fff', cursor: 'pointer',
    fontFamily: 'monospace', fontSize: 12,
  };
}
