'use client';
import { useMemo } from 'react';
import { useWizardStore } from '@/lib/wizard/store';
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
  useStepMarker(4);
  const {
    jobId, listingId,
    reelsSelection, setReelsSelection,
    reelsStatus, reelsUrl, reelsError,
    startReels, finishReels, failReels, setStep, reelsTemplateId,
    startReelsShare
  } = useWizardStore();

  const images = useUploadStore((s) => s.images);
  const list = useMemo(() => images.filter(i => i.jobId === jobId), [images, jobId]);

  function toggle(path: string, url: string) {
    const idx = reelsSelection.findIndex(x => x.storagePath === path);
    if (idx >= 0) {
      const next = reelsSelection.slice();
      next.splice(idx, 1);
      setReelsSelection(next.map((x,i)=>({ ...x, order: (i+1) as any, name: String(i+1) })));
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
        const payload = {
          action: 'prepareReels',
          job: { id: jobId },
          listing: { id: listingId },
          images: reelsSelection
            .sort((a,b)=>a.order-b.order)
            .map(x => ({ order: x.order, storagePath: x.storagePath, name: x.name })),
          template_id: reelsTemplateId, // şimdilik null
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

        if (!videoUrl) throw new Error('Video URL bulunamadı');
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
      requestAnimationFrame(() => {
        document.getElementById('step-5')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      
      try {
        const payload = {
          action: 'postReelsFb',
          job: { id: jobId },
          listing: { id: listingId },
          reelVideoUrl: reelsUrl, // hazırlanan video URL'si
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
      <h3 className="text-lg font-semibold">4. Adım: Prepare Reels</h3>

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
        Tam olarak <b>5 görsel</b> seçin. Seçim sırası (1 → 5) videoda kullanılacaktır.
        n8n'e <code>name: "1".."5"</code> (uzantısız) ve <code>storagePath</code> gönderilir.
      </div>

      {/* Template grubu (şimdilik disabled) */}
      <div className="pointer-events-none rounded-xl border p-4 opacity-50">
        <div className="mb-2 text-sm font-medium">Template (yakında):</div>
        <div className="flex flex-wrap gap-2">
          {['Modern','Luxury','Classic','Traditional','Funny'].map((label) => (
            <button key={label} type="button" className="rounded-lg border px-3 py-1.5 text-sm">{label}</button>
          ))}
        </div>
      </div>

      {reelsStatus === 'idle' && (
        <div className="flex justify-end">
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
            Video hazırlanıyor… (~5 dk)
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
          <div className="text-sm text-green-700">Video hazır.</div>
          {reelsUrl ? (
            <div className="mt-2 flex items-center gap-3">
              <a href={reelsUrl} target="_blank" className="rounded-lg bg-green-600 px-3 py-2 text-sm text-white">Videoyu Gör</a>
              <button 
                type="button" 
                onClick={onNext}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
              >
                Uygun → 5. Adım
              </button>
            </div>
          ) : (
            <div className="mt-2 text-sm text-amber-700">Video URL bulunamadı; n8n yanıtını kontrol edin.</div>
          )}
        </div>
      )}

      {reelsStatus === 'error' && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4">
          <div className="text-sm text-red-700 mb-3">Bir hata oluştu: {reelsError}</div>
          
          {/* Manuel Video URL Set Butonu (Debug) */}
          <div className="text-xs text-gray-600 mb-2">
            Eğer workflow tamamlandıysa ve video linki varsa:
          </div>
          <button 
            type="button"
            onClick={() => {
              const url = 'https://drive.google.com/file/d/1fK3SImLQw2MRYfMS40A8v7AU0rJcv51I/view?usp=drivesdk';
              console.log('🔧 Manuel video URL set:', url);
              finishReels(url);
            }}
            className="rounded-lg bg-orange-500 px-3 py-2 text-sm text-white hover:bg-orange-600"
          >
            Manuel Video URL Set (Debug)
          </button>
        </div>
      )}
    </section>
  );
}