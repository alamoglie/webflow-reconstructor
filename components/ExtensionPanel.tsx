'use client';
import { useState, useEffect, useCallback } from 'react';
import { generateWebflowElement, buildCopyableElement } from '@/lib/webflow-generator';
import {
  relativeTime,
  engineLabel,
  GuideHistoryEntry,
} from '@/lib/guide-history';

export function ExtensionPanel() {
  const [history, setHistory] = useState<GuideHistoryEntry[]>([]);
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  // Poll the server-side store — bypasses Chrome's third-party Storage
  // Partitioning that blocks localStorage sharing between this iframe
  // (embedded in app.webflow.com) and the localhost:3001 browser tab.
  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/guides');
      if (res.ok) setHistory(await res.json());
    } catch {/* dev server may not be running yet */}
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  function setStatus(id: string, msg: string, ttl = 4000) {
    setStatuses((prev) => ({ ...prev, [id]: msg }));
    if (ttl > 0) {
      setTimeout(() => setStatuses((prev) => {
        const n = { ...prev };
        delete n[id];
        return n;
      }), ttl);
    }
  }

  async function handleCopyEmbed(entry: GuideHistoryEntry) {
    try {
      const element = generateWebflowElement(entry.guide);
      const copyable = buildCopyableElement(element);
      await navigator.clipboard.writeText(copyable);
      setStatus(entry.id, '✅ Copiado — pegá en un Embed block');
    } catch {
      setStatus(entry.id, '❌ No se pudo copiar', 5000);
    }
  }

  async function handleCopyCSS(entry: GuideHistoryEntry) {
    try {
      const element = generateWebflowElement(entry.guide);
      if (!element.css) {
        setStatus(entry.id, '⚠️ No se encontró CSS', 4000);
        return;
      }
      await navigator.clipboard.writeText(`<style>\n${element.css}\n</style>`);
      setStatus(entry.id, '✅ CSS copiado — pegá en Page Settings > Head');
    } catch {
      setStatus(entry.id, '❌ No se pudo copiar', 5000);
    }
  }

  async function handleDelete(id: string) {
    setHistory((prev) => prev.filter((e) => e.id !== id));
    setStatuses((prev) => { const n = { ...prev }; delete n[id]; return n; });
    try { await fetch(`/api/guides/${id}`, { method: 'DELETE' }); } catch {/* ok */}
  }

  const C = {
    bg: '#111',
    card: '#1a1a1a',
    border: '#2a2a2a',
    indigo: '#6366f1',
    green: '#22c55e',
    muted: '#666',
    text: '#e5e5e5',
  } as const;

  const btnBase: React.CSSProperties = {
    padding: '5px 8px',
    borderRadius: 6,
    border: 'none',
    fontWeight: 600,
    fontSize: 11,
    cursor: 'pointer',
    transition: 'all 0.15s',
  };

  return (
    <div style={{
      fontFamily: 'Inter, system-ui, sans-serif',
      background: C.bg,
      minHeight: '100vh',
      color: C.text,
      padding: '14px',
      boxSizing: 'border-box',
      fontSize: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: 26, height: 26, background: C.indigo, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
          W
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 12 }}>Webflow Reconstructor</div>
          <div style={{ color: C.muted, fontSize: 10 }}>Designer Extension</div>
        </div>
      </div>

      {/* How-to hint */}
      <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 7, padding: '8px 10px', fontSize: 10, color: '#a5b4fc', lineHeight: 1.6 }}>
        <strong style={{ color: '#c7d2fe' }}>Cómo usar:</strong><br />
        1. Copiá el código con el botón de abajo<br />
        2. En Webflow: <strong style={{ color: '#c7d2fe' }}>Add &gt; Embed</strong>, pegá el HTML<br />
        3. Para CSS: <strong style={{ color: '#c7d2fe' }}>Page Settings &gt; Custom Code &gt; Head</strong>
      </div>

      {/* History list */}
      {history.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px' }}>
          <div style={{ color: C.muted, fontSize: 11, marginBottom: 3 }}>Sin guías guardadas</div>
          <div style={{ color: '#444', fontSize: 10, lineHeight: 1.5 }}>
            Generá una guía en{' '}
            <span style={{ color: C.indigo }}>localhost:3001</span>
            {' '}y aparecerá aquí automáticamente.
          </div>
        </div>
      ) : (
        <>
          <div style={{ color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: 2 }}>
            Historial · {history.length} {history.length === 1 ? 'guía' : 'guías'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
            {history.map((entry) => {
              const status = statuses[entry.id];

              return (
                <div
                  key={entry.id}
                  style={{
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: '9px 10px',
                  }}
                >
                  {/* Name */}
                  <div style={{
                    fontWeight: 600,
                    fontSize: 11,
                    color: '#d4d4d4',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginBottom: 2,
                  }}>
                    {entry.name}
                  </div>

                  {/* Meta */}
                  <div style={{ color: C.muted, fontSize: 10, marginBottom: 8 }}>
                    {engineLabel(entry.engine)} · {relativeTime(entry.timestamp)}
                  </div>

                  {/* Status */}
                  {status ? (
                    <div style={{
                      fontSize: 10,
                      padding: '5px 8px',
                      borderRadius: 5,
                      lineHeight: 1.4,
                      background: status.startsWith('✅') ? 'rgba(34,197,94,0.08)' :
                        status.startsWith('❌') ? 'rgba(239,68,68,0.1)' :
                        status.startsWith('⚠️') ? 'rgba(234,179,8,0.08)' : 'rgba(99,102,241,0.08)',
                      color: status.startsWith('✅') ? '#4ade80' :
                        status.startsWith('❌') ? '#f87171' :
                        status.startsWith('⚠️') ? '#fbbf24' : '#a5b4fc',
                      border: `1px solid ${status.startsWith('✅') ? 'rgba(34,197,94,0.2)' :
                        status.startsWith('❌') ? 'rgba(239,68,68,0.2)' :
                        status.startsWith('⚠️') ? 'rgba(234,179,8,0.2)' : 'rgba(99,102,241,0.2)'}`,
                    }}>
                      {status}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {/* Copy HTML+CSS embed */}
                      <button
                        onClick={() => handleCopyEmbed(entry)}
                        style={{ ...btnBase, flex: 1, background: C.indigo, color: '#fff' }}
                      >
                        📋 Copiar HTML
                      </button>

                      {/* Copy CSS only */}
                      <button
                        onClick={() => handleCopyCSS(entry)}
                        style={{ ...btnBase, background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)' }}
                        title="Copiar solo el CSS (para el &lt;head&gt;)"
                      >
                        CSS
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(entry.id)}
                        style={{ ...btnBase, background: 'transparent', color: C.muted, border: `1px solid ${C.border}` }}
                        title="Eliminar"
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.color = '#f87171';
                          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.4)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.color = C.muted;
                          (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 4px; }
        button:hover:not(:disabled) { opacity: 0.85; }
      `}</style>
    </div>
  );
}
