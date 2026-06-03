import OpenAI from 'openai';
import { StreamRequest, PROVIDERS } from '../types';
import { streamFromAsyncIterable } from '../stream';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * Handles Gemini (OR), DeepSeek, Llama, and Kimi via the OpenRouter API.
 * OpenRouter exposes an OpenAI-compatible interface, so we reuse the OpenAI SDK
 * with a custom baseURL and the user's OpenRouter key.
 */
export function streamOpenRouter(req: StreamRequest): ReadableStream {
  const meta = PROVIDERS.find((p) => p.id === req.provider)!;

  const client = new OpenAI({
    apiKey: req.apiKeys.openrouter,
    baseURL: OPENROUTER_BASE_URL,
    defaultHeaders: {
      'HTTP-Referer': 'https://webflow-reconstructor.vercel.app',
      'X-Title': 'Webflow Reconstructor',
    },
  });

  const userContent: OpenAI.ChatCompletionContentPart[] =
    meta.supportsVision && req.images?.length
      ? [
          ...req.images.map(
            (img): OpenAI.ChatCompletionContentPartImage => ({
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${img}`,
                detail: 'high',
              },
            })
          ),
          { type: 'text', text: req.userPrompt },
        ]
      : [{ type: 'text', text: req.userPrompt }];

  async function* generate(): AsyncGenerator<string> {
    const stream = await client.chat.completions.create({
      model: meta.model,
      max_tokens: 8000,
      stream: true,
      messages: [
        { role: 'system', content: req.systemPrompt },
        { role: 'user', content: userContent },
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }

  return streamFromAsyncIterable(generate());
}
