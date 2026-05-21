import { AIProvider, ApiKeys, PROVIDERS, StreamRequest, GenerateResult } from './types';
import { routeToProvider } from './router';

interface GenerateOptions {
  provider: AIProvider;
  apiKeys: ApiKeys;
  systemPrompt: string;
  userPrompt: string;
  images?: string[];
}

const KEY_LABELS: Record<keyof ApiKeys, string> = {
  anthropic: 'API key de Anthropic',
  openai: 'API key de OpenAI',
  openrouter: 'API key de OpenRouter',
};

function validateKey(provider: AIProvider, apiKeys: ApiKeys): string | null {
  const meta = PROVIDERS.find((p) => p.id === provider);
  if (!meta) return `Provider desconocido: ${provider}`;

  const key = apiKeys[meta.requiresKey];
  if (!key) {
    return `Ingresá tu ${KEY_LABELS[meta.requiresKey]} para usar ${meta.label}.`;
  }
  return null;
}

export function generate(opts: GenerateOptions): GenerateResult {
  const error = validateKey(opts.provider, opts.apiKeys);
  if (error) return { ok: false, error };

  try {
    const req: StreamRequest = {
      provider: opts.provider,
      apiKeys: opts.apiKeys,
      systemPrompt: opts.systemPrompt,
      userPrompt: opts.userPrompt,
      images: opts.images,
    };
    return { ok: true, stream: routeToProvider(req) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return { ok: false, error: msg };
  }
}
