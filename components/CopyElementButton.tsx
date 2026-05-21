'use client';
import { useState, useEffect } from 'react';
import { generateWebflowElement, buildCopyableElement } from '@/lib/webflow-generator';
import { isInsideWebflowDesigner, insertIntoWebflowDesigner } from '@/lib/webflow-insert';
import { toast } from 'sonner';
import { saveToHistory } from '@/lib/guide-history';

interface Props {
  guide: string;
  engine?: string;
  /** called after successfully setting the pending entry (so parent can sync history) */
  onSaved?: () => void;
}

export function CopyElementButton({ guide, engine = 'unknown', onSaved }: Props) {
  const [copied, setCopied] = useState(false);
  const [inserting, setInserting] = useState(false);
  const [inDesigner, setInDesigner] = useState(false);

  // Detect Designer context client-side only
  useEffect(() => {
    setInDesigner(isInsideWebflowDesigner());
  }, []);

  // ── Inside Webflow Designer: insert directly via Designer API ──
  async function handleInsert() {
    setInserting(true);
    try {
      await insertIntoWebflowDesigner(guide);
      toast.success('¡Elemento insertado en el canvas!', {
        description: 'Las clases CSS están en el panel de Estilos.',
        duration: 4000,
      });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setInserting(false);
    }
  }

  // ── Outside Designer: save to localStorage for the extension + copy embed ──
  async function handleCopy() {
    try {
      const element = generateWebflowElement(guide);
      const copyable = buildCopyableElement(element);

      // Save for the Designer Extension to pick up
      localStorage.setItem('wfr_pending_element', copyable);
      localStorage.setItem('wfr_pending_guide', guide);

      // Persist to history
      saveToHistory(guide, engine);
      onSaved?.();

      await navigator.clipboard.writeText(copyable);
      setCopied(true);
      toast.success('¡Preparado para Webflow!', {
        description: 'Abrí el panel en el Designer y hacé click en "Insertar".',
        duration: 5000,
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('No se pudo preparar. Intentá de nuevo.');
    }
  }

  async function handleDownload() {
    const blob = new Blob([guide], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `webflow-guide-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Guía descargada como .md');
  }

  return (
    <div className="flex gap-3 flex-wrap">

      {inDesigner ? (
        // ── Webflow Designer mode ──
        <button
          onClick={handleInsert}
          disabled={inserting}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
            inserting
              ? 'bg-indigo-500/40 text-indigo-300 cursor-not-allowed'
              : 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/20'
          }`}
        >
          <span>{inserting ? '⚙️' : '🎯'}</span>
          <span>{inserting ? 'Insertando...' : 'Insertar en Webflow'}</span>
        </button>
      ) : (
        // ── Standalone mode ──
        <button
          onClick={handleCopy}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
            copied
              ? 'bg-green-500/20 border border-green-500 text-green-400'
              : 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/20'
          }`}
        >
          <span>{copied ? '✅' : '🎯'}</span>
          <span>{copied ? '¡Listo! Abrí el Designer' : 'Preparar para Webflow'}</span>
        </button>
      )}

      <button
        onClick={handleDownload}
        className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-sm border border-[#2a2a2a] bg-[#1a1a1a] text-gray-400 hover:text-white hover:border-[#444] transition-all"
      >
        <span>⬇️</span>
        <span>Descargar .md</span>
      </button>
    </div>
  );
}
