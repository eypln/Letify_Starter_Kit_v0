'use client';
import { createClient } from '@/lib/supabase/client';
import { v4 as uuid } from 'uuid';

const BUCKET = 'user_uploads';

export async function uploadToSupabase(file: File, userId: string, jobId: string) {
  const supabase = createClient();
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const rand = uuid();
  const cleanName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
  // 👇 Yeni organize edilmiş klasör yapısı: userId/YYYY/MM/jobId/timestamp-uuid-filename
  const path = `${userId}/${y}/${m}/${jobId}/${Date.now()}-${rand}-${cleanName}`;

  console.log('📤 Starting upload:', {
    bucket: BUCKET,
    path,
    fileSize: file.size,
    fileType: file.type,
    userId,
    jobId
  });

  try {
    const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: '3600',
    });
    
    if (error) {
      console.error('❌ Supabase upload error:', {
        error,
        path,
        bucket: BUCKET,
        userId,
        jobId,
        fileInfo: { name: file.name, size: file.size, type: file.type }
      });
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    console.log('✅ Upload successful:', { data, path });

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    console.log('🔗 Public URL generated:', urlData.publicUrl);
    
    return { storagePath: path, publicUrl: urlData.publicUrl };
  } catch (error) {
    console.error('💥 Upload function error:', error);
    throw error;
  }
}