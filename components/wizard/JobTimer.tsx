'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useWizardStore } from '@/lib/wizard/store';
import { JOB_TTL_MS } from '@/lib/wizard/constants';

export default function JobTimer({ onExpireAction }: { onExpireAction: () => void }) {
  const jobId = useWizardStore((s) => s.jobId);
  const startedAt = useWizardStore((s) => s.jobStartedAt);
  const [now, setNow] = useState(Date.now());
  const firedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!jobId || !startedAt) return;
    intervalRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobId, startedAt]);

  const remaining = useMemo(() => {
    if (!jobId || !startedAt) return 0;
    return Math.max(0, JOB_TTL_MS - (now - startedAt));
  }, [jobId, startedAt, now]);

  useEffect(() => {
        onExpireAction();
    if (remaining === 0 && !firedRef.current) {
      firedRef.current = true;               // 👈 sadece 1 kez
      if (intervalRef.current) clearInterval(intervalRef.current);
      // expire bilgisini dışarıya bildir
  onExpireAction();
    }
  }, [remaining, onExpireAction, jobId, startedAt]);

  const mmss = useMemo(() => {
    const m = Math.floor(remaining / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [remaining]);

  if (!jobId || !startedAt) return null;

  return (
    <div className="text-xs text-gray-600">
      Job Timer: <span className={remaining < 2 * 60 * 1000 ? 'text-red-600' : ''}>{mmss}</span>
    </div>
  );
}