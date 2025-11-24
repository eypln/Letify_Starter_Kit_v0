'use client';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useWizardStore } from '@/lib/wizard/store';
import { useUploadStore } from '@/lib/uploads/store';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { JOB_TTL_MS } from '@/lib/wizard/constants';
import { getListingInfoByJobId } from '@/lib/wizard/getListingInfo';

export default function Step2Actions() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const { images } = useUploadStore();
  const {
    jobId,
    setListingId,
    setSourceUrl,
    jobStartedAt,
    clear,
    setStep,
    startPost,
    finishPost,
    failPost,
  } = useWizardStore();

  // jobId'yi localStorage'dan çek (fallback)
  useEffect(() => {
    async function ensureListingIdAndSourceUrl() {
      if (jobId) {
        const { listingId: fetchedListingId, sourceUrl: fetchedSourceUrl } = await getListingInfoByJobId(jobId);
        if (fetchedListingId) setListingId(fetchedListingId);
        if (fetchedSourceUrl) setSourceUrl(fetchedSourceUrl);
        if (typeof window !== 'undefined') {
          if (fetchedListingId) localStorage.setItem('letify_listingId', fetchedListingId);
          if (fetchedSourceUrl) localStorage.setItem('letify_sourceUrl', fetchedSourceUrl);
        }
      }
    }
    ensureListingIdAndSourceUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function expired() {
    return !jobStartedAt || Date.now() - jobStartedAt > JOB_TTL_MS;
  }

  async function triggerPostInBackground() {
    let user = null, fb = null;
    // jobId'yi SSR/CSR uyumlu şekilde kullan
    const jobIdToUse = jobId || '';
    // Her payload öncesi, Supabase fallback ile sourceUrl ve listingId'yi garanti altına al
    const { sourceUrl: effectiveSourceUrl, listingId: effectiveListingId } = await getListingInfoByJobId(jobIdToUse);
    console.log('[Step2Actions] jobId:', jobIdToUse, 'sourceUrl:', effectiveSourceUrl, 'listingId:', effectiveListingId);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (u?.user) {
        user = { id: u.user.id, email: u.user.email };
      }
      // Fetch Facebook integration from Supabase
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
        job: { id: jobId, kind: 'content' },
        listing: {
          id: effectiveListingId,
          sourceUrl: effectiveSourceUrl || undefined,
        },
        images: images.filter((i) => i.jobId === jobId)
          .map((i) => ({ url: i.url, storagePath: i.storagePath })),
        fb,
      };
      // Mask sensitive data in logs
      const safePayload = {
        ...payload,
        fb: fb ? { pageId: fb.pageId ? '***' : undefined, accessToken: fb.accessToken ? '***' : undefined } : undefined
      };
      console.log('[Step2Actions] OUT payload:', JSON.stringify(safePayload, null, 2));

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
      console.log('🎉 finishPost called, postStatus should be done, postUrl:', postUrl);
      // Automatically go to step 4 in stepper! User will go to next by clicking Next.
      setStep(3);
      if (!postUrl) {
        console.log('⚠️ n8n workflow failed, stepper stayed at step 3.');
      }
    } catch (err) {
      const e = err as Error;
      console.log('❌ Post error:', e);
      failPost(e.message || 'unknown error');
      // More descriptive toast
      const errorMsg = e?.message || 'Unknown error';
      toast({
        title: 'Post Failed',
        description: `An error occurred during Facebook sharing: ${errorMsg}. Please try again or refresh the page.`,
        variant: 'destructive',
      });
      // Keep stepper at current step
      setStep(3);
    } finally {
      setBusy(false);
    }
  }

  function onStartPost() {
    // TTL kontrolü - artık yönlendirme yapmayacağız
    if (expired()) {
      clear();
      // Yönlendirme yerine sadece store'u temizle
      return;
    }
    if (!jobId) return;

    setBusy(true);
    startPost();     // state: running
    setStep(3);      // 👈 Stepper 3. adıma geçsin, ekranda kalacağız
    void triggerPostInBackground(); // 👈 n8n beklemeden arka planda tetikle
  }

  const clearUploads = useUploadStore.getState().clearJob;

  return (
    <div className="mt-4 flex items-center justify-end gap-3">
      <button
        type="button"
        className="rounded-xl border px-4 py-2 text-sm"
        onClick={() => {
          if (jobId) {
            clearUploads(jobId);
          }
          // 👇 Her iki store'u da temizle
          const clearAllUploads = useUploadStore.getState().clear;
          clearAllUploads();
          useWizardStore.setState({ jobStartedAt: undefined });
          // Reset All butonuna basıldığında doğrudan dashboard'a yönlendir ve expired=1 parametresini ekle
          router.replace('/dashboard?expired=1');
        }}
      >
        Reset All
      </button>

      <button
        type="button"
        disabled={busy || !jobId || images.filter((i) => i.jobId === jobId).length === 0}
        onClick={onStartPost}
        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {busy ? 'Starting...' : 'Start Post'}
      </button>
    </div>
  );
}