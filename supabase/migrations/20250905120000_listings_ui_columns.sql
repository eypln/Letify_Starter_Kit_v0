alter table public.listings
  add column if not exists created_at    timestamptz not null default now(),
  add column if not exists city          text,
  add column if not exists bedrooms      int,
  add column if not exists bathrooms     int,
  add column if not exists property_type text,
  add column if not exists fb_post_url   text,
  add column if not exists fb_reels_url  text;

create index if not exists listings_created_at_idx on public.listings(created_at desc);
