import { createClient } from '@/lib/supabase/client';
import { useWizardStore } from '@/lib/wizard/store';

export async function getListingInfoByJobId(jobId?: string) {
  let sourceUrl = useWizardStore.getState().sourceUrl || '';
  let listingId = useWizardStore.getState().listingId || '';
  if (!sourceUrl && typeof window !== 'undefined') sourceUrl = localStorage.getItem('letify_sourceUrl') || '';
  if (!listingId && typeof window !== 'undefined') listingId = localStorage.getItem('letify_listingId') || '';

  const supabase = createClient();
  let foundListingId = '';
  // 1. jobs tablosundan jobId ile bul
  if ((!sourceUrl || !listingId) && jobId) {
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('listing_id')
      .eq('id', jobId)
      .maybeSingle();
    if (jobError) console.log('[getListingInfoByJobId] jobs sorgu hatası:', jobError);
    foundListingId = job?.listing_id;
    if (foundListingId && !listingId) {
      listingId = foundListingId;
      useWizardStore.getState().setListingId(listingId);
      if (typeof window !== 'undefined') localStorage.setItem('letify_listingId', listingId);
    }
    // listings tablosundan property_url bul
    if (listingId && !sourceUrl) {
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('property_url')
        .eq('id', listingId)
        .maybeSingle();
      if (listingError) console.log('[getListingInfoByJobId] listings (id) sorgu hatası:', listingError);
      if (listing?.property_url) {
        sourceUrl = listing.property_url;
        useWizardStore.getState().setSourceUrl(sourceUrl);
        if (typeof window !== 'undefined') localStorage.setItem('letify_sourceUrl', sourceUrl);
      }
    }
    // Tersine: sourceUrl varsa, listings tablosundan id bul
    if (sourceUrl && !listingId) {
      const { data: listing, error: listingError2 } = await supabase
        .from('listings')
        .select('id')
        .eq('property_url', sourceUrl)
        .maybeSingle();
      if (listingError2) console.log('[getListingInfoByJobId] listings (sourceUrl) sorgu hatası:', listingError2);
      if (listing?.id) {
        listingId = listing.id;
        useWizardStore.getState().setListingId(listingId);
        if (typeof window !== 'undefined') localStorage.setItem('letify_listingId', listingId);
      }
    }
  }

  // 2. jobs tablosunda jobId ile kayıt bulunamazsa, sourceUrl veya listingId ile listings tablosundan fallback
  if ((!listingId || !sourceUrl) && (!foundListingId || !jobId)) {
    // Eğer sourceUrl varsa, listings tablosundan id bul
    if (sourceUrl && !listingId) {
      const { data: listing, error: fallbackError1 } = await supabase
        .from('listings')
        .select('id')
        .eq('property_url', sourceUrl)
        .maybeSingle();
      if (fallbackError1) console.log('[getListingInfoByJobId] fallback listings (sourceUrl) sorgu hatası:', fallbackError1);
      if (listing?.id) {
        listingId = listing.id;
        useWizardStore.getState().setListingId(listingId);
        if (typeof window !== 'undefined') localStorage.setItem('letify_listingId', listingId);
      }
    }
    // Eğer listingId varsa, listings tablosundan property_url bul
    if (listingId && !sourceUrl) {
      const { data: listing, error: fallbackError2 } = await supabase
        .from('listings')
        .select('property_url')
        .eq('id', listingId)
        .maybeSingle();
      if (fallbackError2) console.log('[getListingInfoByJobId] fallback listings (id) sorgu hatası:', fallbackError2);
      if (listing?.property_url) {
        sourceUrl = listing.property_url;
        useWizardStore.getState().setSourceUrl(sourceUrl);
        if (typeof window !== 'undefined') localStorage.setItem('letify_sourceUrl', sourceUrl);
      }
    }
  }

  console.log('[getListingInfoByJobId] FINAL:', { jobId, sourceUrl, listingId });
  return { sourceUrl, listingId };
}
