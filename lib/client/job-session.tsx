'use client';
import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
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
  const [jobId, setJobIdState] = useState('');
  const [listingId, setListingIdState] = useState('');

  // URL -> state, yoksa localStorage -> URL
  useEffect(() => {
    const fromUrl = sp.get('jobId') ?? sp.get('job_id') ?? sp.get('id') ?? '';
    if (fromUrl) {
      setJobIdState(fromUrl);
      try { localStorage.setItem('letify_jobId', fromUrl); } catch {}
      return;
    }
    try {
      const j = localStorage.getItem('letify_jobId') || '';
      if (j) {
        setJobIdState(j);
        router.replace(`${pathname}?jobId=${j}`);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp, router, pathname]);

  // listingId senkronu
  useEffect(() => {
    try {
      const l = localStorage.getItem('letify_listingId') || '';
      if (l) setListingIdState(l);
    } catch {}
  }, []);

  const setJobId = (id: string) => {
    setJobIdState(id);
    try { localStorage.setItem('letify_jobId', id); } catch {}
    router.replace(`${pathname}?jobId=${id}`);
  };
  const setListingId = (id: string) => {
    setListingIdState(id);
    try { localStorage.setItem('letify_listingId', id); } catch {}
  };

  const clear = async ({hard=false}: {hard?:boolean} = {}) => {
    const jid = jobId || (typeof window !== 'undefined' ? localStorage.getItem('letify_jobId') || '' : '');
    const lid = listingId || (typeof window !== 'undefined' ? localStorage.getItem('letify_listingId') || '' : '');
    try {
      await fetch('/api/jobs/cancel', {
        method:'POST',
        headers:{'content-type':'application/json'},
        body: JSON.stringify({ jobId: jid, listingId: lid, hardDeleteListing: hard })
      });
    } catch {}
    try {
      localStorage.removeItem('letify_jobId');
      localStorage.removeItem('letify_listingId');
    } catch {}
    setJobIdState('');
    setListingIdState('');
  };

  const value = useMemo(() => ({jobId, listingId, setJobId, setListingId, clear}), [jobId, listingId]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useJobSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useJobSession must be used within JobSessionProvider');
  return ctx;
}

/** Guard: jobId yoksa false döner ve kullanıcıya uyarı verebilirsiniz */
export function getEffectiveJobId(): string {
  // URL
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const fromUrl = params.get('jobId') ?? params.get('job_id') ?? params.get('id');
  if (fromUrl) return fromUrl;
  // localStorage
  try { return localStorage.getItem('letify_jobId') || ''; } catch { return ''; }
}
