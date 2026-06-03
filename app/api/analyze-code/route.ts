import { NextRequest } from 'next/server';
import { AIProvider, ApiKeys } from '@/lib/ai/types';
import { generate } from '@/lib/ai/generate';
import { SYSTEM_PROMPT, buildCodePrompt } from '@/lib/prompts';

export async function POST(req: NextRequest) {
  const { files, provider, anthropicApiKey, openaiApiKey, googleApiKey, openrouterApiKey } =
    await req.json();

  if (!files || Object.keys(files).length === 0) {
    return new Response('No files provided', { status: 400 });
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
    userPrompt: buildCodePrompt(files),
  });

  if (!result.ok) {
    return new Response(result.error, { status: 400 });
  }

  return new Response(result.stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
