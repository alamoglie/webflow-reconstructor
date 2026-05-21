'use client';

interface Props {
  frames: string[];
  label?: string;
}

export function FramePreview({ frames, label }: Props) {
  if (!frames.length) return null;

  return (
    <div className="space-y-2">
      {label && <p className="text-xs text-gray-400">{label}</p>}
      <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto">
        {frames.map((base64, i) => (
          <div
            key={i}
            className="aspect-video rounded overflow-hidden bg-[#0f0f0f] border border-[#2a2a2a]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/jpeg;base64,${base64}`}
              alt={`Frame ${i + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-600">{frames.length} frames extraídos</p>
    </div>
  );
}
