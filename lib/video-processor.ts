import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;

  const ffmpeg = new FFmpeg();
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(
      `${baseURL}/ffmpeg-core.wasm`,
      'application/wasm'
    ),
  });

  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.readAsDataURL(blob);
  });
}

export async function extractFrames(
  videoFile: File,
  frameCount = 10,
  onProgress?: (progress: number) => void
): Promise<string[]> {
  const ffmpeg = await getFFmpeg();

  onProgress?.(10);

  await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));

  onProgress?.(30);

  // Evenly distributed frames using select filter
  const interval = Math.max(1, Math.floor(30 / frameCount));
  await ffmpeg.exec([
    '-i', 'input.mp4',
    '-vf', `select=not(mod(n\\,${interval})),scale=1280:-1`,
    '-vsync', 'vfr',
    '-frames:v', String(frameCount),
    '-q:v', '3',
    'frame%03d.jpg',
  ]);

  onProgress?.(70);

  const frames: string[] = [];
  for (let i = 1; i <= frameCount; i++) {
    const frameNum = String(i).padStart(3, '0');
    try {
      const data = await ffmpeg.readFile(`frame${frameNum}.jpg`);
      const bytes = typeof data === 'string'
        ? new TextEncoder().encode(data)
        : (data as Uint8Array);
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'image/jpeg' });
      const base64 = await blobToBase64(blob);
      frames.push(base64);
    } catch {
      break;
    }
  }

  onProgress?.(100);
  return frames;
}

export async function getVideoThumbnail(videoFile: File): Promise<string> {
  const frames = await extractFrames(videoFile, 1);
  return frames[0] || '';
}
