import { NextRequest } from 'next/server';
import { AIProvider, ApiKeys, PROVIDERS } from '@/lib/ai/types';
import { generate } from '@/lib/ai/generate';
import { SYSTEM_PROMPT, buildVisualPrompt } from '@/lib/prompts';

export async function POST(req: NextRequest) {
  const { frames, provider, anthropicApiKey, openaiApiKey, googleApiKey, openrouterApiKey } =
    await req.json();

  if (!frames || frames.length === 0) {
    return new Response('No frames provided', { status: 400 });
  }

  const providerMeta = PROVIDERS.find((p) => p.id === provider);
  if (!providerMeta?.supportsVision) {
    return new Response(
      `${providerMeta?.label ?? provider} no soporta análisis visual. Subí un ZIP con código en su lugar.`,
      { status: 400 }
    );
  }

  const apiKeys: ApiKeys = {
    anthropic: anthropicApiKey ?? '',
    openai: openaiApiKey ?? '',
    google: googleApiKey ?? '',
    openrouter: openrouterApiKey ?? '',
  };

  const result = generate({
    provider: provider as AIProvider,
    apiKeys,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildVisualPrompt(frames.length),
    images: frames,
  });

  if (!result.ok) {
    return new Response(result.error, { status: 400 });
  }

  return new Response(result.stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
