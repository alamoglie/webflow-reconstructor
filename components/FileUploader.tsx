'use client';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { processZip } from '@/lib/zip-processor';
import { FramePreview } from './FramePreview';
import { ZipFiles } from '@/types';

interface Props {
  onCodeFiles: (files: ZipFiles) => void;
  onFrames: (frames: string[]) => void;
  onImages: (frames: string[]) => void;
  isProcessing: boolean;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.readAsDataURL(file);
  });
}

type UploadState =
  | { status: 'idle' }
  | { status: 'processing'; message: string }
  | { status: 'zip'; files: ZipFiles; name: string }
  | { status: 'video'; thumbnail: string; name: string; frames: string[] }
  | { status: 'images'; previews: string[]; names: string[] }
  | { status: 'error'; message: string };

export function FileUploader({ onCodeFiles, onFrames, onImages, isProcessing }: Props) {
  const [state, setState] = useState<UploadState>({ status: 'idle' });
  const [extractProgress, setExtractProgress] = useState(0);

  const handleFiles = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return;

      const first = acceptedFiles[0];
      const ext = first.name.split('.').pop()?.toLowerCase() || '';

      // ZIP
      if (ext === 'zip') {
        setState({ status: 'processing', message: 'Descomprimiendo archivos...' });
        try {
          const files = await processZip(first);
          setState({ status: 'zip', files, name: first.name });
          onCodeFiles(files);
        } catch (err) {
          setState({ status: 'error', message: (err as Error).message });
        }
        return;
      }

      // Video
      if (['mp4', 'webm', 'mov'].includes(ext)) {
        setState({ status: 'processing', message: 'Cargando ffmpeg.wasm...' });
        setExtractProgress(0);
        try {
          const { extractFrames } = await import('@/lib/video-processor');
          const frames = await extractFrames(first, 10, (p) => {
            setExtractProgress(p);
            if (p > 10)
              setState({ status: 'processing', message: `Extrayendo frames... ${p}%` });
          });
          if (!frames.length) throw new Error('No se pudieron extraer frames del video');
          setState({ status: 'video', thumbnail: frames[0], name: first.name, frames });
          onFrames(frames);
        } catch (err) {
          setState({ status: 'error', message: (err as Error).message });
        }
        return;
      }

      // Images
      if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
        setState({ status: 'processing', message: 'Procesando imágenes...' });
        try {
          const sorted = [...acceptedFiles].sort((a, b) =>
            a.name.localeCompare(b.name)
          );
          const base64s = await Promise.all(sorted.map(fileToBase64));
          setState({
            status: 'images',
            previews: base64s.slice(0, 8),
            names: sorted.map((f) => f.name),
          });
          onImages(base64s);
        } catch (err) {
          setState({ status: 'error', message: (err as Error).message });
        }
        return;
      }

      setState({ status: 'error', message: 'Tipo de archivo no soportado' });
    },
    [onCodeFiles, onFrames, onImages]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFiles,
    accept: {
      'application/zip': ['.zip'],
      'video/mp4': ['.mp4'],
      'video/webm': ['.webm'],
      'video/quicktime': ['.mov'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
    },
    multiple: true,
    disabled: isProcessing,
  });

  function reset() {
    setState({ status: 'idle' });
  }

  return (
    <div className="space-y-3">
      <label className="text-xs text-gray-400 uppercase tracking-wider">Archivo de entrada</label>

      {state.status === 'idle' || state.status === 'error' ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragActive
              ? 'border-indigo-500 bg-indigo-500/5'
              : 'border-[#2a2a2a] hover:border-[#444] bg-[#1a1a1a]'
          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="space-y-3">
            <div className="text-4xl">📁</div>
            <div>
              <p className="text-white font-medium">
                {isDragActive ? 'Soltá aquí...' : 'Arrastrá tu código, video o imágenes'}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                .zip, .mp4, .webm, .mov, .png, .jpg, .webp
              </p>
            </div>
          </div>
          {state.status === 'error' && (
            <p className="mt-3 text-red-400 text-sm">{state.message}</p>
          )}
        </div>
      ) : state.status === 'processing' ? (
        <div className="border-2 border-dashed border-indigo-500/40 rounded-xl p-8 text-center bg-indigo-500/5">
          <div className="space-y-3">
            <div className="animate-spin text-3xl">⚙️</div>
            <p className="text-indigo-300 text-sm">{state.message}</p>
            {extractProgress > 0 && (
              <div className="w-full bg-[#2a2a2a] rounded-full h-1.5 mt-2">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${extractProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      ) : state.status === 'zip' ? (
        <div className="border border-[#2a2a2a] rounded-xl p-4 bg-[#1a1a1a] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>📦</span>
              <span className="text-sm text-white font-medium">{state.name}</span>
            </div>
            <button onClick={reset} className="text-xs text-gray-500 hover:text-gray-300">
              Cambiar
            </button>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {Object.keys(state.files).map((filename) => (
              <div key={filename} className="flex items-center gap-2 text-xs text-gray-400">
                <span>📄</span>
                <span className="truncate">{filename}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600">
            {Object.keys(state.files).length} archivos detectados
          </p>
        </div>
      ) : state.status === 'video' ? (
        <div className="border border-[#2a2a2a] rounded-xl p-4 bg-[#1a1a1a] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>🎬</span>
              <span className="text-sm text-white font-medium">{state.name}</span>
            </div>
            <button onClick={reset} className="text-xs text-gray-500 hover:text-gray-300">
              Cambiar
            </button>
          </div>
          <FramePreview frames={state.frames} label={`${state.frames.length} frames extraídos`} />
        </div>
      ) : state.status === 'images' ? (
        <div className="border border-[#2a2a2a] rounded-xl p-4 bg-[#1a1a1a] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>🖼️</span>
              <span className="text-sm text-white font-medium">
                {state.names.length} imagen{state.names.length !== 1 ? 'es' : ''}
              </span>
            </div>
            <button onClick={reset} className="text-xs text-gray-500 hover:text-gray-300">
              Cambiar
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {state.previews.map((b64, i) => (
              <div
                key={i}
                className="aspect-video rounded overflow-hidden bg-[#0f0f0f] border border-[#2a2a2a]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/jpeg;base64,${b64}`}
                  alt={state.names[i]}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
          {state.names.length > 8 && (
            <p className="text-xs text-gray-600">+{state.names.length - 8} más</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
