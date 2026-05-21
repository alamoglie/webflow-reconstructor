'use client';
import { useState } from 'react';
import { GuideHistoryEntry, deleteHistoryEntry, relativeTime, engineLabel } from '@/lib/guide-history';

const PENDING_GUIDE_KEY = 'wfr_pending_guide';
const PENDING_ELEMENT_KEY = 'wfr_pending_element';

interface Props {
  history: GuideHistoryEntry[];
  onHistoryChange: (updated: GuideHistoryEntry[]) => void;
  onViewGuide: (entry: GuideHistoryEntry) => void;
}

export function HistoryPanel({ history, onHistoryChange, onViewGuide }: Props) {
  const [open, setOpen] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (history.length === 0) return null;

  function handleDelete(id: string) {
    const updated = deleteHistoryEntry(id);
    onHistoryChange(updated);
    // If the deleted entry was pending, clear pending
    if (pendingId === id) {
      setPendingId(null);
      localStorage.removeItem(PENDING_GUIDE_KEY);
      localStorage.removeItem(PENDING_ELEMENT_KEY);
    }
  }

  function handleSetPending(entry: GuideHistoryEntry) {
    localStorage.setItem(PENDING_GUIDE_KEY, entry.guide);
    localStorage.setItem(PENDING_ELEMENT_KEY, entry.guide);
    setPendingId(entry.id);
  }

  return (
    <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#1a1a1a] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base">📚</span>
          <span className="text-sm font-semibold text-gray-200">Historial de guías</span>
          <span className="text-xs bg-[#2a2a2a] text-gray-400 rounded-full px-2 py-0.5 font-medium">
            {history.length}
          </span>
        </div>
        <span className="text-gray-500 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {/* List */}
      {open && (
        <div className="divide-y divide-[#1a1a1a]">
          {history.map((entry) => {
            const isPending = pendingId === entry.id;
            return (
              <div
                key={entry.id}
                className={`px-5 py-3.5 group transition-colors ${
                  isPending ? 'bg-indigo-500/5 border-l-2 border-indigo-500' : 'hover:bg-[#1a1a1a]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-200 font-medium truncate leading-tight">
                      {entry.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {engineLabel(entry.engine)} · {relativeTime(entry.timestamp)}
                      {isPending && (
                        <span className="ml-2 text-indigo-400 font-medium">· enviado al Designer</span>
                      )}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* View */}
                    <button
                      onClick={() => onViewGuide(entry)}
                      title="Ver guía"
                      className="text-xs px-2.5 py-1 rounded-lg bg-[#2a2a2a] text-gray-300 hover:text-white hover:bg-[#333] transition-colors"
                    >
                      Ver
                    </button>

                    {/* Send to Webflow */}
                    <button
                      onClick={() => handleSetPending(entry)}
                      title="Enviar al Designer Extension"
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        isPending
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                          : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300'
                      }`}
                    >
                      {isPending ? '✓ WF' : '→ WF'}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(entry.id)}
                      title="Eliminar"
                      className="text-xs px-2 py-1 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
