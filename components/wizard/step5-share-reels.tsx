'use client';
import { useWizardStore } from '@/lib/wizard/store';
import React from 'react';
import { useStepMarker } from '@/lib/wizard/useStepMarker';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';

function Spinner() {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.2" />
        <path d="M4 12a8 8 0 0 1 8-8" fill="none" stroke="currentColor" strokeWidth="4" />
      </svg>
      Reels are being shared on Facebook...
    </div>
  );
}

export default function Step5ShareReels() {
  useStepMarker(5);
  const router = useRouter();
  const { 
    reelsShareStatus, 
    reelsShareUrl, 
    reelsShareError,
    setStep,
    clear,
    jobId,
    listingId
  } = useWizardStore();

  // user ve fb state'ini localde tutmak için
  const [user, setUser] = React.useState<any>(null);
  const [fb, setFb] = React.useState<any>(null);

  // Eksik kritik verileri store'a yaz (userId, userEmail, fbPageId, fbAccessToken, jobId, listingId)
  async function ensureCriticalData() {
    let _jobId = jobId;
    let _listingId = listingId;
    let _user = user;
    let _fb = fb;
    // localStorage'dan çek
    if (!_jobId) _jobId = localStorage.getItem('letify_jobId') || '';
    if (!_listingId) _listingId = localStorage.getItem('letify_listingId') || '';
    // Supabase'den çek
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      // user.id ve user.email zorunlu
      if (!_user || !_user.id || !_user.email) {
        const { data: u } = await supabase.auth.getUser();
        if (u?.user?.id && u?.user?.email) {
          _user = { id: u.user.id, email: u.user.email };
        } else {
          _user = null;
        }
      }
      if (!_fb || !_fb.pageId || !_fb.accessToken) {
        const { data: integ } = await supabase
          .from('users_integrations')
          .select('fb_page_id, fb_access_token')
          .eq('user_id', _user?.id)
          .maybeSingle();
        if (integ?.fb_page_id && integ?.fb_access_token) {
          _fb = { pageId: integ.fb_page_id, accessToken: integ.fb_access_token };
        }
      }
    } catch {}
    // State'e yaz
    setUser(_user);
    setFb(_fb);
    useWizardStore.setState({ jobId: _jobId, listingId: _listingId, user: _user, fb: _fb });
  }

  React.useEffect(() => {
    ensureCriticalData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { toast } = useToast();
  const goToDashboard = () => {
    clear(); // Wizard state'ini temizle
    toast({
      title: 'Success',
      description: 'Property shared on social media successfully!'
    });
    router.push('/dashboard'); // Dashboard'a yönlendir
  };

  return (
    <section id="step-5" className="space-y-4">
      <h3 className="text-lg font-semibold">Step 5: Share Reels</h3>

      {reelsShareStatus === 'running' && (
        <div className="rounded-xl border p-6">
          <Spinner />
          <p className="mt-2 text-sm text-gray-600">
            Video is being shared as Reels on Facebook. This may take a few minutes.
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded bg-gray-200">
            <div className="h-full w-1/3 animate-[progress_1.2s_linear_infinite] bg-blue-500" />
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

      {reelsShareStatus === 'done' && (
        <div className="rounded-xl border p-6">
          <div className="text-sm text-green-700">✅ Reels successfully shared on Facebook!</div>
          {reelsShareUrl ? (
            <div className="mt-4 flex items-center gap-3">
              <a 
                href={reelsShareUrl} 
                target="_blank" 
                className="rounded-lg bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
              >
                View Reels
              </a>
              <button 
                type="button" 
                onClick={goToDashboard} 
                className="rounded-lg bg-purple-600 px-3 py-2 text-sm text-white hover:bg-purple-700"
              >
                Done → Dashboard
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <div className="text-sm text-gray-600 mb-3">
                Please check your Facebook account.
              </div>
              <button 
                type="button" 
                onClick={goToDashboard} 
                className="rounded-lg bg-purple-600 px-3 py-2 text-sm text-white hover:bg-purple-700"
              >
                Done → Dashboard
              </button>
            </div>
          )}
        </div>
      )}

      {reelsShareStatus === 'error' && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4">
          <div className="text-sm text-red-700 mb-3">❌ Error occurred while sharing Reels:</div>
          <div className="text-sm text-red-600 mb-4 font-mono bg-red-100 p-2 rounded">
            {reelsShareError}
          </div>
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={() => {
                // Retry - go back to Step 4
                setStep(4);
                requestAnimationFrame(() => {
                  document.getElementById('step-4')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
              }}
              className="rounded-lg bg-orange-500 px-3 py-2 text-sm text-white hover:bg-orange-600"
            >
              ← Back to Step 4
            </button>
            <button 
              type="button" 
              onClick={goToDashboard} 
              className="rounded-lg bg-gray-600 px-3 py-2 text-sm text-white hover:bg-gray-700"
            >
              Skip → Dashboard
            </button>
          </div>
        </div>
      )}

      {reelsShareStatus === 'idle' && (
        <div className="rounded-xl border p-6">
          <div className="text-sm text-gray-600">
            Waiting to share Reels. Click "Proceed → Step 5" in Step 4.
          </div>
        </div>
      )}
    </section>
  );
}