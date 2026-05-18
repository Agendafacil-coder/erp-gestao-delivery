
-- ============ ENUMS ============
create type public.app_role as enum ('owner','admin','dispatcher','manager','driver','viewer');
create type public.tenant_plan as enum ('trial','starter','pro','enterprise');

-- ============ TENANTS ============
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan tenant_plan not null default 'trial',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tenants enable row level security;

-- ============ STORES ============
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_stores_tenant on public.stores(tenant_id);
alter table public.stores enable row level security;

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  current_tenant_id uuid references public.tenants(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- ============ USER ROLES ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, tenant_id, role)
);
create index idx_user_roles_user on public.user_roles(user_id);
create index idx_user_roles_tenant on public.user_roles(tenant_id);
alter table public.user_roles enable row level security;

-- ============ SECURITY DEFINER FUNCTIONS ============
create or replace function public.has_role(_user_id uuid, _tenant_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and tenant_id = _tenant_id and role = _role
  )
$$;

create or replace function public.is_tenant_member(_user_id uuid, _tenant_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and tenant_id = _tenant_id
  )
$$;

create or replace function public.is_tenant_admin(_user_id uuid, _tenant_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and tenant_id = _tenant_id
      and role in ('owner','admin')
  )
$$;

-- ============ TIMESTAMP TRIGGER ============
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_tenants_updated before update on public.tenants
  for each row execute function public.update_updated_at_column();
create trigger trg_stores_updated before update on public.stores
  for each row execute function public.update_updated_at_column();
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.update_updated_at_column();

-- ============ AUTO PROFILE ON SIGNUP ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ POLICIES: profiles ============
create policy "users read own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "tenant members read peer profiles" on public.profiles
  for select to authenticated using (
    exists (
      select 1 from public.user_roles me
      join public.user_roles peer on peer.tenant_id = me.tenant_id
      where me.user_id = auth.uid() and peer.user_id = profiles.id
    )
  );
create policy "users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);
create policy "users insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

-- ============ POLICIES: tenants ============
create policy "members read tenant" on public.tenants
  for select to authenticated using (public.is_tenant_member(auth.uid(), id));
create policy "authenticated create tenant" on public.tenants
  for insert to authenticated with check (true);
create policy "admins update tenant" on public.tenants
  for update to authenticated using (public.is_tenant_admin(auth.uid(), id));
create policy "owners delete tenant" on public.tenants
  for delete to authenticated using (public.has_role(auth.uid(), id, 'owner'));

-- ============ POLICIES: stores ============
create policy "members read stores" on public.stores
  for select to authenticated using (public.is_tenant_member(auth.uid(), tenant_id));
create policy "admins insert stores" on public.stores
  for insert to authenticated with check (public.is_tenant_admin(auth.uid(), tenant_id));
create policy "admins update stores" on public.stores
  for update to authenticated using (public.is_tenant_admin(auth.uid(), tenant_id));
create policy "admins delete stores" on public.stores
  for delete to authenticated using (public.is_tenant_admin(auth.uid(), tenant_id));

-- ============ POLICIES: user_roles ============
create policy "users read own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid());
create policy "admins read tenant roles" on public.user_roles
  for select to authenticated using (public.is_tenant_admin(auth.uid(), tenant_id));
create policy "admins manage tenant roles" on public.user_roles
  for insert to authenticated with check (public.is_tenant_admin(auth.uid(), tenant_id));
create policy "admins update tenant roles" on public.user_roles
  for update to authenticated using (public.is_tenant_admin(auth.uid(), tenant_id));
create policy "admins delete tenant roles" on public.user_roles
  for delete to authenticated using (public.is_tenant_admin(auth.uid(), tenant_id));

-- ============ BOOTSTRAP: first user of new tenant becomes owner ============
create or replace function public.create_tenant_with_owner(_name text, _slug text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_tenant_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into public.tenants (name, slug) values (_name, _slug) returning id into new_tenant_id;
  insert into public.user_roles (user_id, tenant_id, role) values (auth.uid(), new_tenant_id, 'owner');
  update public.profiles set current_tenant_id = new_tenant_id where id = auth.uid();
  return new_tenant_id;
end;
$$;
