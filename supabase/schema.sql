-- ─────────────────────────────────────────────────────────────
-- Voyage AI — Supabase schema (free tier / PostgreSQL)
-- Run in the Supabase SQL editor. Row Level Security keeps each
-- user's data private; public itineraries are shareable.
-- ─────────────────────────────────────────────────────────────

-- Travel profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  traveler_type text,
  interests text[] default '{}',
  food_preference text,
  budget text,
  activity_level text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Saved itineraries (full plan stored as JSONB for portability)
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  destination text not null,
  days int not null,
  plan jsonb not null,
  is_public boolean default false,
  is_favorite boolean default false,
  created_at timestamptz default now()
);

create index if not exists trips_user_id_idx on public.trips (user_id);
create index if not exists trips_public_idx on public.trips (is_public) where is_public;

-- ── Row Level Security ──
alter table public.profiles enable row level security;
alter table public.trips enable row level security;

create policy "profiles are self-managed"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "trips are self-managed"
  on public.trips for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "public trips are readable by anyone"
  on public.trips for select
  using (is_public = true);
