'use client';
import { useState } from 'react';
import ImageDropzone from './image-dropzone';
import { compressImageTo1MB } from '@/lib/image/compress';
import { uploadToSupabase } from '@/lib/uploads/supabase-upload';
import { useUploadStore } from '@/lib/uploads/store';
import { useWizardStore } from '@/lib/wizard/store';
import { JOB_TTL_MS } from '@/lib/wizard/constants';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Upload, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

const MAX = 15;

export default function Uploader() {
  const supabase = createClient();
  const router = useRouter();
  const jobId = useWizardStore((s) => s.jobId);
  const jobStartedAt = useWizardStore((s) => s.jobStartedAt);
  const clear = useWizardStore((s) => s.clear);
  const [busy, setBusy] = useState(false);
  const [retryFiles, setRetryFiles] = useState<File[]>([]);
  const { images, add } = useUploadStore();
  const { toast } = useToast();

  // TTL kontrol fonksiyonu
  function ensureNotExpired() {
    if (!jobStartedAt || Date.now() - jobStartedAt > JOB_TTL_MS) {
      clear();
      router.replace('/dashboard?expired=1'); // <-- değişti
      throw new Error('Job expired');
    }
  }

  // JobId yoksa uyarı göster
  if (!jobId) {
    return (
      <div className="p-4 border rounded-lg bg-amber-50 border-amber-200">
        <p className="text-sm text-amber-600">
          🚨 Önce 1. adımda içerik üretin (jobId yok).
        </p>
      </div>
    );
  }

  async function handleFiles(files: File[]) {
    if (busy) return;
    
    // 👈 TTL kontrolü
    try {
      ensureNotExpired();
    } catch {
      return; // Expired, zaten redirect edildi
    }
    
    setBusy(true);
    setRetryFiles([]);
    
    try {
      // Mevcut job'ın görsellerini filtrele
      const currentJobImages = images.filter(img => img.jobId === jobId);
      
      if (currentJobImages.length + files.length > MAX) {
        files = files.slice(0, MAX - currentJobImages.length);
        toast({
          title: "Dosya limiti",
          description: `En fazla ${MAX} görsel yükleyebilirsiniz. İlk ${files.length} dosya işlenecek.`,
          variant: "destructive",
        });
      }
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast({
          title: "Kimlik Doğrulama Hatası",
          description: "Oturum bulunamadı. Lütfen tekrar giriş yapın.",
          variant: "destructive",
        });
        return;
      }

      const failedFiles: File[] = [];
      let successCount = 0;

      for (const original of files) {
        try {
          console.log('📁 Processing file:', { name: original.name, jobId });
          
          toast({
            title: "İşleniyor",
            description: `${original.name} sıkıştırılıyor...`,
          });
          
          const compressed = await compressImageTo1MB(original);
          
          toast({
            title: "Yükleniyor",
            description: `${original.name} Supabase'e yükleniyor...`,
          });
          
          const { publicUrl, storagePath } = await uploadToSupabase(compressed, user.id, jobId!);
          
          // JobId ile birlikte kaydet
          add({
            name: original.name,
            url: publicUrl,
            storagePath,
            size: compressed.size,
            jobId: jobId! // 👈 JobId eklendi
          });
          
          successCount++;
        } catch (error) {
          console.error('❌ Upload failed for:', original.name, error);
          failedFiles.push(original);
          
          toast({
            title: "Yükleme Hatası",
            description: `${original.name}: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
            variant: "destructive",
          });
        }
      }

      if (successCount > 0) {
        toast({
          title: "Başarılı",
          description: `${successCount} görsel başarıyla yüklendi.`,
        });
      }

      if (failedFiles.length > 0) {
        setRetryFiles(failedFiles);
      }
    } catch (error) {
      console.error('💥 Upload process failed:', error);
      toast({
        title: "Genel Hata",
        description: "Dosya yükleme işlemi başarısız oldu.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleRetry() {
    if (retryFiles.length > 0) {
      await handleFiles(retryFiles);
    }
  }

  // Mevcut job'ın görsel sayısını hesapla
  const currentJobImages = images.filter(img => img.jobId === jobId);

  return (
    <div className="space-y-4">
      <ImageDropzone 
        disabled={busy || currentJobImages.length >= MAX} 
        onFiles={handleFiles} 
        maxCount={MAX - currentJobImages.length} 
      />
      
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>Yüklü: {currentJobImages.length}/{MAX}</span>
        <span>Job: <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{jobId?.slice(0, 8)}...</span></span>
        {busy && (
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>İşleniyor...</span>
          </div>
        )}
        {retryFiles.length > 0 && !busy && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRetry}
            className="flex items-center space-x-1"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Tekrar Dene ({retryFiles.length})</span>
          </Button>
        )}
      </div>
    </div>
  );
}