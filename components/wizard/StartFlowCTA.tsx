'use client';
import { useWizardStore } from '@/lib/wizard/store';
import { useUploadStore } from '@/lib/uploads/store';
import { Button } from '@/components/ui/button';
import { ComponentProps } from 'react';

type Props = ComponentProps<typeof Button>;

export default function StartFlowCTA(props: Props) {
  const startFlow = useWizardStore((s) => s.startFlow);
  const clearUploads = useUploadStore((s) => s.clear);

  return (
    <Button
      {...props}
      onClick={async (e) => {
        // 1) CTA'nın mevcut davranışını KORU (kart açma/navigasyon vb.)
        props.onClick?.(e);

        // 2) İlave davranış: sayaç başlat + eski yüklemeleri sıfırla
        clearUploads();
        await startFlow(); // Supabase'den user id/email store'a yazılana kadar bekle
      }}
    >
      {props.children ?? '+ Yeni içerik üretimine başla'}
    </Button>
  );
}