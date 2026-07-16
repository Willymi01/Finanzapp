-- Im Supabase SQL Editor ausführen
create table if not exists public.finance_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  app_state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.finance_profiles enable row level security;

drop policy if exists "Users read own finance profile" on public.finance_profiles;
create policy "Users read own finance profile"
on public.finance_profiles for select
using (auth.uid() = user_id);

drop policy if exists "Users insert own finance profile" on public.finance_profiles;
create policy "Users insert own finance profile"
on public.finance_profiles for insert
with check (auth.uid() = user_id);

drop policy if exists "Users update own finance profile" on public.finance_profiles;
create policy "Users update own finance profile"
on public.finance_profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
