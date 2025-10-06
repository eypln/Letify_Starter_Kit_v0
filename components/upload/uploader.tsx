'use client';
import { useEffect, useState } from 'react';
import ImageDropzone from './image-dropzone';
import { compressImageTo1MB } from '@/lib/image/compress';
import { uploadToSupabase } from '@/lib/uploads/supabase-upload';
import { useUploadStore } from '@/lib/uploads/store';
import { useWizardStore } from '@/lib/wizard/store';
import { JOB_TTL_MS } from '@/lib/wizard/constants';
import { createClient } from '@/lib/supabase/client';
import { getEffectiveJobId } from '@/lib/client/job-session'; // 👈 URL/localStorage fallback
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Upload, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

const MAX = 15;

export default function Uploader() {
  const supabase = createClient();
  const router = useRouter();
  const jobIdInStore = useWizardStore((s) => s.jobId);
  const jobStartedAt = useWizardStore((s) => s.jobStartedAt);
  const clear = useWizardStore((s) => s.clear);
  // URL/localStorage → store senkronu (ilk render)
  useEffect(() => {
    if (!jobIdInStore) {
      const j = getEffectiveJobId();
      if (j) useWizardStore.setState({ jobId: j });
    }
  }, [jobIdInStore]);

  // Her yerde bunu kullan
  const jobId = jobIdInStore || getEffectiveJobId();
  const [busy, setBusy] = useState(false);
  const [retryFiles, setRetryFiles] = useState<File[]>([]);
  const { images, add } = useUploadStore();
  const { toast } = useToast();

  // TTL kontrol fonksiyonu
  function ensureNotExpired() {
    if (!jobStartedAt || Date.now() - jobStartedAt > JOB_TTL_MS) {
      clear();
      // 👇 Her iki store'u da temizle
      const clearUploads = useUploadStore.getState().clear;
      clearUploads();
      // Timer süresi dolduğunda doğrudan dashboard'a yönlendir ve expired=1 parametresini ekle
      router.replace('/dashboard?expired=1');
      throw new Error('Job expired');
    }
  }

  // JobId yoksa uyarı göster
  if (!jobId) {
    return (
      <div className="p-4 border rounded-lg bg-amber-50 border-amber-200">
        <p className="text-sm text-amber-600">
          🚨 Please complete Step 1 to create content (jobId missing).
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
          title: "File limit",
          description: `You can upload up to ${MAX} images. Only the first ${files.length} files will be processed.`,
          variant: "destructive",
        });
      }
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast({
          title: "Authentication Error",
          description: "No active session found. Please sign in again.",
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
            title: "Processing",
            description: `${original.name} is being compressed...`,
          });
          
          const compressed = await compressImageTo1MB(original);
          
          toast({
            title: "Uploading",
            description: `${original.name} is being uploaded to Supabase...`,
          });
          
          const { publicUrl, storagePath } = await uploadToSupabase(compressed, user.id, jobId!);
          // Storage'a upload sonrası tabloya insert
          try {
            const { error: insertError } = await supabase.from('uploaded_assets').insert({
              user_id: user.id,
              job_id: jobId!,
              storage_path: storagePath,
              public_url: publicUrl,
              size_bytes: compressed.size,
              created_at: new Date().toISOString()
            });
            if (insertError) {
              console.error('❌ uploaded_assets insert error:', insertError);
            }
          } catch (e) {
            console.error('💥 uploaded_assets insert exception:', e);
          }
          // JobId ile birlikte kaydet (local store)
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
            title: "Upload Error",
            description: `${original.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            variant: "destructive",
          });
        }
      }

      if (successCount > 0) {
        toast({
          title: "Success",
          description: `${successCount} images uploaded successfully.`,
        });
      }

      if (failedFiles.length > 0) {
        setRetryFiles(failedFiles);
      }
    } catch (error) {
      console.error('💥 Upload process failed:', error);
      toast({
        title: "General Error",
        description: "File upload failed.",
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
        onFilesAction={handleFiles} 
        maxCount={MAX - currentJobImages.length} 
      />
      
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>Uploaded: {currentJobImages.length}/{MAX}</span>
        <span>Job: <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{jobId?.slice(0, 8)}...</span></span>
        {busy && (
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Processing...</span>
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
            <span>Retry ({retryFiles.length})</span>
          </Button>
        )}
      </div>
    </div>
  );
}