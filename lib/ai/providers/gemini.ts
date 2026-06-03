import { StreamRequest, PROVIDERS } from '../types';
import { streamFromAsyncIterable } from '../stream';

const GEMINI_API_BASE =
  'https://generativelanguage.googleapis.com/v1beta/models';

const META = PROVIDERS.find((p) => p.id === 'gemini')!;

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

async function* parseGeminiSSE(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const json = trimmed.replace(/^data:\s*/, '');
      if (!json || json === '[DONE]') continue;

      try {
        const parsed = JSON.parse(json) as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
          error?: { message?: string };
        };

        if (parsed.error?.message) {
          throw new Error(parsed.error.message);
        }

        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) yield text;
      } catch (err) {
        if (err instanceof SyntaxError) continue;
        throw err;
      }
    }
  }
}

export function streamGemini(req: StreamRequest): ReadableStream {
  const apiKey = req.apiKeys.google;
  const model = META.model;

  const parts: GeminiPart[] = req.images?.length
    ? [
        ...req.images.map(
          (img): GeminiPart => ({
            inlineData: { mimeType: 'image/jpeg', data: img },
          })
        ),
        { text: req.userPrompt },
      ]
    : [{ text: req.userPrompt }];

  async function* generate(): AsyncGenerator<string> {
    const url = `${GEMINI_API_BASE}/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: req.systemPrompt }],
        },
        contents: [{ role: 'user', parts }],
        generationConfig: {
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      let message = errText || `Gemini API error ${res.status}`;
      try {
        const parsed = JSON.parse(errText) as {
          error?: { message?: string };
        };
        if (parsed.error?.message) message = parsed.error.message;
      } catch {
        // use raw text
      }
      throw new Error(message);
    }

    if (!res.body) throw new Error('Gemini API: empty response body');

    yield* parseGeminiSSE(res.body);
  }

  return streamFromAsyncIterable(generate());
}
