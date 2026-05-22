'use client';
import { useState, useEffect } from 'react';
import { generateWebflowElement, buildCopyableElement } from '@/lib/webflow-generator';
import { isInsideWebflowDesigner } from '@/lib/webflow-insert';
import { toast } from 'sonner';
import { saveToHistory } from '@/lib/guide-history';
import { buildXscpFromGuide, lastXscpPath } from '@/lib/webflow-xscp';
import { writeClipboardXscp } from 'webflow-clipboard';

interface Props {
  guide: string;
  engine?: string;
  /** called after successfully setting the pending entry (so parent can sync history) */
  onSaved?: () => void;
}

export function CopyElementButton({ guide, engine = 'unknown', onSaved }: Props) {
  const [pasteStatus, setPasteStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [copied, setCopied] = useState(false);
  const [inDesigner, setInDesigner] = useState(false);

  useEffect(() => {
    setInDesigner(isInsideWebflowDesigner());
  }, []);

  // ── Paste directly into Webflow Designer via Cmd+V ──────────────────────
  function handlePasteToWebflow() {
    const xscp = buildXscpFromGuide(guide);
    if (!xscp) {
      toast.error('No se encontraron bloques de código en la guía.');
      return;
    }
    try {
      writeClipboardXscp(xscp);
      setPasteStatus('ok');
      const path = lastXscpPath();
      toast.success('¡Listo para pegar en Webflow!', {
        description: `Formato: ${path === 'native' ? '✅ Elementos nativos (Block/Heading/etc.)' : '⚠️ HTML Embed (fallback)'} — Cmd+V en el canvas.`,
        duration: 6000,
      });
      setTimeout(() => setPasteStatus('idle'), 4000);
    } catch (err) {
      setPasteStatus('err');
      toast.error('Error al copiar: ' + (err as Error).message);
      setTimeout(() => setPasteStatus('idle'), 3000);
    }
  }

  // ── Save guide to localStorage + server for the extension panel ──────────
  async function handleCopy() {
    try {
      const element = generateWebflowElement(guide);
      const copyable = buildCopyableElement(element);

      localStorage.setItem('wfr_pending_element', copyable);
      localStorage.setItem('wfr_pending_guide', guide);

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
    <div className="space-y-3">

      {/* ── Primary: Paste to Webflow via Xscp ── */}
      {!inDesigner && (
        <button
          onClick={handlePasteToWebflow}
          className={`w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-xl font-bold text-sm transition-all ${
            pasteStatus === 'ok'
              ? 'bg-green-500/15 border border-green-500/50 text-green-400'
              : pasteStatus === 'err'
              ? 'bg-red-500/15 border border-red-500/40 text-red-400'
              : 'bg-[#4f46e5] hover:bg-[#4338ca] text-white shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/35 active:scale-[0.98]'
          }`}
        >
          {pasteStatus === 'ok' ? (
            <>✅ <span>¡Copiado! Abrí Webflow y presioná Cmd+V</span></>
          ) : pasteStatus === 'err' ? (
            <>❌ <span>Error al copiar</span></>
          ) : (
            <>
              <WebflowIcon />
              <span>Copiar para pegar en Webflow</span>
              <span className="text-indigo-300 font-normal text-xs ml-1">Cmd+V</span>
            </>
          )}
        </button>
      )}

      {/* ── Secondary row ── */}
      <div className="flex gap-2.5">
        {inDesigner ? (
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm bg-indigo-500 hover:bg-indigo-400 text-white transition-all"
          >
            🎯 Preparar para Extension
          </button>
        ) : (
          <button
            onClick={handleCopy}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-sm transition-all border ${
              copied
                ? 'bg-green-500/10 border-green-500/40 text-green-400'
                : 'border-[#2a2a2a] bg-[#1a1a1a] text-gray-400 hover:text-white hover:border-[#444]'
            }`}
          >
            <span>{copied ? '✅' : '📡'}</span>
            <span>{copied ? 'Enviado al panel' : 'Enviar al panel Designer'}</span>
          </button>
        )}

        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-sm border border-[#2a2a2a] bg-[#1a1a1a] text-gray-400 hover:text-white hover:border-[#444] transition-all"
        >
          <span>⬇️</span>
          <span>Descargar .md</span>
        </button>
      </div>
    </div>
  );
}

function WebflowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
      <path d="M17.82 6.003c-2.01.03-3.71 1.307-4.407 3.087L10.87 6H6.18L3 18h4.49l1.805-7.21c.348 2.05 2.155 3.606 4.3 3.606h.405l-1.705 3.604h4.39L20 6.003h-2.18z" />
    </svg>
  );
}
