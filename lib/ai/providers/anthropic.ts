import Anthropic from '@anthropic-ai/sdk';
import { StreamRequest, PROVIDERS } from '../types';
import { streamFromAsyncIterable } from '../stream';

const META = PROVIDERS.find((p) => p.id === 'anthropic')!;

export function streamAnthropic(req: StreamRequest): ReadableStream {
  const client = new Anthropic({ apiKey: req.apiKeys.anthropic });

  const messages: Anthropic.MessageParam[] = req.images?.length
    ? [
        {
          role: 'user',
          content: [
            ...req.images.map(
              (img): Anthropic.ImageBlockParam => ({
                type: 'image',
                source: { type: 'base64', media_type: 'image/jpeg', data: img },
              })
            ),
            { type: 'text', text: req.userPrompt },
          ],
        },
      ]
    : [{ role: 'user', content: req.userPrompt }];

  async function* generate(): AsyncGenerator<string> {
    const stream = client.messages.stream({
      model: META.model,
      max_tokens: 8000,
      system: [
        {
          type: 'text',
          text: req.systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text;
      }
    }
  }

  return streamFromAsyncIterable(generate());
}
