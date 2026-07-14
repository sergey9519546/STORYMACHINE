// DesignPreview — a standalone gallery of the "paper · ink · stamp" design
// system primitives (src/styles/design-system.css). Mounted via the URL flag
// `#design-preview` so it never disturbs the normal app flow. Restyled panels
// compose these same primitives, so this page is the reference for the system.
import React from 'react';

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    <span className="sm-h">{label}</span>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>{children}</div>
  </div>
);

export default function DesignPreview() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--sm-paper)', color: 'var(--sm-ink)',
      fontFamily: 'var(--sm-font-body)', padding: 'clamp(16px, 5vw, 46px) clamp(12px, 3.5vw, 50px)', display: 'flex',
      flexDirection: 'column', gap: 34 }}>
      <div>
        <div style={{ fontFamily: 'var(--sm-font-display)', fontSize: 34, textTransform: 'uppercase', letterSpacing: '.03em' }}>
          Story Machine — Design System
        </div>
        <p className="sm-sub" style={{ maxWidth: '70ch', marginTop: 6 }}>
          Paper · ink · stamp. Mono for machine-truth, one stamp-red for a verdict. Every restyled
          panel composes these primitives — nothing redefines them. Open with <code>#design-preview</code>.
        </p>
      </div>

      <Row label="Type roles">
        <div style={{ fontFamily: 'var(--sm-font-display)', fontSize: 30, textTransform: 'uppercase' }}>Anton display</div>
        <div style={{ fontFamily: 'var(--sm-font-body)', fontSize: 18 }}>Inter body (Archivo if installed)</div>
        <div style={{ fontFamily: 'var(--sm-font-mono)', fontSize: 15 }}>JetBrains machine-truth</div>
        <div className="sm-note">System handwriting margin note</div>
      </Row>

      <Row label="Buttons">
        <button className="sm-btn">Default</button>
        <button className="sm-btn sm-btn--ink">Ink</button>
        <button className="sm-btn sm-btn--stamp">▶ Initialize</button>
        <button className="sm-btn sm-btn--off">Disabled</button>
      </Row>

      <Row label="Chips / tags & verdict stamp">
        <span className="sm-chip">courier</span>
        <span className="sm-chip sm-chip--stamp">holds secret</span>
        <span className="sm-chip sm-chip--ok">clean</span>
        <span className="sm-chip sm-chip--warn">3 major</span>
        <span className="sm-stamp">PASS</span>
        <span className="sm-live"><i /> Live · locked</span>
      </Row>

      <Row label="Bars & gauges">
        <div style={{ width: 240 }}>
          <div className="sm-bar" style={{ height: 11 }}><i style={{ width: '66%' }} /></div>
        </div>
        <div style={{ width: 240 }}>
          <div className="sm-gauge"><i style={{ width: '74%', background: 'var(--sm-stamp)' }} /></div>
        </div>
      </Row>

      <Row label="Panel frame">
        <div className="sm-panel" style={{ width: 'min(364px, 100%)' }}>
          <div className="sm-panel-top"><span className="sm-title">✎ Writers' Room</span><span className="sm-x">Consensus 74 / 100</span></div>
          <div className="sm-panel-body">
            <span className="sm-h">Dominant voice</span>
            <div className="sm-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ font: "700 11px var(--sm-font-body)" }}>Dramaturge</span>
              <span className="sm-chip sm-chip--ok" style={{ marginLeft: 'auto' }}>→ escalate midpoint</span>
            </div>
            <div className="sm-card sm-card--sel">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span className="sm-chip sm-chip--ok">kept</span>
                <span style={{ font: "500 11px var(--sm-font-body)", flex: 1 }}>Voss reveals the count</span>
                <span style={{ font: "700 11px var(--sm-font-mono)" }}>.92</span>
              </div>
            </div>
            <div className="sm-ph" style={{ height: 44 }}>Placeholder region</div>
            <button className="sm-btn sm-btn--ink" style={{ justifyContent: 'center' }}>▶ Initialize simulation</button>
          </div>
        </div>

        <div className="sm-panel" style={{ width: 'min(364px, 100%)' }}>
          <div className="sm-pagetop"><span className="sm-title" style={{ color: 'var(--sm-cream)' }}>◈ Quality Engines</span>
            <span className="sm-x" style={{ color: '#8f846b' }}>Wave gate</span></div>
          <div className="sm-panel-body">
            <div className="sm-card" style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ font: "600 9px var(--sm-font-mono)", flex: 1 }}>Degradation AUC</span>
              <span style={{ font: "700 8px var(--sm-font-mono)", color: 'var(--sm-ok)' }}>0.672 &gt; 0.622 ✓</span>
            </div>
            <div className="sm-bar"><i style={{ width: '67%', background: 'var(--sm-ok)' }} /></div>
            <span className="sm-h" style={{ textAlign: 'center' }}>No LLM in the verdict path</span>
          </div>
        </div>
      </Row>
    </div>
  );
}
