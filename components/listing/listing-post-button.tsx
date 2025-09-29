import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface ListingPostButtonProps {
  listingId: string;
  jobId: string;
  formData: {
    referenceNo: string;
    city: string;
    price: number;
    bedroom: number;
    bathroom: number;
    propertyType: string;
    description: string;
    images?: File[];
  };
  onSuccess?: () => void;
}

export default function ListingPostButton({ listingId, jobId, formData, onSuccess }: ListingPostButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localJobId, setLocalJobId] = useState(jobId);
  const [localListingId, setLocalListingId] = useState(listingId);
  const [localFormData, setLocalFormData] = useState(formData);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Read from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('listingForm');
    if (saved) {
      try {
        const { jobId: savedJobId, listingId: savedListingId, formData: savedFormData } = JSON.parse(saved);
        if (savedJobId) setLocalJobId(savedJobId);
        if (savedListingId) setLocalListingId(savedListingId);
        if (savedFormData) setLocalFormData(savedFormData);
      } catch {}
    }
  }, []);

  // Save to localStorage on every change
  useEffect(() => {
    localStorage.setItem('listingForm', JSON.stringify({ jobId: localJobId, listingId: localListingId, formData: localFormData }));
  }, [localJobId, localListingId, localFormData]);

  const postToFacebook = async () => {
    setLoading(true);
    setError(null);
    // Check for missing data
    if (!localJobId || !localListingId || !localFormData || !localFormData.referenceNo) {
      toast({
        title: 'Session expired, please start again.',
        description: 'Some required data is missing.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }
    const webhookUrl = 'https://n8n.letify.cloud/webhook/57b6a3a1-19e7-4715-bf07-955ea6038036';
    // Get userId from Supabase
    let userId = '';
    try {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user?.id) {
        console.warn('Supabase userId could not be retrieved:', userError?.message);
      } else {
        userId = userData.user.id;
      }
    } catch (e) {
      console.warn('Error while retrieving Supabase userId:', (e as Error).message);
    }
    const payload = {
      ...localFormData,
      jobId: localJobId,
      listingId: localListingId,
      userId,
    };
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      console.log('n8n response status:', response.status);
      if (!response.ok) {
        const text = await response.text();
        console.error('n8n response error:', text);
        throw new Error('Webhook request failed: ' + text);
      }
      const result = await response.json();
      console.log('n8n response body:', result);
      const facebookUrl = result.facebookUrl;
      // Update the related listing in Supabase
      const supabase = createClient();
      const { error: dbError } = await supabase
        .from('listings')
        .update({ facebook_url: facebookUrl })
        .eq('id', localListingId);
      if (dbError) {
        console.error('Supabase update error:', dbError.message);
        throw new Error(dbError.message);
      }
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      toast({
        title: 'Facebook post created successfully!',
        description: 'Your listing was posted to Facebook.',
        variant: 'default',
      });
      setLoading(false);
      if (typeof onSuccess === 'function') onSuccess();
    } catch (err) {
      console.error('Post to Facebook error:', err);
      toast({
        title: 'Facebook response pending, please try again.',
        description: (err as Error).message,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const mutation = useMutation({
    mutationFn: postToFacebook,
    onError: () => {}, // toast ile hata yönetimi yapıldığı için burada ek işleme gerek yok
  });

  return (
    <button
      type="button"
      className={`bg-purple-400 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded${loading ? ' opacity-50 cursor-not-allowed' : ''}`}
      onClick={() => mutation.mutate()}
      disabled={loading}
    >
      {loading ? 'Posting...' : 'Post'}
    </button>
  );
}
