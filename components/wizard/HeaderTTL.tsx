'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useWizardStore } from '@/lib/wizard/store';
import { useUploadStore } from '@/lib/uploads/store';
import { useRouter } from 'next/navigation';
import { JOB_TTL_MS } from '@/lib/wizard/constants';

export default function HeaderTTL() {
  const router = useRouter();
  const { jobStartedAt, clear } = useWizardStore();
  const [now, setNow] = useState(() => Date.now());
  const firedRef = useRef(false);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef  = useRef<number | null>(null);

  const endFlow = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current)  clearTimeout(timeoutRef.current);
    clear();
    const clearUploads = useUploadStore.getState().clear;
    clearUploads();
    // Timer süresi dolduğunda doğrudan dashboard'a yönlendir ve expired=1 parametresini ekle
    router.replace('/dashboard?expired=1');
  }, [router, clear]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current)  clearTimeout(timeoutRef.current);
    if (!jobStartedAt) return;


    if (typeof window !== 'undefined') {
      intervalRef.current = window.setInterval(() => setNow(Date.now()), 1000);
      const msLeft = Math.max(0, JOB_TTL_MS - (Date.now() - jobStartedAt));
      timeoutRef.current = window.setTimeout(endFlow, msLeft);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current)  clearTimeout(timeoutRef.current);
    };
  }, [jobStartedAt, endFlow]); // clear/router stable

  if (!jobStartedAt) return null;

  const remaining = Math.max(0, JOB_TTL_MS - (now - jobStartedAt));
  const mm = String(Math.floor(remaining / 60000)).padStart(2, '0');
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
  const isLow = remaining < 120000;

  return (
    <div className="flex items-center gap-2">
      <span className={`text-sm ${isLow ? 'text-red-600' : 'text-gray-600'}`}>⏱ {mm}:{ss}</span>
      {/* Sadece Stop */}
      <button
        type="button"
        onClick={endFlow}
        className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
        title="Stop the flow and exit"
      >
        Stop
      </button>
    </div>
  );
}