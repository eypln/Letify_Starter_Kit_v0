'use client';
import { useRouter } from 'next/navigation';
import { useWizardStore } from '@/lib/wizard/store';
import { getEffectiveJobId } from '@/lib/client/job-session';
import { JOB_TTL_MS } from '@/lib/wizard/constants';
import { createClient } from '@/lib/supabase/client';
import { useUploadStore } from '@/lib/uploads/store';
import { useState } from 'react';

export default function Step2Actions() {
  const router = useRouter();
  const supabase = createClient();
  const { images, clear: clearUploads } = useUploadStore();
  const {
    jobStartedAt, listingId,
    startPost, finishPost, failPost, setStep, clear,
  } = useWizardStore();
  const jobId = getEffectiveJobId();
  const [busy, setBusy] = useState(false);

  function expired() {
    return !jobStartedAt || Date.now() - jobStartedAt > JOB_TTL_MS;
  }

  async function triggerPostInBackground() {
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const res = await fetch('/api/workflows/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'post',                         // <-- ÖNEMLİ
          user: user ? { id: user.id, email: user.email } : null,
          job: { id: jobId, kind: 'content' },
          listing: { id: listingId },
          images: images.filter(i => i.jobId === jobId)
                        .map(i => ({ url: i.url, storagePath: i.storagePath })),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Workflow failed');

      const postUrl = data?.result?.post_url || data?.post_url || '';
      console.log('🔍 n8n response:', { data, postUrl, hasPostUrl: !!postUrl });
      
      finishPost(postUrl);
      console.log('🎉 finishPost çağrıldı, postStatus done olmalı');
    } catch (e: any) {
      console.log('❌ Post hatası:', e);
      failPost(e.message || 'unknown error');
    } finally {
      setBusy(false);
    }
  }

  function onStartPost() {
    // TTL kontrolü + redirect
    if (expired()) {
      clear();
      router.replace('/dashboard?expired=1');
      return;
    }
    if (!jobId) return;

    setBusy(true);
    startPost();     // state: running
    setStep(3);      // 👈 Stepper 3. adıma geçsin, ekranda kalacağız
    void triggerPostInBackground(); // 👈 n8n beklemeden arka planda tetikle
  }

  return (
    <div className="mt-4 flex items-center justify-end gap-3">
      <button
        type="button"
        className="rounded-xl border px-4 py-2 text-sm"
        onClick={() => {
          clearUploads();
          setStep(1);
          router.replace('/dashboard/new-post');
        }}
      >
        Tümünü Temizle
      </button>

      <button
        type="button"
        disabled={busy || !jobId || images.filter(i => i.jobId === jobId).length === 0}
        onClick={onStartPost}
        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {busy ? 'Başlatılıyor...' : 'Start Post'}
      </button>
    </div>
  );
}