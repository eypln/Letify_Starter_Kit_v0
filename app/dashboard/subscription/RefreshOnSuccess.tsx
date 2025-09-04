'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/** Checkout dönüşünde, webhook yazmayı bitirene kadar sayfayı kısa süre yeniler. */
export default function RefreshOnSuccess() {
  const router = useRouter();
  const q = useSearchParams();

  useEffect(() => {
    const ok =
      q.get('success') === '1' ||
      q.get('status') === 'success' ||
      q.get('checkout') === 'success';
    if (!ok) return;

    // 1.5s aralıkla 9s boyunca refresh (webhook’un yazması için yeterli)
    const id = setInterval(() => router.refresh(), 1500);
    const stop = setTimeout(() => clearInterval(id), 9000);

    return () => {
      clearInterval(id);
      clearTimeout(stop);
    };
  }, [q, router]);

  return null; // hiçbir şey çizmez, görsel yok
}
