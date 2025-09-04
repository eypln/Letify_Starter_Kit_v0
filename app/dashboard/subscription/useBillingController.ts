"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useBillingController() {
  // ---- State (UI'ya data sağlamak için)
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [sub, setSub] = useState<SubRow | null>(null);

  const testMode = useMemo(
    () => (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '').startsWith('pk_test_'),
    []
  );

  const clearMsgs = () => { setErrorMsg(null); setInfoMsg(null); };

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }, []);

  const refresh = useCallback(async () => {
    clearMsgs();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUserId(null); setCredits(null); setSub(null);
      setErrorMsg('Lütfen oturum açın.');
      return;
    }
    setUserId(user.id);

    // Credits
    const { data: cust, error: custErr } = await supabase
      .from('billing_customers')
      .select('credits')
      .eq('user_id', user.id)
      .maybeSingle<CustRow>();
    if (!custErr) setCredits(cust?.credits ?? 0);

    // Latest subscription
    const { data: subRow } = await supabase
      .from('billing_subscriptions')
      .select('id, plan_type, billing_cycle, status, current_period_start, current_period_end, cancel_at_period_end, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<SubRow>();
    setSub(subRow ?? null);
  }, []);

  // ---- Actions (UI butonlarından çağır)
  const buySubscription = useCallback(async (plan: Plan, cycle: Cycle = 'monthly') => {
    try {
      clearMsgs(); setLoadingKey(`sub-${plan}-${cycle}`);
      const res = await fetch('/api/stripe/checkout/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, cycle }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to start checkout process');
      if (json?.url) window.location.href = json.url;
    } catch (e: any) {
      setErrorMsg(e?.message || 'Checkout başlatılamadı.');
    } finally {
      setLoadingKey(null);
    }
  }, []);

  const buyCredit = useCallback(async (amount: 10 | 20 | 50 | 100 | 200) => {
    try {
      clearMsgs(); setLoadingKey(`credit-${amount}`);
      const token = await getToken();
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ type: 'credit', amount: String(amount) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Checkout başlatılamadı (credit).');
      if (json?.url) window.location.href = json.url;
    } catch (e: any) {
      setErrorMsg(e?.message || 'Kredi satın alma başlatılamadı.');
    } finally {
      setLoadingKey(null);
    }
  }, [getToken]);

  const openPortal = useCallback(async () => {
    try {
      clearMsgs(); setLoadingKey('portal');
      const token = await getToken();
      const res = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Portal açılamadı.');
      if (json?.url) window.location.href = json.url;
    } catch (e: any) {
      setErrorMsg(e?.message || 'Portal açılamadı.');
    } finally {
      setLoadingKey(null);
    }
  }, [getToken]);

  // ---- Mount
  useEffect(() => {
    refresh();
    const url = new URL(window.location.href);
    const success = url.searchParams.get('success') || url.searchParams.get('status');
    if (success === '1' || success === 'success') {
      setInfoMsg('Ödeme tamamlandı. Bilgileriniz güncelleniyor…');
      setTimeout(refresh, 1500);
    }
  }, [refresh]);

  // ---- Dışarıya dön (UI dokunmadan kullanabil)
  return {
    // actions
    buySubscription, buyCredit, openPortal, refresh,
    // state
    loadingKey, errorMsg, infoMsg, testMode,
    userId, credits, sub,
  };
}
