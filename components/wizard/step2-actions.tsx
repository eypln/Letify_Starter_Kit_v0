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
  // Toast hook'u ekle
  const { toast } = require('@/components/ui/use-toast');

  function expired() {
    return !jobStartedAt || Date.now() - jobStartedAt > JOB_TTL_MS;
  }

  async function triggerPostInBackground() {
    let user = null, fb = null;
    let effectiveJobId = jobId;
    let effectiveListingId = listingId;
    try {
      const { data: u } = await supabase.auth.getUser();
      if (u?.user) {
        user = { id: u.user.id, email: u.user.email };
        if (!jobId) useWizardStore.getState().setJobId(u.user.id);
      }
      if (!effectiveJobId) {
        effectiveJobId = localStorage.getItem('letify_jobId') || '';
        if (effectiveJobId) useWizardStore.getState().setJobId(effectiveJobId);
      }
      if (!effectiveListingId) {
        effectiveListingId = localStorage.getItem('letify_listingId') || '';
        if (effectiveListingId) useWizardStore.getState().setListingId(effectiveListingId);
      }
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (!effectiveJobId) {
          effectiveJobId = params.get('jobId') ?? params.get('job_id') ?? params.get('id') ?? '';
          if (effectiveJobId) useWizardStore.getState().setJobId(effectiveJobId);
        }
        if (!effectiveListingId) {
          effectiveListingId = params.get('listingId') ?? params.get('listing_id') ?? '';
          if (effectiveListingId) useWizardStore.getState().setListingId(effectiveListingId);
        }
      }
      // Facebook entegrasyonunu Supabase'den çek
      const { data: integ } = await supabase
        .from('users_integrations')
        .select('fb_page_id, fb_access_token')
        .eq('user_id', user?.id)
        .maybeSingle();
      if (integ?.fb_page_id && integ?.fb_access_token) {
        fb = { pageId: integ.fb_page_id, accessToken: integ.fb_access_token };
      }

      const payload = {
        action: 'post',
        user,
        job: { id: effectiveJobId, kind: 'content' },
        listing: { id: effectiveListingId },
        images: images.filter(i => i.jobId === effectiveJobId)
          .map(i => ({ url: i.url, storagePath: i.storagePath })),
        fb,
      };
      // Debug: log outgoing payload
      console.log('🟢 [FE] Step2Actions - Sending payload to /api/workflows/post:', JSON.stringify(payload, null, 2));

      const res = await fetch('/api/workflows/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      // Debug: log response
      console.log('🟢 [FE] Step2Actions - Response from /api/workflows/post:', JSON.stringify(data, null, 2));

      if (!res.ok) throw new Error(data?.error || 'Workflow failed');

      const postUrl = data?.result?.post_url || data?.post_url || '';
      finishPost(postUrl);
      console.log('🎉 finishPost çağrıldı, postStatus done olmalı, postUrl:', postUrl);
      // Stepper'ı otomatik olarak 4. adıma geçirme! Kullanıcı Next'e basınca geçecek.
      setStep(3);
      if (!postUrl) {
        console.log('⚠️ n8n workflow başarısız, stepper 3. adımda kaldı.');
      }
    } catch (e: any) {
      console.log('❌ Post hatası:', e);
      failPost(e.message || 'unknown error');
      // Daha açıklayıcı toast
      const errorMsg = typeof e === 'string' ? e : (e?.message || 'Bilinmeyen hata');
      toast({
        title: 'Paylaşım Başarısız',
        description: `Facebook paylaşımı sırasında hata oluştu: ${errorMsg}. Lütfen tekrar deneyin veya sayfayı yenileyin.`,
        variant: 'destructive',
      });
      // Stepper'ı mevcut adımda tut
      setStep(3);
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