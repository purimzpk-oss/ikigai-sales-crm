-- Ikigai Sales CRM: database schema for Supabase (Postgres)
-- Run once in Supabase Dashboard > SQL Editor.

-- Roles: 'lead' sees and edits everything; 'sales' sees and edits only their own customers.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'sales' check (role in ('lead','sales')),
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id bigint generated always as identity primary key,
  name text not null,
  contact_name text,
  phone text,
  line_id text,
  email text,
  address text,
  lat double precision,
  lng double precision,
  stage text not null default 'lead'
    check (stage in ('lead','contact','quote','nego','won','lost')),
  deal_value numeric(14,2) not null default 0,
  source text,
  lost_reason text,
  owner_id uuid references public.profiles(id) on delete set null,
  closed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customers_owner_idx on public.customers(owner_id);
create index if not exists customers_stage_idx on public.customers(stage);

create table if not exists public.activities (
  id bigint generated always as identity primary key,
  customer_id bigint not null references public.customers(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null default auth.uid(),
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists activities_customer_idx on public.activities(customer_id);

create table if not exists public.tasks (
  id bigint generated always as identity primary key,
  customer_id bigint not null references public.customers(id) on delete cascade,
  assignee_id uuid references public.profiles(id) on delete set null default auth.uid(),
  title text not null,
  due_date date not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists tasks_due_idx on public.tasks(due_date) where not done;

-- Monthly sales target for the whole team, e.g. month = '2026-11-01'
create table if not exists public.targets (
  month date primary key,
  amount numeric(14,2) not null
);

-- Helpers --------------------------------------------------------------
create or replace function public.is_lead() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'lead');
$$;

create or replace function public.can_access_customer(cid bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_lead() or exists (
    select 1 from public.customers where id = cid and owner_id = auth.uid());
$$;

-- Keep updated_at / closed_at current
create or replace function public.touch_customer() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if new.stage = 'won' and (tg_op = 'INSERT' or old.stage is distinct from 'won') then
    new.closed_at := coalesce(new.closed_at, current_date);
  elsif new.stage <> 'won' then
    new.closed_at := null;
  end if;
  return new;
end $$;
drop trigger if exists customers_touch on public.customers;
create trigger customers_touch before insert or update on public.customers
for each row execute function public.touch_customer();

-- New sign-ups get a profile automatically (role defaults to 'sales')
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Row level security ---------------------------------------------------
alter table public.profiles   enable row level security;
alter table public.customers  enable row level security;
alter table public.activities enable row level security;
alter table public.tasks      enable row level security;
alter table public.targets    enable row level security;

drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles lead manage" on public.profiles;
create policy "profiles lead manage" on public.profiles for update to authenticated
  using (public.is_lead()) with check (public.is_lead());

drop policy if exists "customers select" on public.customers;
create policy "customers select" on public.customers for select to authenticated
  using (public.is_lead() or owner_id = auth.uid());
drop policy if exists "customers insert" on public.customers;
create policy "customers insert" on public.customers for insert to authenticated
  with check (public.is_lead() or owner_id = auth.uid());
drop policy if exists "customers update" on public.customers;
create policy "customers update" on public.customers for update to authenticated
  using (public.is_lead() or owner_id = auth.uid())
  with check (public.is_lead() or owner_id = auth.uid());
drop policy if exists "customers delete" on public.customers;
create policy "customers delete" on public.customers for delete to authenticated
  using (public.is_lead());

drop policy if exists "activities all" on public.activities;
create policy "activities all" on public.activities for all to authenticated
  using (public.can_access_customer(customer_id))
  with check (public.can_access_customer(customer_id));

drop policy if exists "tasks all" on public.tasks;
create policy "tasks all" on public.tasks for all to authenticated
  using (public.can_access_customer(customer_id))
  with check (public.can_access_customer(customer_id));

drop policy if exists "targets read" on public.targets;
create policy "targets read" on public.targets for select to authenticated using (true);
drop policy if exists "targets write" on public.targets;
create policy "targets write" on public.targets for all to authenticated
  using (public.is_lead()) with check (public.is_lead());
