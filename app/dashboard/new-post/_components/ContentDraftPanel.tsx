"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useWizardStore } from "@/lib/wizard/store";
import { useWizardJobSync } from "@/lib/wizard/sync";

type JobRow = {
  id: string;
  status: string | null;
  progress_int: number | null;
  result: any | null;   // { generatedDescription?: string, generatedTitle?: string, ... }
  payload: any | null;  // { sourceUrl?: string, ... }
  updated_at?: string;  // optional timestamp
};

interface ContentDraftPanelProps {
  jobId: string;
}

export default function ContentDraftPanel({ jobId }: ContentDraftPanelProps) {
  const sp = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { setStep } = useWizardStore();

  // ✅ Hook'lar component'in en üstünde
  const [loading, setLoading] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [jobData, setJobData] = React.useState<JobRow | null>(null);
  const [hasContent, setHasContent] = React.useState(false);
  
  // Ref'ler - toast ve polling kontrolü için
  const toastShownRef = React.useRef(false);
  const stopRef = React.useRef(false);

  // Debug: Component render edildiğinde konsola yazdır
  React.useEffect(() => {
    console.log('🚀 ContentDraftPanel rendered!', { 
      jobId, 
      currentStep: new URLSearchParams(window.location.search).get('step') || '1',
      searchParams: sp.toString() 
    });
  }, [jobId, sp]);

  // Polling effect - job status kontrolü
  React.useEffect(() => {
    if (!jobId) return;

    // yeni bir job'a geçersek tekrar toast gösterebilelim
    toastShownRef.current = false;
    stopRef.current = false;

    console.log('🔄 Starting polling for job:', jobId);

    const tick = async () => {
      try {
        console.log('📡 Fetching job status for:', jobId);
        const res = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
        
        if (!res.ok) {
          console.error('❌ Failed to fetch job:', res.status, res.statusText);
          return;
          // jobId'yi store'a yazmak için hook'u en üstte çağır
          useWizardJobSync(jobId);
        }

        const response = await res.json();
        const { job } = response as { ok: boolean; job: JobRow };
        
        if (!job) return;
        
        setJobData(job);
        
        // Çoklu kaynak okuma - payload'dan veri al
        const desc = job?.payload?.result?.generatedDescription ??
                    job?.payload?.generatedDescription ??
                    job?.result?.generatedDescription ?? "";
        
        console.log('📝 Content found:', { desc: desc.slice(0, 50), status: job.status });
        
        // Content var mı kontrolü
        const contentReady = job?.status === "done" && desc;
        setHasContent(contentReady);
        
        // Sadece boşsa güncelle (kullanıcı edit yaptıysa üzerine yazma)
        if (desc && !draft) setDraft(desc);
        
        // 🔒 toast sadece 1 kere
        if (contentReady && !toastShownRef.current) {
          toastShownRef.current = true;
          console.log('🎉 Content is ready, showing toast');
          toast({
            title: "İçerik Hazır!",
            description: "AI tarafından üretilen içerik aşağıda görünüyor. Düzenleyip kaydedebilirsiniz.",
          });
        }
        
        // ✅ iş bittiğinde polling'i durdur
        if (job?.status === 'done' || job?.status === 'error' || contentReady) {
          stopRef.current = true;
          console.log('✅ Job completed, stopping polling');
        }
      } catch (error) {
        console.error('🚨 Job polling error:', error);
      }
    };

    // hemen bir kere çalıştır
    tick();

    // periyodik polling
    const intervalId = setInterval(() => {
      if (!stopRef.current) {
        tick();
      } else {
        clearInterval(intervalId);
      }
    }, 2500);

    // cleanup
    return () => {
      stopRef.current = true;
      clearInterval(intervalId);
      console.log('🛑 Stopping polling for job:', jobId);
    };
  }, [jobId, toast, draft]);

  const onSave = async () => {
    if (!jobId) {
      toast({ title: "Hata", description: "Job bulunamadı.", variant: "destructive" });
      return;
    }
    if (!draft.trim()) {
      toast({ title: "Açıklama gerekli", description: "Lütfen açıklamayı girin.", variant: "destructive" });
      return;
    }

    // İstersen kullanıcıyı bekletmeden hemen 2. adıma geçir:
    setStep(2);
    // Step-2 paneline nazikçe kaydır:
    requestAnimationFrame(() => {
      document.getElementById('step-2')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    setLoading(true);
    try {
  const res = await fetch("/api/jobs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, description: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.message || "Kaydedilemedi");

      toast({ title: "Kaydedildi", description: "İçerik kaydedildi, 2. adıma geçildi." });
    } catch (e: any) {
      toast({ title: "Hata", description: e?.message ?? "Bilinmeyen hata", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Job ID yoksa hiçbir şey gösterme
  if (!jobId) {
    console.log('❌ ContentDraftPanel: jobId yok, mevcut parametreler:', sp.toString());
    return null;
  }

  console.log('✅ ContentDraftPanel: jobId bulundu:', jobId);
  console.log('📏 Panel check:', { hasContent, jobStatus: jobData?.status });

  // Content hazırsa editor'u göster
  if (hasContent) {
    return (
      <div className="mt-4 rounded-lg border p-4">
        <div className="mb-4">
          <h3 className="font-medium text-green-900 mb-2">✅ AI İçeriği Hazır - Düzenleyebilirsiniz</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Açıklama</label>
            <Textarea
              rows={12}
              placeholder="İçerik hazır. Dilediğiniz gibi düzenleyin."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              AI tarafından üretilen metni düzenleyip kaydedin; ardından 2. adıma geçeceğiz.
            </p>
          </div>

          <div className="flex gap-2">
            <Button type="button" onClick={onSave} disabled={loading || !draft.trim()}>
              {loading ? "Kaydediliyor..." : "Kaydet ve 2. Adıma Geç"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Hata durumu
  if (jobData?.status === 'error') {
    return (
      <div className="mt-4 rounded-lg border p-6 bg-red-50">
        <h3 className="font-medium text-red-900">Hata Oluştu</h3>
        <p className="text-sm text-red-700 mt-1">İçerik üretimi sırasında bir hata oluştu. Job ID: {jobId}</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-3"
          onClick={() => window.location.reload()}
        >
          Tekrar Dene
        </Button>
      </div>
    );
  }

  // Loading durumu (default)
  return (
    <div className="mt-4 rounded-lg border p-6 bg-purple-50">
      <div className="flex items-center space-x-3">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
        <div>
          <h3 className="font-medium text-purple-900">AI Content is being generated...</h3>
          <p className="text-sm text-purple-700 mt-1">Listing is being analyzed and description is being prepared. Job ID: {jobId?.slice(0, 8)}...</p>
          <p className="text-xs text-purple-600 mt-1">
            Status: {jobData?.status || 'loading'} | HasContent: {hasContent ? 'Yes' : 'No'}
          </p>
        </div>
      </div>
    </div>
  );
}