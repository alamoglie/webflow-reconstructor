'use client';
import { useState, useEffect, useCallback } from 'react';
import { insertIntoWebflowDesigner } from '@/lib/webflow-insert';
import {
  loadHistory,
  deleteHistoryEntry,
  relativeTime,
  engineLabel,
  GuideHistoryEntry,
} from '@/lib/guide-history';

const GUIDE_KEY = 'wfr_pending_guide';

export function ExtensionPanel() {
  const [history, setHistory] = useState<GuideHistoryEntry[]>([]);
  const [insertingId, setInsertingId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  const refresh = useCallback(() => {
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    refresh();
    // Poll every 2s so new guides generated in the browser tab appear here
    const interval = setInterval(refresh, 2000);
    window.addEventListener('storage', refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);

  function setStatus(id: string, msg: string, ttl = 4000) {
    setStatuses((prev) => ({ ...prev, [id]: msg }));
    if (ttl > 0) setTimeout(() => setStatuses((prev) => { const n = { ...prev }; delete n[id]; return n; }), ttl);
  }

  async function handleInsert(entry: GuideHistoryEntry) {
    setInsertingId(entry.id);
    setStatus(entry.id, 'Insertando...', 0);
    try {
      await insertIntoWebflowDesigner(entry.guide);
      setStatus(entry.id, '✅ Insertado');
      // Mark as the last used pending
      localStorage.setItem(GUIDE_KEY, entry.guide);
    } catch (err) {
      setStatus(entry.id, `❌ ${(err as Error).message}`, 6000);
    } finally {
      setInsertingId(null);
    }
  }

  function handleDelete(id: string) {
    const updated = deleteHistoryEntry(id);
    setHistory(updated);
    setStatuses((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }

  const C = {
    bg: '#111',
    card: '#1a1a1a',
    border: '#2a2a2a',
    indigo: '#6366f1',
    muted: '#666',
    text: '#e5e5e5',
  } as const;

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

      {/* History list */}
      {history.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px' }}>
          <div style={{ color: C.muted, fontSize: 11, marginBottom: 3 }}>Sin guías guardadas</div>
          <div style={{ color: '#444', fontSize: 10, lineHeight: 1.5 }}>
            Generá una guía en{' '}
            <span style={{ color: C.indigo }}>localhost:3001</span>{' '}
            y hacé click en "Preparar para Webflow".
          </div>
        </div>
      ) : (
        <>
          <div style={{ color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: 2 }}>
            Historial · {history.length} {history.length === 1 ? 'guía' : 'guías'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
            {history.map((entry) => {
              const status = statuses[entry.id];
              const isInserting = insertingId === entry.id;

              return (
                <div
                  key={entry.id}
                  style={{
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: '9px 10px',
                    transition: 'border-color 0.15s',
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
                  <div style={{ color: C.muted, fontSize: 10, marginBottom: 7 }}>
                    {engineLabel(entry.engine)} · {relativeTime(entry.timestamp)}
                  </div>

                  {/* Status / Actions */}
                  {status ? (
                    <div style={{
                      fontSize: 10,
                      padding: '4px 8px',
                      borderRadius: 5,
                      background: status.startsWith('✅') ? 'rgba(34,197,94,0.08)' :
                        status.startsWith('❌') ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.08)',
                      color: status.startsWith('✅') ? '#4ade80' :
                        status.startsWith('❌') ? '#f87171' : '#a5b4fc',
                      border: `1px solid ${status.startsWith('✅') ? 'rgba(34,197,94,0.2)' :
                        status.startsWith('❌') ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.2)'}`,
                    }}>
                      {status}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        onClick={() => handleInsert(entry)}
                        disabled={isInserting || insertingId !== null}
                        style={{
                          flex: 1,
                          padding: '5px 0',
                          borderRadius: 6,
                          border: 'none',
                          background: isInserting ? 'rgba(99,102,241,0.3)' : C.indigo,
                          color: isInserting ? '#a5b4fc' : '#fff',
                          fontWeight: 700,
                          fontSize: 11,
                          cursor: isInserting || insertingId !== null ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {isInserting ? '⚙️ Insertando...' : '🎯 Insertar'}
                      </button>

                      <button
                        onClick={() => handleDelete(entry.id)}
                        title="Eliminar"
                        style={{
                          padding: '5px 8px',
                          borderRadius: 6,
                          border: `1px solid ${C.border}`,
                          background: 'transparent',
                          color: C.muted,
                          fontSize: 11,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
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

      {/* Footer hint */}
      <div style={{ color: '#333', fontSize: 10, textAlign: 'center', marginTop: 'auto', paddingTop: 4 }}>
        Generá guías en localhost:3001
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 4px; }
      `}</style>
    </div>
  );
}
