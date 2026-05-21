import OpenAI from 'openai';
import { StreamRequest, PROVIDERS } from '../types';
import { streamFromAsyncIterable } from '../stream';

const META = PROVIDERS.find((p) => p.id === 'openai')!;

export function streamOpenAI(req: StreamRequest): ReadableStream {
  const client = new OpenAI({ apiKey: req.apiKeys.openai });

  const userContent: OpenAI.ChatCompletionContentPart[] = req.images?.length
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
      model: META.model,
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
