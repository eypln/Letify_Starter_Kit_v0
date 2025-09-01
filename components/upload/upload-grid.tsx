'use client';
import { useUploadStore } from '@/lib/uploads/store';
import { useWizardStore } from '@/lib/wizard/store';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export default function UploadGrid() {
  const jobId = useWizardStore((s) => s.jobId);
  const { images, remove } = useUploadStore();
  
  // Sadece aktif job'ın görsellerini filtrele
  const items = jobId ? images.filter((i) => i.jobId === jobId) : [];
  
  if (!items.length) return null;
  
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {items.map((img) => (
        <div key={img.id} className="relative rounded-xl border p-2 bg-white shadow-sm">
          <Button
            variant="outline"
            size="sm"
            className="absolute right-2 top-2 h-6 w-6 rounded-full p-0 bg-white/90 hover:bg-white border-gray-300"
            onClick={() => remove(img.id)}
          >
            <X className="h-3 w-3" />
          </Button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={img.url} 
            alt={img.name} 
            className="h-40 w-full rounded-lg object-cover" 
          />
          <div className="mt-1 truncate text-xs font-medium">{img.name}</div>
          <div className="text-[10px] text-gray-500">{(img.size/1024).toFixed(0)} KB</div>
        </div>
      ))}
    </div>
  );
}