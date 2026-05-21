import OpenAI from 'openai';
import { SYSTEM_PROMPT } from './prompts';

export function createOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
}

export async function* streamOpenAIAnalysis(
  client: OpenAI,
  userContent: OpenAI.ChatCompletionContentPart[] | string
): AsyncGenerator<string> {
  const stream = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 8000,
    stream: true,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: userContent as OpenAI.ChatCompletionUserMessageParam['content'],
      },
    ],
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}
