-- TaskFlow — Supabase database migration
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query)
-- after creating your project. This creates the tasks table and Row Level
-- Security policies so each user can only access their own tasks.

-- Tasks table
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

-- Row Level Security: users can only see and modify their own tasks
alter table public.tasks enable row level security;

-- Allow users to select their own tasks
create policy "Users can view own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

-- Allow users to insert their own tasks
create policy "Users can insert own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

-- Allow users to update their own tasks
create policy "Users can update own tasks"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allow users to delete their own tasks
create policy "Users can delete own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);

-- Index for faster queries per user
create index if not exists tasks_user_id_idx on public.tasks(user_id);
