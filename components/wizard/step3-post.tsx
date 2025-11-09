"use client";
import React from 'react';
import { useJobGuard } from '@/lib/wizard/useJobGuard';
import { useWizardStore } from '@/lib/wizard/store';
import { useUploadStore } from '@/lib/uploads/store';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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
  const { postStatus, postUrl, postError, setStep, clear } = useWizardStore(); // 👈 clear fonksiyonunu içe aktar
  const router = useRouter();
  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  const [userPlan, setUserPlan] = React.useState<string | null>(null);
  const [limitReachedWarning, setLimitReachedWarning] = React.useState<boolean>(false);

  // Kullanıcı emailini ve plan bilgisini al
  React.useEffect(() => {
    async function fetchUser() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setUserEmail(user?.email || null);
        
        // Kullanıcının plan bilgisini al
        if (user?.id) {
          const { data: profile } = await supabase
            .from('users')
            .select('plan')
            .eq('id', user.id)
            .maybeSingle();
          
          setUserPlan(profile?.plan || 'free');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    }
    
    fetchUser();
  }, []);

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

  // Activity kaydı ve post sayısı güncelleme fonksiyonu
  const logPostActivity = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.id) {
        // Listing title'ı çek
        let listingTitle = '';
        const listingId = useWizardStore.getState().listingId;
        if (listingId) {
          const { data: listing, error } = await supabase
            .from('listings')
            .select('title')
            .eq('id', listingId)
            .maybeSingle();
          
          if (!error && listing) {
            listingTitle = listing.title || '';
          }
        }
        
        // Activity kaydı yap
        await supabase
          .from('activity')
          .insert([{
            user_id: user.id,
            type: 'post_shared',
            data: { 
              post_url: postUrl,
              listing_id: listingId,
              job_id: useWizardStore.getState().jobId,
              title: listingTitle
            },
            created_at: new Date().toISOString(),
          }]);

        // Post sayısını güncelle (bu ay yapılan post sayacını artır)
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        const { data: existingRecord } = await supabase
          .from('user_post_usage')
          .select('id, count')
          .eq('user_id', user.id)
          .eq('month', currentMonth)
          .maybeSingle();
        
        let newCount = 1;
        if (existingRecord) {
          // Mevcut ay kaydını güncelle
          newCount = existingRecord.count + 1;
          await supabase
            .from('user_post_usage')
            .update({ count: newCount })
            .eq('id', existingRecord.id);
        } else {
          // Yeni ay kaydı oluştur
          await supabase
            .from('user_post_usage')
            .insert([{
              user_id: user.id,
              month: currentMonth,
              count: 1,
            }]);
        }

        // Free plan kullanıcılar için limit kontrolü
        if (userPlan === 'free' && newCount >= 30) {
          setLimitReachedWarning(true);
        }
      }
    } catch (error) {
      console.error('Activity log error:', error);
    }
  };

  // Post başarıyla tamamlandığında activity kaydı yap
  React.useEffect(() => {
    if (postStatus === 'done' && postUrl) {
      logPostActivity();
    }
  }, [postStatus, postUrl]);

  // Free plan kullanıcıları reels üretemez - Next butonu sadece paid plan için aktif
  const isNextButtonEnabled = postStatus === 'done' && userPlan !== 'free';

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold">Step 3: Share a Post</h3>

      {limitReachedWarning && (
        <div className="rounded-xl border border-orange-300 bg-orange-50 p-4 text-sm text-orange-700">
          <strong>Monthly Limit Reached:</strong> You have reached your free plan limit of 30 posts per month. 
          To share more posts, please upgrade to a paid plan.
        </div>
      )}

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
              <div className="relative group">
                <button
                  type="button"
                  disabled
                  className="rounded-lg bg-gray-300 px-3 py-2 text-sm text-white cursor-not-allowed"
                >
                  View Post
                </button>
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                  Update Facebook Access Token
                </div>
              </div>
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
                // 👇 Her iki store'u da temizle
                clear();
                const clearUploads = useUploadStore.getState().clear;
                clearUploads();
                // Reset All butonuna basıldığında doğrudan dashboard'a yönlendir ve expired=1 parametresini ekle
                router.replace('/dashboard?expired=1');
              }}
              className="rounded-lg border px-3 py-2 text-sm text-gray-700 bg-white hover:bg-gray-50"
            >
              Reset All
            </button>

            {/* Next Button - Free plan kullanıcıları için devre dışı */}
            <button
              type="button"
              disabled={!isNextButtonEnabled}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
                isNextButtonEnabled 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
              onClick={() => {
                if (isNextButtonEnabled) {
                  setStep(4);
                  requestAnimationFrame(() => {
                    document.getElementById('step-4')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  });
                }
              }}
              title={userPlan === 'free' ? 'Upgrade to a paid plan to create reels' : ''}
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