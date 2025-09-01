'use client';
import { useJobGuard } from '@/lib/wizard/useJobGuard';
import { useWizardStore } from '@/lib/wizard/store';

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
  const { postStatus, postUrl, postError } = useWizardStore();

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

      {postStatus === 'done' && (
        <div className="rounded-xl border p-6">
          <div className="text-sm">Paylaşım tamamlandı.</div>
          {postUrl ? (
            <a href={postUrl} target="_blank" className="mt-2 inline-block rounded-lg bg-green-600 px-3 py-2 text-sm text-white">
              Paylaşımı Gör
            </a>
          ) : (
            <div className="mt-2 text-sm text-amber-700">Post URL bulunamadı; n8n yanıtını kontrol edin.</div>
          )}
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