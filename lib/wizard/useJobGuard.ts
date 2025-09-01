'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWizardStore } from './store';
import { JOB_TTL_MS } from './constants';

export function useJobGuard(expectedStep: 1|2|3|4|5) {
  const router = useRouter();
  const { jobId, jobStartedAt, setStep, clear } = useWizardStore();

  useEffect(() => {
    setStep(expectedStep);

    if (expectedStep === 1) return;

    if (!jobId || !jobStartedAt || Date.now() - jobStartedAt > JOB_TTL_MS) {
      clear();
      router.replace('/dashboard?expired=1'); // <-- değişti
    }
  }, [expectedStep, jobId, jobStartedAt, router, setStep, clear]);
}