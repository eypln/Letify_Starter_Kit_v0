
-- Enable RLS and add policies for activity table
alter table public.activity enable row level security;

create policy "activity_insert_own"
  on public.activity
  for insert
  with check (auth.uid() = user_id);

create policy "activity_select_own"
  on public.activity
  for select
  using (auth.uid() = user_id);
-- Supabase activity tablosu: kullanıcı aktiviteleri (listing, subscription, credit, profil update, vs.)
create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (user_id) on delete set null,
  type text not null, -- 'listing', 'subscription', 'credit', 'profile_update', vs.
  data jsonb,         -- ilgili ek veri (ör: listingId, amount, vs.)
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_user_id on public.activity (user_id);
create index if not exists idx_activity_created_at on public.activity (created_at desc);
