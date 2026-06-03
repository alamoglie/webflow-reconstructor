import { StreamRequest } from './types';
import { streamAnthropic } from './providers/anthropic';
import { streamOpenAI } from './providers/openai';
import { streamGemini } from './providers/gemini';
import { streamOpenRouter } from './providers/openrouter';

export function routeToProvider(req: StreamRequest): ReadableStream {
  switch (req.provider) {
    case 'anthropic':
      return streamAnthropic(req);
    case 'openai':
      return streamOpenAI(req);
    case 'gemini':
      return streamGemini(req);
    case 'gemini-or':
    case 'deepseek':
    case 'llama':
    case 'kimi':
      return streamOpenRouter(req);
    default: {
      const exhaustive: never = req.provider;
      throw new Error(`Provider desconocido: ${exhaustive}`);
    }
  }
}
