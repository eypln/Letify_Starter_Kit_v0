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
        // 1) Preserve CTA's current behavior (open card/navigation etc.)
        props.onClick?.(e);

        // 2) Additional behavior: start timer + clear previous uploads
        clearUploads();
        await startFlow(); // Wait until user id/email is written to store from Supabase
      }}
    >
      {props.children ?? '+ Start new content creation'}
    </Button>
  );
}