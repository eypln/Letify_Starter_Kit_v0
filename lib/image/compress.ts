'use client';
import imageCompression, { Options } from 'browser-image-compression';

export async function compressImageTo1MB(file: File): Promise<File> {
  const options: Options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    initialQuality: 0.8,
    alwaysKeepResolution: false,
    fileType: file.type as any,
  };
  // Kütüphane <=1MB garanti etmeyebilir; döngü ile hedefe yaklaş.
  let current = file;
  for (let i = 0; i < 3; i++) {
    // 3 deneme: kaliteyi kademeli düşür
    const q = Math.max(0.4, options.initialQuality! - i * 0.15);
    const f = await imageCompression(current, { ...options, initialQuality: q });
    if (f.size <= 1024 * 1024) return f as File;
    current = f as File;
  }
  return current as File; // son halini döndür
}