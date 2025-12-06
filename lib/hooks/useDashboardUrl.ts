import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useDashboardUrl() {
  const [dashboardUrl, setDashboardUrl] = useState('/dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserRole() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (profile?.role === 'teamleader') {
          setDashboardUrl('/teamleader');
        } else {
          setDashboardUrl('/dashboard');
        }
      }
      
      setLoading(false);
    }

    fetchUserRole();
  }, []);

  return { dashboardUrl, loading };
}
