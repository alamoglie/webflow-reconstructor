'use client';
import { useState, useEffect } from 'react';
import { ApiKeys } from '@/types';

const STORAGE_KEY = 'wfr_api_keys_v3';

const EMPTY: ApiKeys = { anthropic: '', openai: '', google: '', openrouter: '' };

interface Props {
  apiKeys: ApiKeys;
  onChange: (keys: ApiKeys) => void;
}

const FIELDS: {
  key: keyof ApiKeys;
  label: string;
  placeholder: string;
  hint: string;
}[] = [
  {
    key: 'anthropic',
    label: 'Claude (Anthropic)',
    placeholder: 'sk-ant-...',
    hint: 'console.anthropic.com',
  },
  {
    key: 'openai',
    label: 'GPT-4o (OpenAI)',
    placeholder: 'sk-...',
    hint: 'platform.openai.com',
  },
  {
    key: 'google',
    label: 'Gemini Flash (Google AI Studio)',
    placeholder: 'AIzaSy...',
    hint: 'aistudio.google.com/apikey · tier free',
  },
  {
    key: 'openrouter',
    label: 'OpenRouter — Gemini OR · DeepSeek · Llama · Kimi',
    placeholder: 'sk-or-...',
    hint: 'openrouter.ai/keys',
  },
];

function migrateKeys(raw: Partial<ApiKeys>): ApiKeys {
  return {
    anthropic: raw.anthropic ?? '',
    openai: raw.openai ?? '',
    google: raw.google ?? '',
    openrouter: raw.openrouter ?? '',
  };
}

export function ApiKeyInput({ apiKeys, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState<Record<keyof ApiKeys, boolean>>({
    anthropic: false,
    openai: false,
    google: false,
    openrouter: false,
  });

  useEffect(() => {
    const saved =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem('wfr_api_keys_v2');
    if (saved) {
      try {
        const migrated = migrateKeys(JSON.parse(saved));
        onChange(migrated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      } catch {
        // ignore malformed storage
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function save(keys: ApiKeys) {
    onChange(keys);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  }

  function clearKeys() {
    onChange(EMPTY);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('wfr_api_keys_v2');
  }

  const hasAnyKey = Object.values(apiKeys).some(Boolean);

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2">
          <span>🔑</span>
          <span>API Keys</span>
          {hasAnyKey && (
            <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">
              Guardadas
            </span>
          )}
        </span>
        <span className="text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-[#2a2a2a] pt-3">
          <p className="text-xs text-gray-500">
            🔒 Tus keys se guardan solo en tu navegador. Nunca se envían a nuestros servidores.
          </p>

          {FIELDS.map(({ key, label, placeholder, hint }) => (
            <div key={key} className="space-y-1.5">
              <label className="text-xs text-gray-400">{label}</label>
              <div className="flex gap-2">
                <input
                  type={show[key] ? 'text' : 'password'}
                  placeholder={placeholder}
                  value={apiKeys[key]}
                  onChange={(e) => save({ ...apiKeys, [key]: e.target.value })}
                  className="flex-1 bg-[#0f0f0f] border border-[#333] rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <button
                  onClick={() => setShow((v) => ({ ...v, [key]: !v[key] }))}
                  className="px-3 py-2 text-gray-500 hover:text-gray-300 text-xs border border-[#333] rounded hover:border-[#555] transition-colors"
                >
                  {show[key] ? '🙈' : '👁️'}
                </button>
              </div>
              <p className="text-[11px] text-gray-600">{hint}</p>
            </div>
          ))}

          {hasAnyKey && (
            <button
              onClick={clearKeys}
              className="text-xs text-red-500 hover:text-red-400 transition-colors"
            >
              Borrar keys guardadas
            </button>
          )}
        </div>
      )}
    </div>
  );
}
