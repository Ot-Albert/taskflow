-- TaskFlow — Supabase database migration (v3)
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query)
-- after creating your project. This creates the tasks table, profiles table,
-- login verification tables, avatar storage bucket, and Row Level Security
-- policies.
--
-- If you already ran v2, this version is backward compatible — it adds the
-- verification tables and tightens RLS to require verified login sessions.

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
-- LOGIN VERIFICATION TABLES (server-managed, not directly client-accessible)
-- ============================================================================

create table if not exists public.login_verification_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  password_session_id text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes',
  consumed_at timestamptz
);

-- Enable RLS on challenges with NO policies — this blocks all browser
-- access. Only Edge Functions with the service role key can read/write.
alter table public.login_verification_challenges enable row level security;

create table if not exists public.verified_login_sessions (
  session_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  verified_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);

-- Same: RLS enabled with no policies = no client access, service role only.
alter table public.verified_login_sessions enable row level security;

-- ============================================================================
-- HELPER FUNCTION: is_login_session_verified
-- Returns true if the current JWT session_id has been verified.
-- Used by RLS policies on tasks, profiles, and storage.
-- ============================================================================

create or replace function public.is_login_session_verified()
returns boolean
language sql
security definer set search_path = public
as $$
  select exists (
    select 1 from public.verified_login_sessions v
    where v.session_id = (auth.jwt() ->> 'session_id')
      and v.user_id = auth.uid()
      and v.expires_at > now()
  );
$$;

-- ============================================================================
-- DROP OLD POLICIES (idempotent)
-- ============================================================================

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Verified users can view own profile" on public.profiles;
drop policy if exists "Verified users can update own profile" on public.profiles;
drop policy if exists "Verified users can insert own profile" on public.profiles;

drop policy if exists "Users can view own tasks" on public.tasks;
drop policy if exists "Users can insert own tasks" on public.tasks;
drop policy if exists "Users can update own tasks" on public.tasks;
drop policy if exists "Users can delete own tasks" on public.tasks;
drop policy if exists "Active users can view own tasks" on public.tasks;
drop policy if exists "Active users can insert own tasks" on public.tasks;
drop policy if exists "Active users can update own tasks" on public.tasks;
drop policy if exists "Active users can delete own tasks" on public.tasks;
drop policy if exists "Verified active users can view own tasks" on public.tasks;
drop policy if exists "Verified active users can insert own tasks" on public.tasks;
drop policy if exists "Verified active users can update own tasks" on public.tasks;
drop policy if exists "Verified active users can delete own tasks" on public.tasks;

-- ============================================================================
-- PROFILES RLS POLICIES (require verified login session)
-- ============================================================================

create policy "Verified users can view own profile"
  on public.profiles for select
  using (
    auth.uid() = id
    and public.is_login_session_verified()
  );

create policy "Verified users can insert own profile"
  on public.profiles for insert
  with check (
    auth.uid() = id
    and public.is_login_session_verified()
  );

create policy "Verified users can update own profile"
  on public.profiles for update
  using (
    auth.uid() = id
    and public.is_login_session_verified()
  )
  with check (
    auth.uid() = id
    and public.is_login_session_verified()
  );

-- ============================================================================
-- TASKS RLS POLICIES (require verified login session + active profile)
-- ============================================================================

create policy "Verified active users can view own tasks"
  on public.tasks for select
  using (
    auth.uid() = user_id
    and public.is_login_session_verified()
    and coalesce(
      (select status from public.profiles where id = auth.uid()),
      'active'
    ) = 'active'
  );

create policy "Verified active users can insert own tasks"
  on public.tasks for insert
  with check (
    auth.uid() = user_id
    and public.is_login_session_verified()
    and coalesce(
      (select status from public.profiles where id = auth.uid()),
      'active'
    ) = 'active'
  );

create policy "Verified active users can update own tasks"
  on public.tasks for update
  using (
    auth.uid() = user_id
    and public.is_login_session_verified()
    and coalesce(
      (select status from public.profiles where id = auth.uid()),
      'active'
    ) = 'active'
  )
  with check (
    auth.uid() = user_id
    and public.is_login_session_verified()
    and coalesce(
      (select status from public.profiles where id = auth.uid()),
      'active'
    ) = 'active'
  );

create policy "Verified active users can delete own tasks"
  on public.tasks for delete
  using (
    auth.uid() = user_id
    and public.is_login_session_verified()
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
drop policy if exists "Verified avatar upload own folder" on storage.objects;
drop policy if exists "Verified avatar read own folder" on storage.objects;
drop policy if exists "Verified avatar update own folder" on storage.objects;
drop policy if exists "Verified avatar delete own folder" on storage.objects;

create policy "Verified avatar upload own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_login_session_verified()
  );

create policy "Verified avatar read own folder"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_login_session_verified()
  );

create policy "Verified avatar update own folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_login_session_verified()
  );

create policy "Verified avatar delete own folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_login_session_verified()
  );

-- ============================================================================
-- CLEANUP: Remove expired challenges and verified sessions periodically
-- (Edge Functions also check expiry, but this keeps the tables small.)
-- ============================================================================

delete from public.login_verification_challenges
  where expires_at < now() and consumed_at is null;

delete from public.verified_login_sessions
  where expires_at < now();
