'use client';
import { useEffect, useRef, useState } from 'react';
import { useWizardStore } from '@/lib/wizard/store';
import { useRouter } from 'next/navigation';

const JOB_TTL_MS = 15 * 60 * 1000; // 15 dk

export default function HeaderTTL() {
  const router = useRouter();
  const { jobStartedAt, clear } = useWizardStore();
  const [now, setNow] = useState(Date.now());
  const firedRef = useRef(false);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef  = useRef<number | null>(null);

  // 🔧 Hook'lar HER ZAMAN çağrılır; iş yapmayı içeride şartla kesiyoruz
  useEffect(() => {
    // Eski timerları temizle (StrictMode'da iki kez mount/cleanup olabilir)
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current)  clearTimeout(timeoutRef.current);

    if (!jobStartedAt) return; // akış başlamadıysa timer kurma

    intervalRef.current = window.setInterval(() => setNow(Date.now()), 1000);

    const msLeft = Math.max(0, JOB_TTL_MS - (Date.now() - jobStartedAt));
    timeoutRef.current = window.setTimeout(() => {
      if (firedRef.current) return;
      firedRef.current = true;
      clear();                           // state temizle
      router.replace('/dashboard?expired=1'); // yönlendir
    }, msLeft);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current)  clearTimeout(timeoutRef.current);
    };
  }, [jobStartedAt, clear, router]);

  // Görsel gösterim yoksa burada kesebiliriz (hook'lar yukarıda zaten çağrıldı)
  if (!jobStartedAt) return null;

  const remaining = Math.max(0, JOB_TTL_MS - (now - jobStartedAt));
  const mm = String(Math.floor(remaining / 60000)).padStart(2, '0');
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');

  return (
    <span className={`text-sm ${remaining < 120000 ? 'text-red-600' : 'text-gray-600'}`}>
      ⏱ {mm}:{ss}
    </span>
  );
}