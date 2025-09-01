'use client';
import { useWizardStore } from '@/lib/wizard/store';
import { useUploadStore } from '@/lib/uploads/store';

export default function PostProgressInline() {
  const { postStatus, postUrl, postError, jobId } = useWizardStore();
  const { images } = useUploadStore();
  const count = images.filter(i => i.jobId === jobId).length;

  if (postStatus === 'idle') return null;

  if (postStatus === 'running') {
    return (
      <div className="mt-4 rounded-xl border p-4">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.2" />
            <path d="M4 12a8 8 0 0 1 8-8" fill="none" stroke="currentColor" strokeWidth="4" />
          </svg>
          Paylaşım hazırlanıyor… ({count} görsel) ~1–2 dk sürebilir.
        </div>
        {/* indeterminate progress bar */}
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
    );
  }

  if (postStatus === 'done') {
    return (
      <div className="mt-4 rounded-xl border p-4">
        <div className="text-sm text-green-700">Paylaşım tamamlandı.</div>
        {postUrl ? (
          <a
            href={postUrl}
            target="_blank"
            className="mt-2 inline-block rounded-lg bg-green-600 px-3 py-2 text-sm text-white"
          >
            Paylaşımı Gör
          </a>
        ) : (
          <div className="mt-2 text-sm text-amber-700">Post URL bulunamadı; n8n yanıtını kontrol edin.</div>
        )}
      </div>
    );
  }

  // error
  return (
    <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
      Bir hata oluştu: {postError}
    </div>
  );
}