"use client";
import React from 'react';
import { useJobGuard } from '@/lib/wizard/useJobGuard';
import { useWizardStore } from '@/lib/wizard/store';
import { useRouter } from 'next/navigation';

function Spinner() {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.2" />
        <path d="M4 12a8 8 0 0 1 8-8" fill="none" stroke="currentColor" strokeWidth="4" />
      </svg>
      Processing...
    </div>
  );
}

export default function Step3Post() {
  useJobGuard(3);
  const { postStatus, postUrl, postError, setStep } = useWizardStore();
  const router = useRouter();

  // Eksik kritik verileri store'a yaz (userId, userEmail, fbPageId, fbAccessToken, jobId, listingId)
  async function ensureCriticalData() {
    const store = useWizardStore.getState();
    let jobId = store.jobId;
    let listingId = store.listingId;
    let user = store.user;
    let fb = store.fb;
    // localStorage'dan çek (sadece browser'da)
    if (typeof window !== 'undefined') {
      if (!jobId) jobId = localStorage.getItem('letify_jobId') || '';
      if (!listingId) listingId = localStorage.getItem('letify_listingId') || '';
    }
    // Supabase'den çek
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      // user.id ve user.email zorunlu
      if (!user || !user.id || !user.email) {
        const { data: u } = await supabase.auth.getUser();
        if (u?.user?.id && u?.user?.email) {
          user = { id: u.user.id, email: u.user.email };
        } else {
          user = null;
        }
      }
      if (!fb || !fb.pageId || !fb.accessToken) {
        const { data: integ } = await supabase
          .from('users_integrations')
          .select('fb_page_id, fb_access_token')
          .eq('user_id', user?.id)
          .maybeSingle();
        if (integ?.fb_page_id && integ?.fb_access_token) {
          fb = { pageId: integ.fb_page_id, accessToken: integ.fb_access_token };
        }
      }
    } catch {}
    // Store'a yazma işlemini await ile garanti altına al
    await new Promise((resolve) => {
      useWizardStore.setState({ jobId, listingId, user, fb });
      // Zustand setState sync çalışır ama async tetikleyicilerde garanti için microtask bekletiyoruz
      setTimeout(resolve, 0);
    });
  }

  // İlk renderda eksik verileri tamamla
  React.useEffect(() => {
    ensureCriticalData();
  }, []);

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold">Step 3: Share a Post</h3>

      {postStatus === 'running' && (
        <div className="rounded-xl border p-6">
          <Spinner />
          <p className="mt-2 text-sm text-gray-600">
            Facebook post is being prepared. This may take 15–25 seconds.
          </p>
        </div>
      )}

      {(postStatus === 'done' || postStatus === 'idle' || postStatus === 'error') && (
        <div className="rounded-xl border p-6">
          <div className="text-sm">
            {postStatus === 'done' ? 'Post shared successfully.' : 'Post not shared yet.'}
          </div>

          <div className="mt-4 flex items-center gap-3">
            {/* Paylaşımı Gör */}
            {postUrl ? (
              <a
                href={postUrl}
                target="_blank"
                className="rounded-lg bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
              >
                View Post
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="rounded-lg bg-gray-300 px-3 py-2 text-sm text-white cursor-not-allowed"
                title="Post URL not found"
              >
                View Post
              </button>
            )}

            {/* Tümünü Temizle Button */}
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem('letify_jobId');
                  localStorage.removeItem('letify_listingId');
                } catch {}
                useWizardStore.setState({ jobId: '', listingId: '', jobStartedAt: undefined });
                setStep(1);
                router.replace('/dashboard/new-post');
              }}
              className="rounded-lg border px-3 py-2 text-sm text-gray-700 bg-white hover:bg-gray-50"
            >
              Reset All
            </button>

            {/* Next Button */}
            <button
              type="button"
              disabled={postStatus !== 'done'}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${postStatus === 'done' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'}`}
              onClick={() => {
                if (postStatus === 'done') {
                  setStep(4);
                  requestAnimationFrame(() => {
                    document.getElementById('step-4')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  });
                }
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {postStatus === 'error' && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          An error occurred: {postError}
        </div>
      )}
    </section>
  );
}