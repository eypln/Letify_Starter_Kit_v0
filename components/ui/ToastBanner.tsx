'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function Banner({ message, onClose }: { message: string; onClose?: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => onClose?.(), 4500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-3">
      <div className="mt-3 w-full max-w-3xl rounded-xl border bg-white/90 p-3 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">⚠️ {message}</div>
          <button 
            className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50" 
            onClick={onClose}
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

export function ExpiredBannerFromQuery() {
  const params = useSearchParams();
  const router = useRouter();
  const [show, setShow] = useState(params.get('expired') === '1');

  if (!show) return null;
  
  return (
    <Banner
      message="Akış zaman aşımına uğradı, lütfen linki tekrar yapıştırın."
      onClose={() => {
        setShow(false);
        // URL'den expired parametresini temizle
        const q = new URLSearchParams(Array.from(params.entries()));
        q.delete('expired');
        const newUrl = q.toString() ? `${window.location.pathname}?${q.toString()}` : window.location.pathname;
        router.replace(newUrl);
      }}
    />
  );
}