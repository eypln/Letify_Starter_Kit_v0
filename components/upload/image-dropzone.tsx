'use client';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

const ACCEPT = { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] } as const;

export type DropzoneProps = {
  disabled?: boolean;
  onFilesAction: (files: File[]) => void;
  maxCount?: number;
};

export default function ImageDropzone({ disabled, onFilesAction, maxCount = 15 }: DropzoneProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (accepted: File[], rejected: any[]) => {
      setError(null);
      if (rejected?.length) {
        setError('Some files were rejected due to type or limit.');
      }
      if (accepted.length > maxCount) {
        setError(`You can upload up to ${maxCount} images.`);
        accepted = accepted.slice(0, maxCount);
      }
  onFilesAction(accepted);
    },
  [maxCount, onFilesAction]
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
      <p className="font-medium">Drag and drop images here or click to select</p>
      <p className="text-sm">JPEG/PNG/WEBP • Max. 15 images • Each ≤1 MB after compression</p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}