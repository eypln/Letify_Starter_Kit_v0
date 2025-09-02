'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Step = 1|2|3|4|5|6;
export type JobStatus = 'idle'|'running'|'done'|'error';
export type PostStatus = JobStatus;
export type ReelsImageSel = { order: 1|2|3|4|5; storagePath: string; url: string; name: string };

type WizardState = {
  listingId: string | null;
  jobId: string | null;
  jobStartedAt: number | null;   // CTA ile set
  step: Step;

  // Step 3 (Share a Post)
  postStatus: PostStatus;
  postUrl: string | null;
  postError: string | null;

  // Step 4 (Prepare Reels)
  reelsStatus: JobStatus;
  reelsUrl: string | null;
  reelsError: string | null;
  reelsSelection: ReelsImageSel[];
  reelsTemplateId: string | null;

  // Step 5 (Share Reels)
  reelsShareStatus: JobStatus;
  reelsShareUrl: string | null;
  reelsShareError: string | null;

  startFlow: () => void;
  setListingId: (v: string | null) => void;
  setJobId: (v: string | null, startedAt?: number) => void;
  setStep: (s: Step) => void;

  startPost: () => void;
  finishPost: (url: string) => void;
  failPost: (err: string) => void;

  setReelsSelection: (images: ReelsImageSel[]) => void;
  setReelsTemplate: (id: string | null) => void;
  startReels: () => void;
  finishReels: (url: string) => void;
  failReels: (err: string) => void;

  startReelsShare: () => void;
  finishReelsShare: (url: string) => void;
  failReelsShare: (err: string) => void;

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

      reelsStatus: 'idle',
      reelsUrl: null,
      reelsError: null,
      reelsSelection: [],
      reelsTemplateId: null,

      reelsShareStatus: 'idle',
      reelsShareUrl: null,
      reelsShareError: null,

      startFlow: () =>
        set({
          listingId: null,
          jobId: null,
          jobStartedAt: Date.now(),
          step: 1,
          postStatus: 'idle',
          postUrl: null,
          postError: null,
          reelsStatus: 'idle',
          reelsUrl: null,
          reelsError: null,
          reelsSelection: [],
          reelsTemplateId: null,
          reelsShareStatus: 'idle',
          reelsShareUrl: null,
          reelsShareError: null,
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

      setReelsSelection: (images) => set({ reelsSelection: images }),
      setReelsTemplate: (id) => set({ reelsTemplateId: id }),
      startReels: () => set({ reelsStatus: 'running', reelsUrl: null, reelsError: null }),
      finishReels: (url) => set({ reelsStatus: 'done', reelsUrl: url ?? null }),
      failReels: (err) => set({ reelsStatus: 'error', reelsError: err }),

      startReelsShare: () => set({ reelsShareStatus: 'running', reelsShareUrl: null, reelsShareError: null }),
      finishReelsShare: (url) => set({ reelsShareStatus: 'done', reelsShareUrl: url ?? null }),
      failReelsShare: (err) => set({ reelsShareStatus: 'error', reelsShareError: err }),

      clear: () =>
        set({
          listingId: null,
          jobId: null,
          jobStartedAt: null,
          step: 1,
          postStatus: 'idle',
          postUrl: null,
          postError: null,
          reelsStatus: 'idle',
          reelsUrl: null,
          reelsError: null,
          reelsSelection: [],
          reelsTemplateId: null,
          reelsShareStatus: 'idle',
          reelsShareUrl: null,
          reelsShareError: null,
        }),
    }),
    { name: 'letify-wizard', storage: createJSONStorage(() => sessionStorage) }
  )
);