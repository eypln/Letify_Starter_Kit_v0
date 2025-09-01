'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';

export type UploadedImage = {
  id: string;
  name: string;
  url: string;
  storagePath: string;
  size: number;
  width?: number;
  height?: number;
  jobId: string; // 👈 eklendi
};

interface UploadState {
  images: UploadedImage[];
  add: (img: Omit<UploadedImage, 'id'>) => void;
  remove: (id: string) => void;
  clear: () => void;
  clearJob: (jobId: string) => void; // 👈 Job-specific clear
}

export const useUploadStore = create<UploadState>()(
  persist(
    (set) => ({
      images: [],
      add: (img) => set((s) => ({ images: [...s.images, { id: uuid(), ...img }] })),
      remove: (id) => set((s) => ({ images: s.images.filter((i) => i.id !== id) })),
      clear: () => set({ images: [] }),
      clearJob: (jobId) => set((s) => ({ images: s.images.filter((i) => i.jobId !== jobId) })), // 👈 Job-specific clear
    }),
    { name: 'letify-upload-v1', storage: createJSONStorage(() => sessionStorage) }
  )
);