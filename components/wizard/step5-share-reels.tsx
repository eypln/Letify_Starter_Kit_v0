'use client';
import { useWizardStore } from '@/lib/wizard/store';
import { useStepMarker } from '@/lib/wizard/useStepMarker';
import { useRouter } from 'next/navigation';

function Spinner() {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.2" />
        <path d="M4 12a8 8 0 0 1 8-8" fill="none" stroke="currentColor" strokeWidth="4" />
      </svg>
      Reels Facebook'ta paylaşılıyor...
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
    clear
  } = useWizardStore();

  const goToDashboard = () => {
    clear(); // Wizard state'ini temizle
    router.push('/dashboard'); // Dashboard'a yönlendir
  };

  return (
    <section id="step-5" className="space-y-4">
      <h3 className="text-lg font-semibold">5. Adım: Share Reels</h3>

      {reelsShareStatus === 'running' && (
        <div className="rounded-xl border p-6">
          <Spinner />
          <p className="mt-2 text-sm text-gray-600">
            Video Reels olarak Facebook'ta paylaşılıyor. Bu işlem birkaç dakika sürebilir.
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
          <div className="text-sm text-green-700">✅ Reels başarıyla Facebook'ta paylaşıldı!</div>
          {reelsShareUrl ? (
            <div className="mt-4 flex items-center gap-3">
              <a 
                href={reelsShareUrl} 
                target="_blank" 
                className="rounded-lg bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
              >
                Reels'ı Gör
              </a>
              <button 
                type="button" 
                onClick={goToDashboard} 
                className="rounded-lg bg-purple-600 px-3 py-2 text-sm text-white hover:bg-purple-700"
              >
                Tamamlandı → Dashboard
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <div className="text-sm text-amber-700 mb-3">
                Reels paylaşıldı ancak link bulunamadı. Facebook hesabınızı kontrol edin.
              </div>
              <button 
                type="button" 
                onClick={goToDashboard} 
                className="rounded-lg bg-purple-600 px-3 py-2 text-sm text-white hover:bg-purple-700"
              >
                Tamamlandı → Dashboard
              </button>
            </div>
          )}
        </div>
      )}

      {reelsShareStatus === 'error' && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4">
          <div className="text-sm text-red-700 mb-3">❌ Reels paylaşımında hata oluştu:</div>
          <div className="text-sm text-red-600 mb-4 font-mono bg-red-100 p-2 rounded">
            {reelsShareError}
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={() => {
                // Tekrar dene - Step 4'e geri dön
                setStep(4);
                requestAnimationFrame(() => {
                  document.getElementById('step-4')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
              }}
              className="rounded-lg bg-orange-500 px-3 py-2 text-sm text-white hover:bg-orange-600"
            >
              ← Step 4'e Dön
            </button>
            <button 
              type="button" 
              onClick={goToDashboard} 
              className="rounded-lg bg-gray-600 px-3 py-2 text-sm text-white hover:bg-gray-700"
            >
              Atla → Dashboard
            </button>
          </div>
        </div>
      )}

      {reelsShareStatus === 'idle' && (
        <div className="rounded-xl border p-6">
          <div className="text-sm text-gray-600">
            Reels paylaşımı bekleniyor. Step 4'ten "Uygun → 5. Adım" butonuna tıklayın.
          </div>
        </div>
      )}
    </section>
  );
}