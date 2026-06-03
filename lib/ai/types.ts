export type AIProvider =
  | 'anthropic'
  | 'openai'
  | 'gemini'
  | 'gemini-or'
  | 'deepseek'
  | 'llama'
  | 'kimi';

export type AIEngine = AIProvider | 'compare';

export interface ApiKeys {
  anthropic: string;
  openai: string;
  google: string; // Google AI Studio — Gemini directo
  openrouter: string; // DeepSeek, Llama, Kimi, Gemini vía OpenRouter
}

export interface ProviderMeta {
  id: AIProvider;
  label: string;
  model: string;
  icon: string;
  free: boolean;
  supportsVision: boolean;
  requiresKey: keyof ApiKeys;
}

export const PROVIDERS: ProviderMeta[] = [
  {
    id: 'anthropic',
    label: 'Claude',
    model: 'claude-opus-4-7',
    icon: '🟣',
    free: false,
    supportsVision: true,
    requiresKey: 'anthropic',
  },
  {
    id: 'openai',
    label: 'GPT-4o',
    model: 'gpt-4o',
    icon: '🟢',
    free: false,
    supportsVision: true,
    requiresKey: 'openai',
  },
  {
    id: 'gemini',
    label: 'Gemini Flash',
    // Google AI Studio directo — ver aistudio.google.com/apikey
    model: 'gemini-flash-latest',
    icon: '🔵',
    free: true,
    supportsVision: true,
    requiresKey: 'google',
  },
  {
    id: 'gemini-or',
    label: 'Gemini (OR)',
    // OpenRouter slug verificado: openrouter.ai/google/gemini-2.5-flash
    model: 'google/gemini-2.5-flash',
    icon: '🔷',
    free: false,
    supportsVision: true,
    requiresKey: 'openrouter',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek V4',
    // deepseek/deepseek-v4-flash: $0.11/$0.22 per 1M, 1M context, very fast
    model: 'deepseek/deepseek-v4-flash',
    icon: '🟠',
    free: false,
    supportsVision: false,
    requiresKey: 'openrouter',
  },
  {
    id: 'llama',
    label: 'Llama 3.3',
    // meta-llama/llama-3.3-70b-instruct:free — confirmed free tier
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    icon: '🦙',
    free: true,
    supportsVision: false,
    requiresKey: 'openrouter',
  },
  {
    id: 'kimi',
    label: 'Kimi K2',
    // moonshotai/kimi-k2.6: multimodal, code-focused, $0.73/$3.49 per 1M
    model: 'moonshotai/kimi-k2.6',
    icon: '🌙',
    free: false,
    supportsVision: true,
    requiresKey: 'openrouter',
  },
];

export interface StreamRequest {
  provider: AIProvider;
  apiKeys: ApiKeys;
  systemPrompt: string;
  userPrompt: string;
  images?: string[]; // base64 JPEG
}

export type GenerateResult =
  | { ok: true; stream: ReadableStream }
  | { ok: false; error: string };

/** Prefijo que el servidor escribe en el stream cuando ocurre un error mid-response */
export const STREAM_ERROR_PREFIX = '__STREAM_ERROR__:';
