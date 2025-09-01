'use client';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

const ACCEPT = { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] } as const;

export type DropzoneProps = {
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  maxCount?: number;
};

export default function ImageDropzone({ disabled, onFiles, maxCount = 15 }: DropzoneProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (accepted: File[], rejected: any[]) => {
      setError(null);
      if (rejected?.length) {
        setError('Bazı dosyalar tür/limit nedeniyle reddedildi.');
      }
      if (accepted.length > maxCount) {
        setError(`En fazla ${maxCount} görsel yükleyebilirsiniz.`);
        accepted = accepted.slice(0, maxCount);
      }
      onFiles(accepted);
    },
    [maxCount, onFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT as any,
    multiple: true,
    maxFiles: maxCount,
  });

  return (
    <div {...getRootProps()} className={`rounded-2xl border border-dashed p-8 text-center ${isDragActive ? 'opacity-80' : ''} ${disabled ? 'opacity-50' : ''}`}>
      <input {...getInputProps()} disabled={disabled} />
      <p className="font-medium">Görselleri buraya sürükleyin veya tıklayın</p>
      <p className="text-sm">JPEG/PNG/WEBP • Maks. 15 görsel • Her biri sıkıştırma sonrası ≤1 MB</p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}