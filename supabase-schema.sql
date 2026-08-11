-- ============================================================
-- The Volume Ledger — Supabase schema
-- Run this once in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this whole file → Run)
-- ============================================================

-- One row per user, holding their whole collection as JSON.
-- Simpler than a row-per-series design, and plenty fast at this scale.
create table if not exists collections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  entries jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- One row per cover image. Kept separate from collections so editing
-- a series' text fields never re-uploads every cover image.
create table if not exists covers (
  user_id uuid not null references auth.users(id) on delete cascade,
  series_id text not null,
  data text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, series_id)
);

-- ============================================================
-- Row Level Security
-- This is the part that actually protects people's data — it's
-- enforced by the database itself, not by anything the app's
-- JavaScript does. Even if the frontend code had a bug, or
-- someone opened the browser console and tried to query another
-- user's data directly, these rules would block it.
-- ============================================================

alter table collections enable row level security;
alter table covers enable row level security;

create policy "read own collection"
  on collections for select
  using (auth.uid() = user_id);

create policy "insert own collection"
  on collections for insert
  with check (auth.uid() = user_id);

create policy "update own collection"
  on collections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own collection"
  on collections for delete
  using (auth.uid() = user_id);

create policy "read own covers"
  on covers for select
  using (auth.uid() = user_id);

create policy "insert own covers"
  on covers for insert
  with check (auth.uid() = user_id);

create policy "update own covers"
  on covers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own covers"
  on covers for delete
  using (auth.uid() = user_id);
