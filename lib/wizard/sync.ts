'use client';
import { useEffect } from 'react';
import { useWizardStore } from '@/lib/wizard/store';
import { getEffectiveJobId } from '@/lib/client/job-session';

export function useWizardJobSync(explicitJobId?: string, explicitListingId?: string) {
  useEffect(() => {
    const id = explicitJobId ?? getEffectiveJobId();
    if (id) useWizardStore.setState({ jobId: id });
    if (explicitListingId) useWizardStore.setState({ listingId: explicitListingId });
  }, [explicitJobId, explicitListingId]);
}
