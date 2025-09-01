'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Step = 1 | 2 | 3 | 4 | 5;
export type PostStatus = 'idle' | 'running' | 'done' | 'error';

type WizardState = {
  listingId: string | null;
  jobId: string | null;
  jobStartedAt: number | null;   // CTA'ya basınca set edilir
  step: Step;

  postStatus: PostStatus;
  postUrl: string | null;
  postError: string | null;

  startFlow: () => void;                         // sayaç başlat + akışı sıfırla
  setListingId: (v: string | null) => void;
  setJobId: (v: string | null, startedAt?: number) => void; // existing startedAt korunur
  setStep: (s: Step) => void;

  startPost: () => void;
  finishPost: (url: string) => void;
  failPost: (err: string) => void;

  clear: () => void;
};

export const useWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      listingId: null,
      jobId: null,
      jobStartedAt: null,
      step: 1,

      postStatus: 'idle',
      postUrl: null,
      postError: null,

      startFlow: () =>
        set({
          listingId: null,
          jobId: null,
          jobStartedAt: Date.now(),   // ⏱ sayaç burada başlar
          step: 1,
          postStatus: 'idle',
          postUrl: null,
          postError: null,
        }),

      setListingId: (v) => set({ listingId: v }),
      setJobId: (v, startedAt) =>
        set((s) => ({
          jobId: v,
          jobStartedAt: s.jobStartedAt ?? (startedAt ?? Date.now()),
        })),
      setStep: (s) => set({ step: s }),

      startPost: () => set({ postStatus: 'running', postUrl: null, postError: null }),
      finishPost: (url) => set({ postStatus: 'done', postUrl: url ?? null }),
      failPost: (err) => set({ postStatus: 'error', postError: err }),

      clear: () =>
        set({
          listingId: null,
          jobId: null,
          jobStartedAt: null,
          step: 1,
          postStatus: 'idle',
          postUrl: null,
          postError: null,
        }),
    }),
    { name: 'letify-wizard', storage: createJSONStorage(() => sessionStorage) }
  )
);