'use client';
import React, {createContext, useContext, useEffect, useMemo, useState, useCallback} from 'react';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';

type JobSession = {
  jobId: string;
  listingId: string;
  setJobId: (id: string) => void;
  setListingId: (id: string) => void;
  clear: (opts?: {hard?: boolean}) => Promise<void>;
};

const Ctx = createContext<JobSession | null>(null);

export function JobSessionProvider({children}:{children: React.ReactNode}) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // Initialize state from URL or localStorage
  const [jobId, setJobIdState] = useState(() => {
    const fromUrl = sp.get('jobId') ?? sp.get('job_id') ?? sp.get('id') ?? '';
    if (fromUrl) {
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('letify_jobId', fromUrl); } catch {}
      }
      return fromUrl;
    }
    if (typeof window !== 'undefined') {
      try { return localStorage.getItem('letify_jobId') || ''; } catch { return ''; }
    }
    return '';
  });
  
  const [listingId, setListingIdState] = useState(() => {
    if (typeof window !== 'undefined') {
      try { return localStorage.getItem('letify_listingId') || ''; } catch { return ''; }
    }
    return '';
  });

  // Sync URL when jobId changes from localStorage
  useEffect(() => {
    const fromUrl = sp.get('jobId') ?? sp.get('job_id') ?? sp.get('id') ?? '';
    if (!fromUrl && jobId) {
      router.replace(`${pathname}?jobId=${jobId}`);
    }
  }, [sp, router, pathname, jobId]);

  const setJobId = useCallback((id: string) => {
    setJobIdState(id);
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('letify_jobId', id); } catch {}
    }
    router.replace(`${pathname}?jobId=${id}`);
  }, [router, pathname]);
  
  const setListingId = useCallback((id: string) => {
    setListingIdState(id);
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('letify_listingId', id); } catch {}
    }
  }, []);

  const clear = useCallback(async ({hard=false}: {hard?:boolean} = {}) => {
    const jid = jobId || (typeof window !== 'undefined' ? localStorage.getItem('letify_jobId') || '' : '');
    const lid = listingId || (typeof window !== 'undefined' ? localStorage.getItem('letify_listingId') || '' : '');
    try {
      await fetch('/api/jobs/cancel', {
        method:'POST',
        headers:{'content-type':'application/json'},
        body: JSON.stringify({ jobId: jid, listingId: lid, hardDeleteListing: hard })
      });
    } catch {}
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('letify_jobId');
        localStorage.removeItem('letify_listingId');
      } catch {}
    }
    setJobIdState('');
    setListingIdState('');
  }, [jobId, listingId]);

  const value = useMemo(() => ({jobId, listingId, setJobId, setListingId, clear}), [jobId, listingId, setJobId, setListingId, clear]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useJobSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useJobSession must be used within JobSessionProvider');
  return ctx;
}

/** Guard: jobId yoksa false döner ve kullanıcıya uyarı verebilirsiniz */
export function getEffectiveJobId(): string {
  if (typeof window === 'undefined') return '';
  // URL
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('jobId') ?? params.get('job_id') ?? params.get('id');
  if (fromUrl) return fromUrl;
  // localStorage
  try { return localStorage.getItem('letify_jobId') || ''; } catch { return ''; }
}
