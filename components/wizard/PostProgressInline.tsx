'use client';
import { useWizardStore } from '@/lib/wizard/store';

export default function PostProgressInline() {
  const postStatus = useWizardStore((s) => s.postStatus);
  const postUrl    = useWizardStore((s) => s.postUrl);
  const setStep    = useWizardStore((s) => s.setStep);

  const goStep4 = () => {
    setStep(4); // Step 4'e geç
    // Step-4 paneline nazikçe kaydır
    requestAnimationFrame(() => {
      document.getElementById('step-4')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  // Sadece done durumunda göster
  if (postStatus !== 'done') {
    return null;
  }

  return (
    <div className="rounded-xl border p-6">
      <div className="text-sm">Paylaşım tamamlandı.</div>

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

        {/* Next Button */}
        <button
          type="button"
          onClick={goStep4}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Next
        </button>
      </div>
    </div>
  );
}