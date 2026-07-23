// HarvestPanel — live session quality metrics + sidecar download.
// Shows momentum, quality score, Propp coverage, and a button to download
// the current session as an NVM sidecar JSON.

import React, { useState, useEffect } from 'react';

interface HarvestMetrics {
  momentumScore: number;
  qualityScore: number;
  proppCoverage: number;
  tensionTotal: number;
  ghostCount: number;
  commitCount: number;
}

interface HarvestPanelProps {
  onClose: () => void;
}

export function HarvestPanel({ onClose }: HarvestPanelProps) {
  const [metrics, setMetrics] = useState<HarvestMetrics | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchMetrics() {
      try {
        const [momRes, sidecarRes, ghostRes] = await Promise.all([
          fetch('/api/nvm/momentum'),
          fetch('/api/nvm/sidecar'),
          fetch('/api/nvm/ghost-commits'),
        ]);
        if (cancelled) return;
        const momData = momRes.ok ? await momRes.json() : {};
        const sidecarData = sidecarRes.ok ? await sidecarRes.json() : {};
        const ghostData = ghostRes.ok ? await ghostRes.json() : {};
        setMetrics({
          momentumScore: momData.momentumScore ?? 0,
          qualityScore: sidecarData.qualityScore ?? 0,
          proppCoverage: Math.round((sidecarData.proppCoverage ?? 0) * 100),
          tensionTotal: sidecarData.tensionTotal ?? 0,
          ghostCount: ghostData.ghosts?.length ?? 0,
          commitCount: sidecarData.commitCount ?? 0,
        });
      } catch {
        if (!cancelled) setError('Failed to load metrics');
      }
    }
    fetchMetrics();
    const id = setInterval(fetchMetrics, 8000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch('/api/nvm/sidecar');
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `storymachine-sidecar-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Download failed');
    } finally {
      setDownloading(false);
    }
  }

  function bar(value: number, max = 100, color = 'var(--sm-ok)') {
    const pct = Math.min(100, Math.round((value / max) * 100));
    return (
      <div style={{ background: 'var(--sm-night-2)', borderRadius: 4, height: 8, marginTop: 4 }}>
        <div style={{ background: color, width: `${pct}%`, height: '100%', borderRadius: 4, transition: 'width 0.4s' }} />
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--sm-night)', color: 'var(--sm-cream)', borderRadius: 8,
      padding: 20, minWidth: 300, fontFamily: 'var(--sm-font-mono)', fontSize: 13,
      border: '1px solid var(--sm-night-line)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <strong style={{ fontSize: 15 }}>Harvest</strong>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--sm-cream-mute)', cursor: 'pointer', fontSize: 16 }}>x</button>
      </div>

      {error && <div style={{ color: 'var(--sm-stamp)', marginBottom: 12 }}>{error}</div>}

      {metrics ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Metric label="Momentum" value={metrics.momentumScore} suffix="/100" color="var(--sm-cool)">
            {bar(metrics.momentumScore, 100, 'var(--sm-cool)')}
          </Metric>
          <Metric label="Quality" value={metrics.qualityScore} suffix="/100" color="var(--sm-ok)">
            {bar(metrics.qualityScore, 100, 'var(--sm-ok)')}
          </Metric>
          <Metric label="Propp Coverage" value={metrics.proppCoverage} suffix="%" color="var(--sm-cool)">
            {bar(metrics.proppCoverage, 100, 'var(--sm-cool)')}
          </Metric>
          <Metric label="Tension" value={Math.round(metrics.tensionTotal)} suffix="" color="var(--sm-warn)">
            {bar(metrics.tensionTotal, 100, 'var(--sm-warn)')}
          </Metric>
          <div style={{ borderTop: '1px solid var(--sm-night-line)', paddingTop: 10, display: 'flex', gap: 16 }}>
            <Pill label="Commits" value={metrics.commitCount} />
            <Pill label="Ghosts" value={metrics.ghostCount} />
          </div>
        </div>
      ) : (
        <div style={{ color: 'var(--sm-cream-mute)' }}>Loading...</div>
      )}

      <button
        onClick={handleDownload}
        disabled={downloading}
        style={{
          marginTop: 16, width: '100%', padding: '8px 0',
          background: downloading ? 'var(--sm-night-line)' : 'var(--sm-cool)',
          color: '#fff', border: 'none', borderRadius: 6,
          cursor: downloading ? 'default' : 'pointer', fontFamily: 'var(--sm-font-mono)',
        }}
      >
        {downloading ? 'Downloading...' : 'Download Sidecar JSON'}
      </button>
    </div>
  );
}

function Metric({ label, value, suffix, color, children }: {
  label: string; value: number; suffix: string; color: string; children?: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--sm-cream-mute)' }}>{label}</span>
        <span style={{ color }}>{value}{suffix}</span>
      </div>
      {children}
    </div>
  );
}

function Pill({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <span style={{ color: 'var(--sm-ink-mute)', fontSize: 11 }}>{label}</span>
      <span style={{ background: 'var(--sm-night-2)', padding: '1px 6px', borderRadius: 4 }}>{value}</span>
    </div>
  );
}
