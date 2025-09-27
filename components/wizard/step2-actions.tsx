"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { useWizardStore } from '@/lib/wizard/store';
import { getListingInfoByJobId } from '@/lib/wizard/getListingInfo';
import { getEffectiveJobId } from '@/lib/client/job-session';
import { JOB_TTL_MS } from '@/lib/wizard/constants';
import { createClient } from '@/lib/supabase/client';
import { useUploadStore } from '@/lib/uploads/store';
import { useState, useEffect } from 'react';

export default function Step2Actions() {
  const router = useRouter();

  const supabase = createClient();
  const { images, clear: clearUploads } = useUploadStore();
  const {
    jobStartedAt, listingId, sourceUrl,
    startPost, finishPost, failPost, setStep, clear, setSourceUrl, setListingId
  } = useWizardStore();
  // jobId'yi SSR/CSR uyumlu şekilde al
  const [effectiveJobId, setEffectiveJobId] = useState<string | null>(null);
  useEffect(() => {
    let jid = getEffectiveJobId();
    if (!jid && typeof window !== 'undefined') {
      jid = localStorage.getItem('letify_jobId') || '';
    }
    setEffectiveJobId(jid);
  }, []);
  const [busy, setBusy] = useState(false);
  // Toast hook'u ekle
  const { toast } = require('@/components/ui/use-toast');

  // Step başında: sourceUrl ve listingId store'a Supabase'den doğru şekilde yazılsın
  useEffect(() => {
    async function ensureListingIdAndSourceUrl() {
      let effectiveSourceUrl = sourceUrl;
      let effectiveListingId = listingId;
      if (typeof window !== 'undefined') {
        effectiveSourceUrl = effectiveSourceUrl || localStorage.getItem('letify_sourceUrl') || null;
        effectiveListingId = effectiveListingId || localStorage.getItem('letify_listingId') || null;
      }
      // Supabase fallback
      if ((!effectiveSourceUrl || !effectiveListingId) && supabase) {
        if (effectiveSourceUrl && !effectiveListingId) {
          const { data: listing } = await supabase
            .from('listings')
            .select('id')
            .eq('property_url', effectiveSourceUrl)
            .maybeSingle();
          if (listing?.id) {
            setListingId(listing.id);
            if (typeof window !== 'undefined') localStorage.setItem('letify_listingId', listing.id);
            effectiveListingId = listing.id;
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
            effectiveSourceUrl = listing.property_url;
          }
        }
      }
      // Store ve localStorage sync
      if (effectiveListingId) setListingId(effectiveListingId);
      if (effectiveSourceUrl) setSourceUrl(effectiveSourceUrl);
      if (typeof window !== 'undefined') {
        if (effectiveListingId) localStorage.setItem('letify_listingId', effectiveListingId);
        if (effectiveSourceUrl) localStorage.setItem('letify_sourceUrl', effectiveSourceUrl);
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
    const jobIdToUse = effectiveJobId || '';
    // Her payload öncesi, Supabase fallback ile sourceUrl ve listingId'yi garanti altına al
    const { sourceUrl: effectiveSourceUrl, listingId: effectiveListingId } = await getListingInfoByJobId(jobIdToUse);
    console.log('[Step2Actions] jobId:', jobIdToUse, 'sourceUrl:', effectiveSourceUrl, 'listingId:', effectiveListingId);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (u?.user) {
        user = { id: u.user.id, email: u.user.email };
        if (!effectiveJobId) useWizardStore.getState().setJobId(u.user.id);
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
        job: { id: effectiveJobId, kind: 'content' },
        listing: {
          id: effectiveListingId,
          sourceUrl: effectiveSourceUrl || undefined,
        },
        images: images.filter(i => i.jobId === effectiveJobId)
          .map(i => ({ url: i.url, storagePath: i.storagePath })),
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
    } catch (e: any) {
      console.log('❌ Post error:', e);
      failPost(e.message || 'unknown error');
      // More descriptive toast
      const errorMsg = typeof e === 'string' ? e : (e?.message || 'Unknown error');
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
    // TTL kontrolü + redirect
    if (expired()) {
      clear();
      router.replace('/dashboard?expired=1');
      return;
    }
  if (!effectiveJobId) return;

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
          useWizardStore.setState({ jobStartedAt: undefined });
          setStep(1);
          router.replace('/dashboard/new-post');
        }}
      >
        Reset All
      </button>

      <button
        type="button"
  disabled={busy || !effectiveJobId || images.filter(i => i.jobId === effectiveJobId).length === 0}
        onClick={onStartPost}
        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {busy ? 'Starting...' : 'Start Post'}
      </button>
    </div>
  );
}