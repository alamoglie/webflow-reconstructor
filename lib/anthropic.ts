import Anthropic from '@anthropic-ai/sdk';

export function createAnthropicClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

export async function* streamAnthropicAnalysis(
  client: Anthropic,
  messages: Anthropic.MessageParam[],
  systemPrompt: string
): AsyncGenerator<string> {
  const stream = client.messages.stream({
    model: 'claude-opus-4-7',
    max_tokens: 8000,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages,
    thinking: { type: 'adaptive' },
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
