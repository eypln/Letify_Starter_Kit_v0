'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWizardStore } from './store';
import { useUploadStore } from '@/lib/uploads/store'; // 👈 useUploadStore'u içe aktar
import { JOB_TTL_MS } from './constants';

export function useJobGuard(expectedStep: 1|2|3|4|5) {
  const router = useRouter();
  const { jobId, jobStartedAt, setStep, clear } = useWizardStore();

  useEffect(() => {
    setStep(expectedStep);

    if (expectedStep === 1) return;

    if (!jobId || !jobStartedAt || Date.now() - jobStartedAt > JOB_TTL_MS) {
      clear();
      // 👇 Her iki store'u da temizle
      const clearUploads = useUploadStore.getState().clear;
      clearUploads();
      // TTL kontrolü başarısız olduğunda doğrudan dashboard'a yönlendir ve expired=1 parametresini ekle
      router.replace('/dashboard?expired=1');
    }
  }, [expectedStep, jobId, jobStartedAt, router, setStep, clear]);
}