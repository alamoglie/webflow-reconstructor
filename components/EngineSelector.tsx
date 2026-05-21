'use client';
import { AIEngine, PROVIDERS } from '@/types';

interface Props {
  value: AIEngine;
  onChange: (engine: AIEngine) => void;
}

export function EngineSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <label className="text-xs text-gray-400 uppercase tracking-wider">Motor de IA</label>

      <div className="grid grid-cols-3 gap-1.5">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={`relative flex flex-col items-center gap-0.5 py-2 px-1.5 rounded-lg border text-sm transition-all ${
              value === p.id
                ? 'border-indigo-500 bg-indigo-500/10 text-white'
                : 'border-[#2a2a2a] bg-[#1a1a1a] text-gray-400 hover:border-[#444] hover:text-gray-300'
            }`}
          >
            {p.free && (
              <span className="absolute top-1 right-1 text-[8px] bg-green-500/20 text-green-400 px-1 py-px rounded-full font-semibold leading-tight">
                FREE
              </span>
            )}
            <span className="text-sm">{p.icon}</span>
            <span className="font-medium text-[11px] leading-tight">{p.label}</span>
            <span className="text-[9px] opacity-40 truncate max-w-full px-0.5 text-center leading-tight">
              {p.supportsVision ? '👁 visión' : '💬 texto'}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={() => onChange('compare')}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm transition-all ${
          value === 'compare'
            ? 'border-indigo-500 bg-indigo-500/10 text-white'
            : 'border-[#2a2a2a] bg-[#1a1a1a] text-gray-400 hover:border-[#444] hover:text-gray-300'
        }`}
      >
        <span>⚡</span>
        <span className="font-medium">Comparar</span>
        <span className="text-xs opacity-50">Claude vs GPT-4o en paralelo</span>
      </button>
    </div>
  );
}
