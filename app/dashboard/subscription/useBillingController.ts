"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
// Supabase client'ı doğrudan import edelim
import { createClient } from '@/lib/supabase/client';

type Cycle = 'monthly' | 'yearly';
type Plan = 'mini' | 'full';

type SubRow = {
  id: string;
  plan_type: Plan;
  billing_cycle: Cycle;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  created_at: string;
};

type CustRow = { credits: number };

// Supabase client'ı tekil olarak oluştur
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient();
    console.log("Created new Supabase client instance");
  } else {
    console.log("Using existing Supabase client instance");
  }
  return supabaseClient;
}

export function useBillingController() {
  // Create Supabase client using singleton pattern
  const supabase = useMemo(() => getSupabaseClient(), []);
  
  // ---- State (UI'ya data sağlamak için)
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [sub, setSub] = useState<SubRow | null>(null);
  const [monthlyPostUsage, setMonthlyPostUsage] = useState<number | null>(null);

  const testMode = useMemo(
    () => (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '').startsWith('pk_test_'),
    []
  );

  const clearMsgs = () => { setErrorMsg(null); setInfoMsg(null); };

  const getToken = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log("getToken session:", session);
      return session?.access_token;
    } catch (err) {
      console.error("getToken error:", err);
      return null;
    }
  }, [supabase]);

  const refresh = useCallback(async () => {
    clearMsgs();
    try {
      console.log("Starting refresh - checking user session");
      
      // Try to get user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log("Session data:", session, "Session error:", sessionError);
      
      if (sessionError) {
        console.error("Session error:", sessionError);
      }
      
      if (!session || !session.user) {
        console.log("No active session found");
        setUserId(null); 
        setCredits(null); 
        setSub(null);
        // Don't show error message on refresh, just clear data
        return;
      }
      
      const user = session.user;
      console.log("User found:", user);
      setUserId(user.id);

      // Credits
      const { data: cust, error: custErr } = await supabase
        .from('billing_customers')
        .select('credits')
        .eq('user_id', user.id)
        .maybeSingle<CustRow>();
      console.log("refresh credits data:", cust, "error:", custErr);
      if (!custErr) setCredits(cust?.credits ?? 0);

      // Latest subscription
      const { data: subRow } = await supabase
        .from('billing_subscriptions')
        .select('id, plan_type, billing_cycle, status, current_period_start, current_period_end, cancel_at_period_end, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<SubRow>();
      console.log("refresh subscription data:", subRow);
      setSub(subRow ?? null);

      // Bu ay yapılan post sayısını çek
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const { data: postUsage } = await supabase
        .from('user_post_usage')
        .select('count')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .maybeSingle<{ count: number }>();
      console.log("refresh post usage data:", postUsage);
      setMonthlyPostUsage(postUsage?.count ?? 0);
    } catch (err) {
      console.error("refresh error:", err);
      setErrorMsg('Failed to refresh data.');
    }
  }, [supabase]);

  // ---- Actions (UI butonlarından çağır)
  const buySubscription = useCallback(async (plan: Plan, cycle: Cycle = 'monthly') => {
    try {
      clearMsgs(); setLoadingKey(`sub-${plan}-${cycle}`);
      
      // Check if user is authenticated
      console.log("Checking user authentication for subscription purchase");
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log("Session for subscription purchase:", session, "error:", sessionError);
      
      if (sessionError) {
        console.error("Session error during subscription purchase:", sessionError);
        throw new Error('Authentication error. Please try signing in again.');
      }
      
      if (!session || !session.user) {
        console.error("No active session for subscription purchase");
        throw new Error('Please sign in to purchase a subscription.');
      }
      
      const res = await fetch('/api/stripe/checkout/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, cycle }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to start checkout process');
      if (json?.url && typeof window !== 'undefined') window.location.href = json.url;
    } catch (e: any) {
      setErrorMsg(e?.message || 'Checkout could not be started.');
    } finally {
      setLoadingKey(null);
    }
  }, [supabase]);

  const buyCredit = useCallback(async (amount: 10 | 20 | 50 | 100 | 200) => {
    try {
      clearMsgs(); 
      setLoadingKey(`credit-${amount}`);
      
      console.log("=== Credit Purchase Process Started ===");
      console.log("Requested credit amount:", amount);
      
      // Önce oturumu doğrudan al
      console.log("Step 1: Getting session data directly");
      const { data: { session: sessionData }, error: sessionError } = await supabase.auth.getSession();
      console.log("Session data result:", {
        hasSession: !!sessionData,
        hasUser: !!sessionData?.user,
        userId: sessionData?.user?.id,
        userEmail: sessionData?.user?.email,
        hasAccessToken: !!sessionData?.access_token,
        sessionError: sessionError?.message
      });
      
      if (sessionError) {
        console.error("Step 1 FAILED - Session fetch error:", sessionError);
        setErrorMsg('Session error. Please try signing in again. (Error: ' + sessionError.message + ')');
        return;
      }
      
      if (!sessionData || !sessionData.user) {
        console.error("Step 1 FAILED - No session or user found");
        setErrorMsg('Please sign in to purchase credits. (No active session)');
        return;
      }
      
      const user = sessionData.user;
      console.log("Step 1 SUCCESS - User authenticated:", user.id, "Email:", user.email);
      
      // Kullanıcı bilgilerini doğrula
      if (!user.id) {
        console.error("Step 2 FAILED - User ID is missing");
        setErrorMsg('User information is incomplete. Please sign in again. (User ID missing)');
        return;
      }
      
      if (!sessionData.access_token) {
        console.error("Step 2 FAILED - Access token missing");
        setErrorMsg('Authentication token missing. Please sign in again. (No token found)');
        return;
      }
      
      const token = sessionData.access_token;
      console.log("Step 2 SUCCESS - Using access token for credit purchase, token length:", token.length);
      
      // Kredi satın alma isteğini gönder
      console.log("Step 3: Sending credit purchase request");
      const res = await fetch('/api/stripe/checkout/credits', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ credits: String(amount) }),
      });
      
      console.log("Step 3 result:", {
        status: res.status,
        statusText: res.statusText
      });
      
      const json = await res.json().catch(() => ({}));
      console.log("Step 3 response json:", json);
      
      if (!res.ok) {
        const errorMessage = json?.error || 'Checkout could not be started (credit).';
        console.error("Step 3 FAILED - Checkout error:", errorMessage);
        setErrorMsg(errorMessage);
        return;
      }
      
      console.log("Step 3 SUCCESS - Checkout completed");
      
      if (json?.url && typeof window !== 'undefined') {
        console.log("Redirecting to Stripe checkout:", json.url);
        window.location.href = json.url;
      }
    } catch (e: any) {
      console.error("BUY CREDIT GENERAL ERROR:", e);
      setErrorMsg(e?.message || 'Credit purchase could not be started.');
    } finally {
      console.log("=== Credit Purchase Process Ended ===");
      setLoadingKey(null);
    }
  }, [supabase]);

  const openPortal = useCallback(async () => {
    try {
      clearMsgs(); setLoadingKey('portal');
      const token = await getToken();
      const res = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'Portal could not be opened.');
      if (json?.url && typeof window !== 'undefined') window.location.href = json.url;
    } catch (e: any) {
      setErrorMsg(e?.message || 'Portal could not be opened.');
    } finally {
      setLoadingKey(null);
    }
  }, [getToken]);

  // ---- Mount
  useEffect(() => {
    refresh();
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const success = url.searchParams.get('success') || url.searchParams.get('status');
      if (success === '1' || success === 'success') {
        setInfoMsg('Payment completed. Your information is being updated…');
        setTimeout(refresh, 1500);
      }
    }
  }, [refresh]);

  // ---- Dışarıya dön (UI dokunmadan kullanabil)
  return {
    // actions
    buySubscription, buyCredit, openPortal, refresh,
    // state
    loadingKey, errorMsg, infoMsg, testMode,
    userId, credits, sub, monthlyPostUsage,
  };
}