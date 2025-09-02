-- Letify Billing System - Stripe Integration
-- Migration: Billing tables for subscriptions and credit management

-- Billing customers table
create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text unique not null,
  credits int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_user_billing unique(user_id)
);

-- Billing credit ledger for tracking credit changes
create table if not exists public.billing_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta int not null, -- positive for adding credits, negative for spending
  reason text not null,
  stripe_payment_intent_id text,
  stripe_invoice_id text,
  created_at timestamptz not null default now()
);

-- Billing subscriptions table (extends existing subscriptions)
create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_subscription_id text unique not null,
  stripe_customer_id text not null,
  status text check (status in ('active','past_due','canceled','incomplete','trialing','unpaid')) not null,
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  plan_type text check (plan_type in ('mini','full')) not null,
  billing_cycle text check (billing_cycle in ('monthly','yearly')) not null default 'monthly',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Billing payments table for one-time payments (credit purchases)
create table if not exists public.billing_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_payment_intent_id text unique not null,
  amount_cents int not null,
  currency text not null default 'eur',
  status text check (status in ('pending','succeeded','failed','canceled')) not null,
  credit_amount int, -- how many credits this payment gave
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Updated at triggers
create or replace function public.set_updated_at_billing()
returns trigger language plpgsql as $$
begin
  NEW.updated_at = now();
  return NEW;
end; $$;

drop trigger if exists trg_billing_customers_updated on public.billing_customers;
create trigger trg_billing_customers_updated
before update on public.billing_customers
for each row execute function public.set_updated_at_billing();

drop trigger if exists trg_billing_subscriptions_updated on public.billing_subscriptions;
create trigger trg_billing_subscriptions_updated
before update on public.billing_subscriptions
for each row execute function public.set_updated_at_billing();

drop trigger if exists trg_billing_payments_updated on public.billing_payments;
create trigger trg_billing_payments_updated
before update on public.billing_payments
for each row execute function public.set_updated_at_billing();

-- RLS policies for billing tables
alter table public.billing_customers enable row level security;
alter table public.billing_credit_ledger enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_payments enable row level security;

-- Billing customers policies
create policy "billing_customers_own_select" on public.billing_customers
for select using (auth.uid() = user_id);
create policy "billing_customers_own_insert" on public.billing_customers
for insert with check (auth.uid() = user_id);
create policy "billing_customers_own_update" on public.billing_customers
for update using (auth.uid() = user_id);

-- Billing credit ledger policies
create policy "billing_credit_ledger_own_select" on public.billing_credit_ledger
for select using (auth.uid() = user_id);
create policy "billing_credit_ledger_own_insert" on public.billing_credit_ledger
for insert with check (auth.uid() = user_id);

-- Billing subscriptions policies
create policy "billing_subscriptions_own_select" on public.billing_subscriptions
for select using (auth.uid() = user_id);
create policy "billing_subscriptions_own_insert" on public.billing_subscriptions
for insert with check (auth.uid() = user_id);
create policy "billing_subscriptions_own_update" on public.billing_subscriptions
for update using (auth.uid() = user_id);

-- Billing payments policies
create policy "billing_payments_own_select" on public.billing_payments
for select using (auth.uid() = user_id);
create policy "billing_payments_own_insert" on public.billing_payments
for insert with check (auth.uid() = user_id);
create policy "billing_payments_own_update" on public.billing_payments
for update using (auth.uid() = user_id);

-- Helper function for incrementing credits
create or replace function public.increment_credits(p_user_id uuid, p_delta int)
returns void language plpgsql security definer as $$
begin
  insert into public.billing_customers (user_id, credits)
  values (p_user_id, p_delta)
  on conflict (user_id) 
  do update set 
    credits = billing_customers.credits + p_delta,
    updated_at = now();
end; $$;

-- Noop function for fallback
create or replace function public.noop()
returns void language plpgsql as $$
begin
  -- do nothing
end; $$;