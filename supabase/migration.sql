-- TaskFlow — Supabase database migration (v2)
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query)
-- after creating your project. This creates the tasks table, profiles table,
-- avatar storage bucket, and Row Level Security policies.
--
-- If you already ran the original migration, this version is backward
-- compatible — it adds the profiles table and new policies without dropping
-- existing data.

-- ============================================================================
-- PROFILES TABLE (must exist before any RLS or triggers reference it)
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_path text default '',
  status text not null default 'active',
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ============================================================================
-- TASKS TABLE
-- ============================================================================

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  "dueDate" text default '',
  priority text not null default 'medium',
  status text not null default 'todo',
  "order" integer not null default 0,
  "createdAt" bigint not null default extract(epoch from now()) * 1000,
  "updatedAt" bigint not null default extract(epoch from now()) * 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

-- ============================================================================
-- DROP OLD POLICIES (idempotent)
-- ============================================================================

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;

drop policy if exists "Users can view own tasks" on public.tasks;
drop policy if exists "Users can insert own tasks" on public.tasks;
drop policy if exists "Users can update own tasks" on public.tasks;
drop policy if exists "Users can delete own tasks" on public.tasks;
drop policy if exists "Active users can view own tasks" on public.tasks;
drop policy if exists "Active users can insert own tasks" on public.tasks;
drop policy if exists "Active users can update own tasks" on public.tasks;
drop policy if exists "Active users can delete own tasks" on public.tasks;

-- ============================================================================
-- PROFILES RLS POLICIES
-- ============================================================================

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================================
-- TASKS RLS POLICIES
-- Only active (non-deactivated) users can access their own tasks.
-- ============================================================================

create policy "Active users can view own tasks"
  on public.tasks for select
  using (
    auth.uid() = user_id
    and coalesce(
      (select status from public.profiles where id = auth.uid()),
      'active'
    ) = 'active'
  );

create policy "Active users can insert own tasks"
  on public.tasks for insert
  with check (
    auth.uid() = user_id
    and coalesce(
      (select status from public.profiles where id = auth.uid()),
      'active'
    ) = 'active'
  );

create policy "Active users can update own tasks"
  on public.tasks for update
  using (
    auth.uid() = user_id
    and coalesce(
      (select status from public.profiles where id = auth.uid()),
      'active'
    ) = 'active'
  )
  with check (
    auth.uid() = user_id
    and coalesce(
      (select status from public.profiles where id = auth.uid()),
      'active'
    ) = 'active'
  );

create policy "Active users can delete own tasks"
  on public.tasks for delete
  using (
    auth.uid() = user_id
    and coalesce(
      (select status from public.profiles where id = auth.uid()),
      'active'
    ) = 'active'
  );

create index if not exists tasks_user_id_idx on public.tasks(user_id);

-- ============================================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- BACKFILL PROFILES FOR EXISTING USERS
-- ============================================================================

insert into public.profiles (id, full_name)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', '')
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
)
on conflict (id) do nothing;

-- ============================================================================
-- AVATAR STORAGE BUCKET
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

drop policy if exists "Avatar upload own folder" on storage.objects;
drop policy if exists "Avatar read own folder" on storage.objects;
drop policy if exists "Avatar update own folder" on storage.objects;
drop policy if exists "Avatar delete own folder" on storage.objects;

create policy "Avatar upload own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Avatar read own folder"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Avatar update own folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Avatar delete own folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
