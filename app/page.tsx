'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Toaster } from 'sonner';
import { FileUploader } from '@/components/FileUploader';
import { EngineSelector } from '@/components/EngineSelector';
import { ApiKeyInput } from '@/components/ApiKeyInput';
import { GuideOutput } from '@/components/GuideOutput';
import { ExtensionPanel } from '@/components/ExtensionPanel';
import { HistoryPanel } from '@/components/HistoryPanel';
import { AIEngine, AIProvider, ApiKeys, ZipFiles, PROVIDERS } from '@/types';
import { STREAM_ERROR_PREFIX } from '@/lib/ai/types';
import {
  loadHistory,
  saveToHistory,
  deleteHistoryEntry,
  GuideHistoryEntry,
  relativeTime,
  engineLabel,
} from '@/lib/guide-history';

type InputMode = 'none' | 'code' | 'video' | 'images';

const EMPTY_KEYS: ApiKeys = { anthropic: '', openai: '', google: '', openrouter: '' };

export default function Home() {
  // ── All hooks must come before any conditional returns ────────────────────
  const [inDesigner, setInDesigner] = useState(false);

  const [engine, setEngine] = useState<AIEngine>('anthropic');
  const [apiKeys, setApiKeys] = useState<ApiKeys>(EMPTY_KEYS);

  const [inputMode, setInputMode] = useState<InputMode>('none');
  const [codeFiles, setCodeFiles] = useState<ZipFiles>({});
  const [frames, setFrames] = useState<string[]>([]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [guide, setGuide] = useState('');
  const [compareResults, setCompareResults] = useState<Partial<Record<AIProvider, string>>>({});
  const [error, setError] = useState('');

  // History
  const [history, setHistory] = useState<GuideHistoryEntry[]>([]);
  const [viewingEntry, setViewingEntry] = useState<GuideHistoryEntry | null>(null);

  const outputRef = useRef<HTMLDivElement>(null);

  // Detect Designer context + load history on mount
  useEffect(() => {
    const isIframe = window.self !== window.top;
    const hasWebflow = typeof (window as { webflow?: unknown }).webflow !== 'undefined';
    setInDesigner(isIframe || hasWebflow);
    setHistory(loadHistory());
  }, []);

  // ── Conditional render — safe because all hooks are above ─────────────────
  if (inDesigner) return <ExtensionPanel />;

  // ── Input handlers ─────────────────────────────────────────────────────────
  function handleCodeFiles(files: ZipFiles) {
    setCodeFiles(files);
    setFrames([]);
    setInputMode('code');
    setGuide('');
    setCompareResults({});
    setError('');
    setViewingEntry(null);
  }

  function handleFrames(f: string[]) {
    setFrames(f);
    setCodeFiles({});
    setInputMode('video');
    setGuide('');
    setCompareResults({});
    setError('');
    setViewingEntry(null);
  }

  function handleImages(f: string[]) {
    setFrames(f);
    setCodeFiles({});
    setInputMode('images');
    setGuide('');
    setCompareResults({});
    setError('');
    setViewingEntry(null);
  }

  // ── Server-store sync (fire-and-forget) ───────────────────────────────────
  function pushToServer(entry: GuideHistoryEntry) {
    fetch('/api/guides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }).catch(() => {/* non-critical */});
  }

  function deleteFromServer(id: string) {
    fetch(`/api/guides/${id}`, { method: 'DELETE' }).catch(() => {/* non-critical */});
  }

  // ── Streaming helper ───────────────────────────────────────────────────────
  async function streamFromEndpoint(
    url: string,
    body: Record<string, unknown>,
    onChunk: (text: string) => void
  ): Promise<void> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Error ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      if (buffer.includes(STREAM_ERROR_PREFIX)) {
        const errorMsg = buffer.split(STREAM_ERROR_PREFIX)[1]?.trim() ?? 'Error desconocido';
        throw new Error(errorMsg);
      }

      onChunk(chunk);
    }
  }

  // ── Main analyze action ────────────────────────────────────────────────────
  async function analyze() {
    setError('');

    if (inputMode === 'none') {
      setError('Por favor subí un archivo primero.');
      return;
    }

    const providersToRun: AIProvider[] =
      engine === 'compare' ? ['anthropic', 'openai'] : [engine as AIProvider];

    for (const providerId of providersToRun) {
      const meta = PROVIDERS.find((p) => p.id === providerId)!;
      if (!apiKeys[meta.requiresKey]) {
        const keyLabels: Record<keyof ApiKeys, string> = {
          anthropic: 'API key de Anthropic',
          openai: 'API key de OpenAI',
          google: 'API key de Google AI Studio',
          openrouter: 'API key de OpenRouter',
        };
        setError(`Ingresá tu ${keyLabels[meta.requiresKey]} para usar ${meta.label}.`);
        return;
      }
    }

    if (inputMode !== 'code') {
      const noVision = providersToRun.filter(
        (id) => !PROVIDERS.find((p) => p.id === id)?.supportsVision
      );
      if (noVision.length > 0) {
        const labels = noVision
          .map((id) => PROVIDERS.find((p) => p.id === id)?.label)
          .join(', ');
        setError(
          `${labels} no soporta análisis visual. Subí un ZIP con código o elegí otro motor.`
        );
        return;
      }
    }

    setIsAnalyzing(true);
    setIsStreaming(true);
    setGuide('');
    setCompareResults({});
    setViewingEntry(null);

    const endpoint =
      inputMode === 'code' ? '/api/analyze-code' : '/api/analyze-visual';

    const baseBody = {
      ...(inputMode === 'code' ? { files: codeFiles } : { frames }),
      anthropicApiKey: apiKeys.anthropic,
      openaiApiKey: apiKeys.openai,
      googleApiKey: apiKeys.google,
      openrouterApiKey: apiKeys.openrouter,
    };

    try {
      if (engine === 'compare') {
        let anthropicFull = '';
        let openaiFull = '';

        await Promise.all([
          streamFromEndpoint(
            endpoint,
            { ...baseBody, provider: 'anthropic' },
            (chunk) => {
              anthropicFull += chunk;
              setCompareResults((prev) => ({
                ...prev,
                anthropic: (prev.anthropic ?? '') + chunk,
              }));
            }
          ),
          streamFromEndpoint(
            endpoint,
            { ...baseBody, provider: 'openai' },
            (chunk) => {
              openaiFull += chunk;
              setCompareResults((prev) => ({
                ...prev,
                openai: (prev.openai ?? '') + chunk,
              }));
            }
          ),
        ]);

        // Auto-save both results to history (localStorage + server)
        if (anthropicFull) {
          const e1 = saveToHistory(anthropicFull, 'anthropic');
          setHistory((prev) => [e1, ...prev]);
          pushToServer(e1);
        }
        if (openaiFull) {
          const e2 = saveToHistory(openaiFull, 'openai');
          setHistory((prev) => [e2, ...prev]);
          pushToServer(e2);
        }
      } else {
        let fullGuide = '';
        await streamFromEndpoint(
          endpoint,
          { ...baseBody, provider: engine },
          (chunk) => {
            fullGuide += chunk;
            setGuide((prev) => prev + chunk);
          }
        );

        // Auto-save to history (localStorage + server)
        if (fullGuide) {
          const entry = saveToHistory(fullGuide, engine);
          setHistory((prev) => [entry, ...prev]);
          pushToServer(entry);
        }
      }

      setTimeout(() => {
        outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsAnalyzing(false);
      setIsStreaming(false);
    }
  }

  // ── History callbacks ──────────────────────────────────────────────────────
  function handleViewEntry(entry: GuideHistoryEntry) {
    setViewingEntry(entry);
    setTimeout(() => {
      outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  function handleBackToLatest() {
    setViewingEntry(null);
  }

  function handleHistoryChange(updated: GuideHistoryEntry[]) {
    // Find any IDs that were removed and sync deletion to the server
    const removedIds = history
      .map((e) => e.id)
      .filter((id) => !updated.some((u) => u.id === id));
    removedIds.forEach(deleteFromServer);
    setHistory(updated);
  }

  // Called when CopyElementButton saves (standalone mode already saved on copy,
  // but this keeps the history list fresh in case it wasn't auto-saved yet)
  function handleSaved() {
    setHistory(loadHistory());
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const hasOutput =
    engine === 'compare'
      ? Object.values(compareResults).some(Boolean)
      : !!guide;

  const isViewingHistory = !!viewingEntry;

  // What to show in the output area
  const outputGuide = isViewingHistory ? viewingEntry!.guide : guide;
  const outputEngine = (isViewingHistory ? viewingEntry!.engine : engine) as AIEngine;
  const outputCompare = isViewingHistory ? {} : compareResults;

  const showOutput = hasOutput || isViewingHistory;

  const currentProvider =
    engine !== 'compare' ? PROVIDERS.find((p) => p.id === engine) : null;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <Toaster theme="dark" richColors position="bottom-right" />

      {/* Header */}
      <header className="border-b border-[#1a1a1a] px-6 py-4 flex items-center justify-between sticky top-0 z-50 bg-[#0f0f0f]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-sm font-bold">
            W
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight">Webflow Reconstructor</h1>
            <p className="text-xs text-gray-500">by Codegrid</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>
            {engine === 'compare'
              ? 'claude-opus-4-7 · gpt-4o'
              : currentProvider?.model ?? engine}
          </span>
        </div>
      </header>

      {/* Main layout */}
      <main className="max-w-7xl mx-auto px-4 py-8 lg:grid lg:grid-cols-[440px_1fr] lg:gap-8 lg:items-start">

        {/* Left panel */}
        <div className="space-y-5 lg:sticky lg:top-20">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Analizá tu interfaz</h2>
            <p className="text-gray-400 text-sm mt-1">
              Subí código, video o imágenes y generá una guía paso a paso para Webflow.
            </p>
          </div>

          <FileUploader
            onCodeFiles={handleCodeFiles}
            onFrames={handleFrames}
            onImages={handleImages}
            isProcessing={isAnalyzing}
          />

          <EngineSelector value={engine} onChange={setEngine} />

          <ApiKeyInput apiKeys={apiKeys} onChange={setApiKeys} />

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={analyze}
            disabled={isAnalyzing || inputMode === 'none'}
            className={`w-full py-4 rounded-xl font-bold text-base transition-all ${
              isAnalyzing
                ? 'bg-indigo-500/40 text-indigo-300 cursor-not-allowed'
                : inputMode !== 'none'
                ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/30 active:scale-[0.98]'
                : 'bg-[#1a1a1a] text-gray-600 cursor-not-allowed border border-[#2a2a2a]'
            }`}
          >
            {isAnalyzing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⚙️</span>
                Analizando...
              </span>
            ) : (
              '🚀 Generar Guía Webflow'
            )}
          </button>

          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 space-y-1.5">
            <p className="text-xs font-medium text-gray-300">¿Qué podés subir?</p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>📦 <strong className="text-gray-400">ZIP</strong> con HTML, CSS, JS</li>
              <li>🎬 <strong className="text-gray-400">Video</strong> MP4, WebM, MOV — frames extraídos automáticamente</li>
              <li>🖼️ <strong className="text-gray-400">Imágenes</strong> PNG, JPG, WebP — múltiples a la vez</li>
            </ul>
          </div>
        </div>

        {/* Right panel */}
        <div ref={outputRef} className="mt-8 lg:mt-0 space-y-4">

          {/* Empty state — only when nothing to show */}
          {!showOutput && !isAnalyzing && history.length === 0 && (
            <div className="border-2 border-dashed border-[#1a1a1a] rounded-2xl p-16 text-center space-y-3">
              <div className="text-5xl opacity-20">📋</div>
              <p className="text-gray-600 text-sm">
                La guía de reconstrucción aparecerá aquí
              </p>
            </div>
          )}

          {/* Loading skeleton */}
          {isAnalyzing && !hasOutput && (
            <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin text-xl">⚙️</div>
                <p className="text-indigo-300 font-medium">Generando guía...</p>
              </div>
              <div className="space-y-3 animate-pulse">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="h-3 bg-[#2a2a2a] rounded"
                    style={{ width: `${55 + (i * 7) % 40}%` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Guide output */}
          {(showOutput || (isAnalyzing && hasOutput)) && (
            <GuideOutput
              guide={outputGuide}
              isStreaming={isStreaming && !isViewingHistory}
              engine={outputEngine}
              compareResults={outputCompare}
              historyLabel={isViewingHistory ? viewingEntry!.name : undefined}
              onSaved={handleSaved}
              onBackToLatest={handleBackToLatest}
            />
          )}

          {/* History panel — always shown when entries exist */}
          {!isAnalyzing && (
            <HistoryPanel
              history={history}
              onHistoryChange={handleHistoryChange}
              onViewGuide={handleViewEntry}
            />
          )}
        </div>
      </main>
    </div>
  );
}
