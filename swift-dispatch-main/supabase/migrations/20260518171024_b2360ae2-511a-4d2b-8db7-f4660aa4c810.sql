
-- ============ ENUMS ============
create type public.order_status as enum (
  'novo','em_preparo','pronto','aguardando_entregador',
  'em_rota_coleta','retirado','em_rota_entrega','entregue','cancelado'
);
create type public.order_priority as enum ('baixa','normal','alta','critica');
create type public.driver_status as enum ('offline','disponivel','em_rota','pausado');
create type public.vehicle_type as enum ('moto','bike','carro','a_pe');

-- ============ DRIVERS ============
create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  phone text,
  vehicle vehicle_type not null default 'moto',
  status driver_status not null default 'offline',
  lat double precision,
  lng double precision,
  rating numeric(3,2) default 5.00,
  active_orders int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_drivers_tenant on public.drivers(tenant_id);
create index idx_drivers_status on public.drivers(tenant_id, status);
alter table public.drivers enable row level security;

-- ============ ORDERS ============
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  driver_id uuid references public.drivers(id) on delete set null,
  code text not null,
  status order_status not null default 'novo',
  priority order_priority not null default 'normal',
  customer_name text not null,
  customer_phone text,
  address text not null,
  lat double precision,
  lng double precision,
  items_count int not null default 1,
  total_amount numeric(12,2) not null default 0,
  channel text,
  notes text,
  sla_minutes int not null default 45,
  placed_at timestamptz not null default now(),
  ready_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, code)
);
create index idx_orders_tenant_status on public.orders(tenant_id, status);
create index idx_orders_driver on public.orders(driver_id);
create index idx_orders_placed on public.orders(tenant_id, placed_at desc);
alter table public.orders enable row level security;

-- ============ ORDER EVENTS ============
create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  from_status order_status,
  to_status order_status not null,
  note text,
  created_at timestamptz not null default now()
);
create index idx_order_events_order on public.order_events(order_id, created_at desc);
alter table public.order_events enable row level security;

-- ============ TRIGGERS ============
create trigger trg_drivers_updated before update on public.drivers
  for each row execute function public.update_updated_at_column();
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.update_updated_at_column();

create or replace function public.log_order_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.order_events(order_id, tenant_id, actor_id, from_status, to_status)
    values (new.id, new.tenant_id, auth.uid(), null, new.status);
    return new;
  end if;
  if (new.status is distinct from old.status) then
    insert into public.order_events(order_id, tenant_id, actor_id, from_status, to_status)
    values (new.id, new.tenant_id, auth.uid(), old.status, new.status);
    -- stamp lifecycle timestamps
    if new.status = 'pronto' and new.ready_at is null then new.ready_at := now(); end if;
    if new.status = 'retirado' and new.picked_up_at is null then new.picked_up_at := now(); end if;
    if new.status = 'entregue' and new.delivered_at is null then new.delivered_at := now(); end if;
  end if;
  return new;
end;
$$;

create trigger trg_orders_status_insert
  after insert on public.orders
  for each row execute function public.log_order_status_change();
create trigger trg_orders_status_update
  before update on public.orders
  for each row execute function public.log_order_status_change();

-- ============ HELPER: can manage orders ============
create or replace function public.can_manage_orders(_user_id uuid, _tenant_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and tenant_id = _tenant_id
      and role in ('owner','admin','dispatcher','manager')
  )
$$;

-- ============ POLICIES: drivers ============
create policy "members read drivers" on public.drivers
  for select to authenticated using (public.is_tenant_member(auth.uid(), tenant_id));
create policy "admins insert drivers" on public.drivers
  for insert to authenticated with check (public.is_tenant_admin(auth.uid(), tenant_id));
create policy "admins update drivers" on public.drivers
  for update to authenticated using (public.is_tenant_admin(auth.uid(), tenant_id));
create policy "driver updates own status" on public.drivers
  for update to authenticated using (user_id = auth.uid());
create policy "admins delete drivers" on public.drivers
  for delete to authenticated using (public.is_tenant_admin(auth.uid(), tenant_id));

-- ============ POLICIES: orders ============
create policy "members read orders" on public.orders
  for select to authenticated using (public.is_tenant_member(auth.uid(), tenant_id));
create policy "managers insert orders" on public.orders
  for insert to authenticated with check (public.can_manage_orders(auth.uid(), tenant_id));
create policy "managers update orders" on public.orders
  for update to authenticated using (public.can_manage_orders(auth.uid(), tenant_id));
create policy "managers delete orders" on public.orders
  for delete to authenticated using (public.can_manage_orders(auth.uid(), tenant_id));

-- ============ POLICIES: order_events ============
create policy "members read events" on public.order_events
  for select to authenticated using (public.is_tenant_member(auth.uid(), tenant_id));
create policy "managers insert events" on public.order_events
  for insert to authenticated with check (public.can_manage_orders(auth.uid(), tenant_id));

-- ============ REALTIME ============
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.drivers;
alter publication supabase_realtime add table public.order_events;

-- ============ SEED HELPER: create demo data for a tenant ============
create or replace function public.seed_demo_orders(_tenant_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  inserted int := 0;
  statuses order_status[] := array['novo','em_preparo','pronto','aguardando_entregador','em_rota_coleta','retirado','em_rota_entrega'];
  priorities order_priority[] := array['normal','normal','alta','baixa','critica'];
  names text[] := array['Ana Costa','Bruno Lima','Carla Souza','Diego Reis','Eduarda Pires','Felipe Alves','Gabi Mendes','Hugo Tavares','Iara Nunes','João Pedro','Karla Vieira','Lucas Rocha'];
  addrs text[] := array['Av. Paulista 1500','R. Augusta 200','R. Oscar Freire 99','Av. Brasil 4500','R. Consolação 880','Av. Faria Lima 3200','R. Haddock Lobo 700','Av. Rebouças 1200'];
  i int;
begin
  if not public.is_tenant_admin(auth.uid(), _tenant_id) then
    raise exception 'not authorized';
  end if;
  for i in 1..18 loop
    insert into public.orders(
      tenant_id, code, status, priority, customer_name, customer_phone,
      address, items_count, total_amount, channel, sla_minutes, placed_at
    ) values (
      _tenant_id,
      '#' || lpad(((extract(epoch from now())::bigint % 10000) + i)::text, 4, '0'),
      statuses[1 + (i % array_length(statuses,1))],
      priorities[1 + (i % array_length(priorities,1))],
      names[1 + (i % array_length(names,1))],
      '11 9' || lpad((1000 + i*173 % 9000)::text, 4, '0') || '-' || lpad((i*97 % 10000)::text, 4, '0'),
      addrs[1 + (i % array_length(addrs,1))] || ', ' || (100 + i*7),
      1 + (i % 5),
      35.50 + (i * 9.37),
      (array['ifood','rappi','whatsapp','site','telefone'])[1 + (i % 5)],
      30 + (i % 4) * 15,
      now() - ((i * 4) || ' minutes')::interval
    );
    inserted := inserted + 1;
  end loop;
  return inserted;
end;
$$;
