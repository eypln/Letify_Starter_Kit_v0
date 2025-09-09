'use client';
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
      İşlem devam ediyor...
    </div>
  );
}

export default function Step3Post() {
  useJobGuard(3);
  const { postStatus, postUrl, postError, setStep } = useWizardStore();
  const router = useRouter();

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold">3. Adım: Share a Post</h3>

      {postStatus === 'running' && (
        <div className="rounded-xl border p-6">
          <Spinner />
          <p className="mt-2 text-sm text-gray-600">
            Facebook paylaşımı hazırlanıyor. Bu işlem 5–20 saniye sürebilir.
          </p>
        </div>
      )}

      {(postStatus === 'done' || postStatus === 'idle' || postStatus === 'error') && (
        <div className="rounded-xl border p-6">
          <div className="text-sm">
            {postStatus === 'done' ? 'Paylaşım tamamlandı.' : 'Paylaşım henüz tamamlanmadı.'}
          </div>

          <div className="mt-4 flex items-center gap-3">
            {/* Paylaşımı Gör */}
            {postUrl ? (
              <a
                href={postUrl}
                target="_blank"
                className="rounded-lg bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
              >
                Paylaşımı Gör
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="rounded-lg bg-gray-300 px-3 py-2 text-sm text-white cursor-not-allowed"
                title="Post URL bulunamadı"
              >
                Paylaşımı Gör
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
                useWizardStore.setState({ jobId: '', listingId: '' });
                setStep(1);
                router.replace('/dashboard/new-post');
              }}
              className="rounded-lg border px-3 py-2 text-sm text-gray-700 bg-white hover:bg-gray-50"
            >
              Tümünü Temizle
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
          Bir hata oluştu: {postError}
        </div>
      )}
    </section>
  );
}