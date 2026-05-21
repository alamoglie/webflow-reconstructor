import { STREAM_ERROR_PREFIX } from './types';

/**
 * Converts an AsyncIterable<string> into a streaming ReadableStream<Uint8Array>.
 * On error, writes a detectable error prefix instead of calling controller.error(),
 * which would cause Next.js to abruptly close the connection ("failed to fetch").
 */
export function streamFromAsyncIterable(
  iterable: AsyncIterable<string>
): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of iterable) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        controller.enqueue(
          encoder.encode(`${STREAM_ERROR_PREFIX}${msg}`)
        );
        controller.close();
      }
    },
  });
}
