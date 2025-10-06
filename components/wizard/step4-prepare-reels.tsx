"use client";
import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useWizardStore } from '@/lib/wizard/store';
import { getListingInfoByJobId } from '@/lib/wizard/getListingInfo';
import { useUploadStore } from '@/lib/uploads/store';
import { useStepMarker } from '@/lib/wizard/useStepMarker';

function Thumb({ src, selectedOrder, onClick }:{
  src: string; selectedOrder?: number; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={`relative rounded-xl border p-1 ${selectedOrder ? 'ring-2 ring-blue-600' : ''}`}>
      <img src={src} alt="" className="h-28 w-40 rounded-lg object-cover" />
      {selectedOrder ? (
        <span className="absolute -top-2 -left-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
          {selectedOrder}
        </span>
      ) : null}
    </button>
  );
}

export default function Step4PrepareReels() {
  const router = useRouter();
  useStepMarker(4);
  // Tüm state ve setter'lar tek seferde destructure edildi
  const {
    jobId,
    listingId,
    sourceUrl,
    setSourceUrl,
    setListingId,
    reelsSelection,
    setReelsSelection,
    reelsStatus,
    reelsUrl,
    reelsError,
    startReels,
    finishReels,
    failReels,
    setStep,
    reelsTemplateId,
    startReelsShare
  } = useWizardStore();

  // user ve fb state'ini localde tutmak için

  async function ensureCriticalData() {
    let effectiveJobId = jobId;
    let effectiveListingId = listingId;
    let effectiveSourceUrl = sourceUrl;
    if (typeof window !== 'undefined') {
      effectiveJobId = effectiveJobId || localStorage.getItem('letify_jobId') || '';
      effectiveListingId = effectiveListingId || localStorage.getItem('letify_listingId') || '';
      effectiveSourceUrl = effectiveSourceUrl || localStorage.getItem('letify_sourceUrl') || '';
    }
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      if ((!effectiveListingId || !effectiveSourceUrl) && supabase) {
        if (effectiveSourceUrl && !effectiveListingId) {
          const { data: listing } = await supabase
            .from('listings')
            .select('id')
            .eq('property_url', effectiveSourceUrl)
            .maybeSingle();
          if (listing?.id) {
            setListingId(listing.id);
            if (typeof window !== 'undefined') localStorage.setItem('letify_listingId', listing.id);
          }
        } else if (!effectiveSourceUrl && effectiveListingId) {
          const { data: listing } = await supabase
            .from('listings')
            .select('property_url')
            .eq('id', effectiveListingId)
            .maybeSingle();
          if (listing?.property_url) {
            setSourceUrl(listing.property_url);
            if (typeof window !== 'undefined') localStorage.setItem('letify_sourceUrl', listing.property_url);
          }
        }
      }
      if (typeof window !== 'undefined') {
        if (effectiveListingId) localStorage.setItem('letify_listingId', effectiveListingId);
        if (effectiveSourceUrl) localStorage.setItem('letify_sourceUrl', effectiveSourceUrl);
      }
    } catch {}
  }

  React.useEffect(() => {
    ensureCriticalData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const images = useUploadStore((s) => s.images);
  const list = useMemo(() => images.filter(i => i.jobId === jobId), [images, jobId]);

  function toggle(path: string, url: string) {
    const idx = reelsSelection.findIndex((x: { storagePath: string }) => x.storagePath === path);
    if (idx >= 0) {
      const next = reelsSelection.slice();
      next.splice(idx, 1);
      setReelsSelection(next.map((x, i) => ({ ...x, order: (i + 1) as 1|2|3|4|5, name: String(i + 1) })));
    } else {
      if (reelsSelection.length >= 5) return;
      const order = (reelsSelection.length + 1) as 1|2|3|4|5;
      setReelsSelection([...reelsSelection, { order, storagePath: path, url, name: String(order) }]);
    }
  }

  // Step 5'e geçiş ve reels share workflow başlatma
  async function onNext() {
    // Eğer reels status 'idle' ise, önce reels hazırla
    if (reelsStatus === 'idle') {
      startReels();
      try {
        // Supabase'den user ve fb entegrasyonunu çek
        let user = null, fb = null;
        let supabase;
        try {
          const { createClient } = await import('@/lib/supabase/client');
          supabase = createClient();
          const { data: u } = await supabase.auth.getUser();
          if (u?.user) user = { id: u.user.id, email: u.user.email };
          // user full_name ekle
          if (user && user.id && !(user as any).full_name) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', user.id)
              .maybeSingle();
            if (profile?.full_name) {
              (user as any).full_name = profile.full_name;
            }
          }
          const { data: integ } = await supabase
            .from('users_integrations')
            .select('fb_page_id, fb_access_token')
            .eq('user_id', u?.user?.id)
            .maybeSingle();
          if (integ?.fb_page_id && integ?.fb_access_token) {
            fb = { pageId: integ.fb_page_id, accessToken: integ.fb_access_token };
          }
        } catch {}

        // Seçilen görsellerin public url'lerini ekle
        if (!supabase) {
          const { createClient } = await import('@/lib/supabase/client');
          supabase = createClient();
        }
        // --- listingId/sourceUrl fallback: Supabase'den jobId ile garanti altına al ---
      const { sourceUrl: effectiveSourceUrl, listingId: effectiveListingId } = await getListingInfoByJobId(jobId ?? undefined);
        const imagesWithUrls = await Promise.all(
          reelsSelection
            .sort((a,b)=>a.order-b.order)
            .map(async x => ({
              order: x.order,
              storagePath: x.storagePath,
              name: x.name,
              url: supabase.storage.from('user_uploads').getPublicUrl(x.storagePath).data.publicUrl
            }))
        );
        const payload = {
          action: 'prepareReels',
          job: { id: jobId },
          listing: { id: effectiveListingId, sourceUrl: effectiveSourceUrl },
          images: imagesWithUrls,
          template_id: reelsTemplateId, // şimdilik null
          user, // Artık full_name ile
          fb,
        };
        const url = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL!;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          mode: 'cors',
          body: JSON.stringify(payload),
        });

        const ct = res.headers.get('content-type') || '';
        let data: any;
        if (ct.includes('application/json')) {
          data = await res.json();
        } else {
          const text = await res.text();
          try { data = JSON.parse(text); } catch { data = { raw: text }; }
        }
        if (!res.ok) throw new Error(data?.error || 'Workflow failed');

        const videoUrl =
          data?.result?.reelPreviewUrl ||
          data?.reelPreviewUrl ||
          data?.video_url || data?.googleDriveUrl || data?.driveUrl || data?.url;

        if (!videoUrl) throw new Error('videoUrl missing in response');
        finishReels(videoUrl);
      } catch (e: any) {
        failReels(e.message || 'unknown error');
      }
      return;
    }
    
    // Eğer reels hazır ise, Step 5'e geç ve share workflow başlat
    if (reelsStatus === 'done' && reelsUrl) {
      setStep(5);
      startReelsShare();

      // Step 5'e smooth scroll
      if (typeof window !== 'undefined') {
        requestAnimationFrame(() => {
          document.getElementById('step-5')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }

      try {
        // Supabase'den user ve fb entegrasyonunu çek
        let user = null, fb = null;
        let supabase;
        try {
          const { createClient } = await import('@/lib/supabase/client');
          supabase = createClient();
          const { data: u } = await supabase.auth.getUser();
          if (u?.user) user = { id: u.user.id, email: u.user.email };
          // user full_name ekle
          if (user && user.id && !(user as any).full_name) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', user.id)
              .maybeSingle();
            if (profile?.full_name) {
              (user as any).full_name = profile.full_name;
            }
          }
          const { data: integ } = await supabase
            .from('users_integrations')
            .select('fb_page_id, fb_access_token')
            .eq('user_id', u?.user?.id)
            .maybeSingle();
          if (integ?.fb_page_id && integ?.fb_access_token) {
            fb = { pageId: integ.fb_page_id, accessToken: integ.fb_access_token };
          }
        } catch {}

        // --- listingId/sourceUrl fallback: Supabase'den jobId ile garanti altına al ---
  const { sourceUrl: effectiveSourceUrl, listingId: effectiveListingId } = await getListingInfoByJobId(jobId ?? undefined);
        const payload = {
          action: 'postReelsFb',
          job: { id: jobId },
          listing: { id: effectiveListingId, sourceUrl: effectiveSourceUrl },
          reelVideoUrl: reelsUrl, // hazırlanan video URL'si
          user,
          fb,
        };

        const url = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL!;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          mode: 'cors',
          body: JSON.stringify(payload),
        });

        // Güvenli parse
        const ct = res.headers.get('content-type') || '';
        let data: any;
        if (ct.includes('application/json')) {
          data = await res.json();
        } else {
          const text = await res.text();
          try { data = JSON.parse(text); } catch { data = { raw: text }; }
        }

        if (!res.ok) throw new Error(data?.error || 'Reels share workflow failed');

        // Reels share URL'sini çıkar
        const shareUrl =
          data?.result?.reelsShareUrl ||
          data?.reelsShareUrl ||
          data?.facebook_url || data?.fbUrl || data?.url;

        // Step 5 component'inde handle edilecek
        const { finishReelsShare } = useWizardStore.getState();
        if (shareUrl) {
          finishReelsShare(shareUrl);
        } else {
          finishReelsShare(''); // URL yok ama başarılı
        }
      } catch (e: any) {
        const { failReelsShare } = useWizardStore.getState();
        failReelsShare(e.message || 'unknown error');
      }
    }
  }

  const canStart = reelsSelection.length === 5;

  return (
    <section id="step-4" className="space-y-4">
      <h3 className="text-lg font-semibold">Step 4: Prepare Reels</h3>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {list.map((img) => {
          const sel = reelsSelection.find(x => x.storagePath === img.storagePath);
          return (
            <Thumb
              key={img.storagePath}
              src={img.url}
              selectedOrder={sel?.order}
              onClick={() => toggle(img.storagePath, img.url)}
            />
          );
        })}
      </div>

      <div className="text-xs text-gray-600">
        Please select <b>5 images</b>. The selection order (1 → 5) will be used in the video.
      </div>

      {/* Template group (coming soon) */}
      <div className="pointer-events-none rounded-xl border p-4 opacity-50">
        <div className="mb-2 text-sm font-medium">Template (coming soon):</div>
        <div className="flex flex-wrap gap-2">
          {['Modern','Luxury','Classic','Traditional','Funny'].map((label) => (
            <button key={label} type="button" className="rounded-lg border px-3 py-1.5 text-sm">{label}</button>
          ))}
        </div>
      </div>

      {reelsStatus === 'idle' && (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              // Reset all: clear localStorage and store, go to step 1
              if (typeof window !== 'undefined') {
                try {
                  localStorage.removeItem('letify_jobId');
                  localStorage.removeItem('letify_listingId');
                } catch {}
              }
              useWizardStore.setState({ jobId: '', listingId: '', jobStartedAt: undefined });
              // 👇 Her iki store'u da temizle
              const clearWizard = useWizardStore.getState().clear;
              clearWizard();
              const clearUploads = useUploadStore.getState().clear;
              clearUploads();
              // Reset All butonuna basıldığında doğrudan dashboard'a yönlendir ve expired=1 parametresini ekle
              router.replace('/dashboard?expired=1');
            }}
            className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Reset All
          </button>
          <button
            type="button"
            disabled={!canStart}
            onClick={onNext}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Next
          </button>
        </div>
      )}

      {reelsStatus === 'running' && (
        <div className="rounded-xl border p-6">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.2" />
              <path d="M4 12a8 8 0 0 1 8-8" fill="none" stroke="currentColor" strokeWidth="4" />
            </svg>
            Video is being prepared… (~5 min)
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded bg-gray-200">
            <div className="h-full w-1/3 animate-[progress_1.2s_linear_infinite] bg-gray-500" />
          </div>
          <style jsx>{`
            @keyframes progress {
              0% { transform: translateX(-100%); }
              50% { transform: translateX(50%); }
              100% { transform: translateX(200%); }
            }
          `}</style>
        </div>
      )}

      {reelsStatus === 'done' && (
        <div className="rounded-xl border p-6">
          <div className="text-sm text-green-700">Video is ready.</div>
          {reelsUrl ? (
            <div className="mt-2 flex items-center gap-3">
              <a href={reelsUrl} target="_blank" className="rounded-lg bg-green-600 px-3 py-2 text-sm text-white">View Video</a>
              <button
                type="button"
                onClick={() => {
                  // Tümünü Temizle: localStorage ve store’u sıfırla, doğrudan dashboard'a yönlendir
                  if (typeof window !== 'undefined') {
                    try {
                      localStorage.removeItem('letify_jobId');
                      localStorage.removeItem('letify_listingId');
                    } catch {}
                  }
                  useWizardStore.setState({ jobId: '', listingId: '' });
                  // 👇 Her iki store'u da temizle
                  const clearWizard = useWizardStore.getState().clear;
                  clearWizard();
                  const clearUploads = useUploadStore.getState().clear;
                  clearUploads();
                  // Reset All butonuna basıldığında doğrudan dashboard'a yönlendir ve expired=1 parametresini ekle
                  router.replace('/dashboard?expired=1');
                }}
                className="rounded-lg border px-3 py-2 text-sm text-gray-700 bg-white hover:bg-gray-50"
              >
                Reset All
              </button>
              <button 
                type="button" 
                onClick={onNext}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
              >
                Proceed → Step 5
              </button>
            </div>
          ) : (
            <div className="mt-2 text-sm text-amber-700">Video URL not found; check n8n response.</div>
          )}
        </div>
      )}

      {reelsStatus === 'error' && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4">
          <div className="text-sm text-red-700 mb-3">An error occurred: {reelsError}</div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                // Reset all: clear localStorage and store, go to step 1
                if (typeof window !== 'undefined') {
                  try {
                    localStorage.removeItem('letify_jobId');
                    localStorage.removeItem('letify_listingId');
                  } catch {}
                }
                useWizardStore.setState({ jobId: '', listingId: '', jobStartedAt: undefined });
                // Reset All butonuna basıldığında doğrudan dashboard'a yönlendir ve expired=1 parametresini ekle
                router.replace('/dashboard?expired=1');
              }}
              className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Reset All
            </button>
          </div>
        </div>
      )}
    </section>
  );
}