-- Ikigai Sales CRM v2: sign-up with approval, brand settings, products, quotations,
-- visit check-ins with photos, permission log. Run after schema.sql. Safe to re-run.

-- 1) Team: status for self sign-up + approval ------------------------------------
alter table public.profiles add column if not exists status text not null default 'pending';
alter table public.profiles add column if not exists phone text;
do $$ begin
  alter table public.profiles add constraint profiles_status_chk check (status in ('pending','active','disabled'));
exception when duplicate_object then null; end $$;
-- everyone who existed before v2 keeps working
-- (runs once: on first run nobody is active yet, so all existing members are activated)
update public.profiles set status = 'active'
  where not exists (select 1 from public.profiles p2 where p2.status = 'active');

create or replace function public.is_active() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'active');
$$;
create or replace function public.is_lead() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'lead' and status = 'active');
$$;
create or replace function public.can_access_customer(cid bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_lead() or (public.is_active() and exists (
    select 1 from public.customers where id = cid and owner_id = auth.uid()));
$$;

-- First account ever becomes an active lead; later sign-ups wait for approval.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare first boolean;
begin
  select not exists (select 1 from public.profiles) into first;
  insert into public.profiles (id, full_name, phone, role, status)
  values (new.id,
          coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email, '@', 1)),
          nullif(new.raw_user_meta_data->>'phone',''),
          case when first then 'lead' else 'sales' end,
          case when first then 'active' else 'pending' end)
  on conflict (id) do nothing;
  return new;
end $$;

-- Only an active lead may change role/status; anyone may edit their own name/phone.
create table if not exists public.perm_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  target_id uuid references public.profiles(id) on delete cascade,
  change text not null,
  created_at timestamptz not null default now()
);
create or replace function public.guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.status is distinct from old.status) then
    if not public.is_lead() then raise exception 'เฉพาะหัวหน้าทีมที่เปลี่ยนสิทธิ์ได้'; end if;
    if new.id = auth.uid() then raise exception 'เปลี่ยนสิทธิ์ของตัวเองไม่ได้'; end if;
    insert into public.perm_log (actor_id, target_id, change)
    values (auth.uid(), new.id, concat_ws(', ',
      case when new.role is distinct from old.role then 'บทบาท ' || old.role || ' → ' || new.role end,
      case when new.status is distinct from old.status then 'สถานะ ' || old.status || ' → ' || new.status end));
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles for each row execute function public.guard_profile();

drop policy if exists "profiles lead manage" on public.profiles;
drop policy if exists "profiles update" on public.profiles;
create policy "profiles update" on public.profiles for update to authenticated
  using (public.is_lead() or id = auth.uid()) with check (public.is_lead() or id = auth.uid());

alter table public.perm_log enable row level security;
drop policy if exists "perm_log read" on public.perm_log;
create policy "perm_log read" on public.perm_log for select to authenticated using (public.is_lead());

-- customers: owners must be active
drop policy if exists "customers select" on public.customers;
create policy "customers select" on public.customers for select to authenticated
  using (public.is_lead() or (public.is_active() and owner_id = auth.uid()));
drop policy if exists "customers insert" on public.customers;
create policy "customers insert" on public.customers for insert to authenticated
  with check (public.is_lead() or (public.is_active() and owner_id = auth.uid()));
drop policy if exists "customers update" on public.customers;
create policy "customers update" on public.customers for update to authenticated
  using (public.is_lead() or (public.is_active() and owner_id = auth.uid()))
  with check (public.is_lead() or (public.is_active() and owner_id = auth.uid()));
drop policy if exists "targets read" on public.targets;
create policy "targets read" on public.targets for select to authenticated using (public.is_active());

-- 2) Brand / company settings (one row) ----------------------------------------
create table if not exists public.org (
  id int primary key default 1 check (id = 1),
  name text not null default 'Ikigai Sales',
  tagline text default 'ระบบติดตามลูกค้าของทีมเซลล์',
  color text default '#1f6f5c',
  logo_url text,
  legal_name text,
  address text,
  tax_id text,
  phone text,
  email text,
  vat_rate numeric(5,2) not null default 7,
  quote_note text default 'ราคานี้ยืนราคา 30 วัน',
  updated_at timestamptz not null default now()
);
insert into public.org (id) values (1) on conflict do nothing;
alter table public.org enable row level security;
drop policy if exists "org read" on public.org;
create policy "org read" on public.org for select to anon, authenticated using (true);
drop policy if exists "org write" on public.org;
create policy "org write" on public.org for update to authenticated using (public.is_lead()) with check (public.is_lead());

-- 3) Products ------------------------------------------------------------------
create table if not exists public.products (
  id bigint generated always as identity primary key,
  name text not null,
  sku text,
  unit text default 'ชิ้น',
  price numeric(14,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.products enable row level security;
drop policy if exists "products read" on public.products;
create policy "products read" on public.products for select to authenticated using (public.is_active());
drop policy if exists "products write" on public.products;
create policy "products write" on public.products for all to authenticated using (public.is_lead()) with check (public.is_lead());

-- 4) Quotations ----------------------------------------------------------------
create table if not exists public.quotes (
  id bigint generated always as identity primary key,
  customer_id bigint not null references public.customers(id) on delete cascade,
  number text not null,
  items jsonb not null default '[]',   -- [{name, unit, qty, price}]
  discount numeric(14,2) not null default 0,
  vat_rate numeric(5,2) not null default 7,
  subtotal numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  status text not null default 'draft' check (status in ('draft','sent','accepted','rejected')),
  valid_until date,
  note text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists quotes_customer_idx on public.quotes(customer_id);
alter table public.quotes enable row level security;
drop policy if exists "quotes all" on public.quotes;
create policy "quotes all" on public.quotes for all to authenticated
  using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id));

-- 5) Visit check-ins: activities get a kind, location and photos -----------------
alter table public.activities add column if not exists kind text not null default 'note';
alter table public.activities add column if not exists lat double precision;
alter table public.activities add column if not exists lng double precision;
alter table public.activities add column if not exists photos text[] not null default '{}';

insert into storage.buckets (id, name, public) values ('visit-photos', 'visit-photos', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('brand', 'brand', true) on conflict (id) do nothing;
drop policy if exists "visit photos read" on storage.objects;
create policy "visit photos read" on storage.objects for select to authenticated
  using (bucket_id = 'visit-photos' and public.is_active());
drop policy if exists "visit photos upload" on storage.objects;
create policy "visit photos upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'visit-photos' and public.is_active());
drop policy if exists "brand upload" on storage.objects;
create policy "brand upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'brand' and public.is_lead());
drop policy if exists "brand update" on storage.objects;
create policy "brand update" on storage.objects for update to authenticated
  using (bucket_id = 'brand' and public.is_lead());
