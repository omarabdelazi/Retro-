-- Row Level Security for the Retro platform.
-- RLS is the security boundary, not application code. Every table already has
-- RLS enabled (0000_init); with no policy a table denies everything, so this
-- migration grants exactly what each role may do and nothing else.
--
-- Access model:
--   admin     — sees everything, writes everything
--   workshop  — scoped to exactly one workshop_id: own jobs, own payouts,
--               own production steps, the products it builds. Never orders,
--               never customer data, never another workshop's rows.
--   customer  — own profile, own orders, own order items and events
--   anon      — the storefront: active products, collections, rooms, hotspots

-- ---------------------------------------------------------------------------
-- Helper schema. Not exposed through the API; policies call these functions.
-- ---------------------------------------------------------------------------
create schema if not exists private;--> statement-breakpoint
grant usage on schema private to anon, authenticated;--> statement-breakpoint

-- security definer so reading profiles inside a profiles policy cannot recurse
create or replace function private.user_role()
returns public.user_role
language sql stable security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid()
$$;--> statement-breakpoint

create or replace function private.user_workshop_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select workshop_id from public.profiles where id = auth.uid()
$$;--> statement-breakpoint

create or replace function private.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((select role from public.profiles where id = auth.uid()) = 'admin', false)
$$;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- profiles ↔ auth.users. The FK lives here, not in Drizzle, because the auth
-- schema is Supabase-managed. New signups get a customer profile via trigger.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add constraint profiles_id_auth_users_fk
  foreign key (id) references auth.users (id) on delete cascade;--> statement-breakpoint

create or replace function private.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    'customer'::public.user_role,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;--> statement-breakpoint

drop trigger if exists on_auth_user_created on auth.users;--> statement-breakpoint
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Job status changes write themselves into the audit log. The function is
-- security definer so the append happens even though workshop users cannot
-- read orders or write order_events directly.
-- ---------------------------------------------------------------------------
create or replace function private.log_job_event()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.order_events (order_id, actor_id, type, payload)
    select
      oi.order_id,
      auth.uid(),
      'job.' || new.status::text,
      jsonb_build_object(
        'job_id', new.id,
        'workshop_id', new.workshop_id,
        'sequence', new.sequence,
        'from', old.status::text,
        'to', new.status::text
      )
    from public.order_items oi
    where oi.id = new.order_item_id;
  end if;
  return new;
end;
$$;--> statement-breakpoint

create trigger log_job_event
  after update on public.jobs
  for each row execute function private.log_job_event();--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Privilege hardening on top of RLS.
-- profiles: authenticated users may only ever touch full_name and phone.
-- Role and workshop assignment change through the service role alone, so a
-- crafted API call cannot escalate privileges even if a policy slipped.
-- ---------------------------------------------------------------------------
revoke insert, update, delete on table public.profiles from anon, authenticated;--> statement-breakpoint
grant update (full_name, phone) on table public.profiles to authenticated;--> statement-breakpoint

-- order_events is append-only for everyone below the service role
revoke update, delete on table public.order_events from anon, authenticated;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- workshops
-- ---------------------------------------------------------------------------
create policy "workshops_read" on public.workshops
  for select to anon, authenticated
  using (
    active
    or private.is_admin()
    or id = private.user_workshop_id()
  );--> statement-breakpoint

create policy "workshops_admin_all" on public.workshops
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "profiles_read_own_or_admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.is_admin());--> statement-breakpoint

create policy "profiles_update_own_or_admin" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or private.is_admin())
  with check (id = (select auth.uid()) or private.is_admin());--> statement-breakpoint

-- no insert or delete policies: rows follow auth.users via trigger and cascade

-- ---------------------------------------------------------------------------
-- products: the storefront reads active products; a workshop also sees the
-- products it builds, active or not; admin sees all.
-- ---------------------------------------------------------------------------
create policy "products_read" on public.products
  for select to anon, authenticated
  using (
    active
    or private.is_admin()
    or exists (
      select 1 from public.product_workshops pw
      where pw.product_id = products.id
        and pw.workshop_id = private.user_workshop_id()
    )
  );--> statement-breakpoint

create policy "products_admin_all" on public.products
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- product_workshops: the production chain is not public
-- ---------------------------------------------------------------------------
create policy "product_workshops_read" on public.product_workshops
  for select to authenticated
  using (private.is_admin() or workshop_id = private.user_workshop_id());--> statement-breakpoint

create policy "product_workshops_admin_all" on public.product_workshops
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- collections, rooms, hotspots: public catalog, admin-managed
-- ---------------------------------------------------------------------------
create policy "collections_read" on public.collections
  for select to anon, authenticated
  using (true);--> statement-breakpoint

create policy "collections_admin_all" on public.collections
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());--> statement-breakpoint

create policy "collection_products_read" on public.collection_products
  for select to anon, authenticated
  using (true);--> statement-breakpoint

create policy "collection_products_admin_all" on public.collection_products
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());--> statement-breakpoint

create policy "rooms_read" on public.rooms
  for select to anon, authenticated
  using (true);--> statement-breakpoint

create policy "rooms_admin_all" on public.rooms
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());--> statement-breakpoint

create policy "room_hotspots_read" on public.room_hotspots
  for select to anon, authenticated
  using (true);--> statement-breakpoint

create policy "room_hotspots_admin_all" on public.room_hotspots
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- orders: customers see and create their own; only admin updates; nobody
-- deletes an order through the API. Workshops never touch this table.
-- ---------------------------------------------------------------------------
create policy "orders_read_own_or_admin" on public.orders
  for select to authenticated
  using (customer_id = (select auth.uid()) or private.is_admin());--> statement-breakpoint

create policy "orders_customer_insert" on public.orders
  for insert to authenticated
  with check (
    customer_id = (select auth.uid())
    and status = 'pending'
    and payment_status = 'unpaid'
  );--> statement-breakpoint

create policy "orders_admin_update" on public.orders
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- order_items: the customer who owns the order, the workshops with a job on
-- the item, and admin. Customers may add items while the order is pending.
-- ---------------------------------------------------------------------------
create policy "order_items_read" on public.order_items
  for select to authenticated
  using (
    private.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.customer_id = (select auth.uid())
    )
    or exists (
      select 1 from public.jobs j
      where j.order_item_id = order_items.id
        and j.workshop_id = private.user_workshop_id()
    )
  );--> statement-breakpoint

create policy "order_items_customer_insert" on public.order_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.customer_id = (select auth.uid())
        and o.status = 'pending'
    )
  );--> statement-breakpoint

create policy "order_items_admin_all" on public.order_items
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- jobs: a workshop reads and updates its own jobs only. Jobs are created by
-- the server when an order is paid, so insert and delete stay with admin.
-- The with check clause stops a workshop reassigning a job elsewhere.
-- ---------------------------------------------------------------------------
create policy "jobs_read" on public.jobs
  for select to authenticated
  using (private.is_admin() or workshop_id = private.user_workshop_id());--> statement-breakpoint

create policy "jobs_workshop_update" on public.jobs
  for update to authenticated
  using (workshop_id = private.user_workshop_id())
  with check (workshop_id = private.user_workshop_id());--> statement-breakpoint

create policy "jobs_admin_all" on public.jobs
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- payouts: a workshop sees its own, admin manages all
-- ---------------------------------------------------------------------------
create policy "payouts_read" on public.payouts
  for select to authenticated
  using (private.is_admin() or workshop_id = private.user_workshop_id());--> statement-breakpoint

create policy "payouts_admin_all" on public.payouts
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- order_events: append-only. Customers read and write events on their own
-- orders, admin on all. No update or delete policy exists, and the
-- privileges are revoked above. Job transitions arrive via trigger.
-- ---------------------------------------------------------------------------
create policy "order_events_read" on public.order_events
  for select to authenticated
  using (
    private.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_events.order_id
        and o.customer_id = (select auth.uid())
    )
  );--> statement-breakpoint

create policy "order_events_insert" on public.order_events
  for insert to authenticated
  with check (
    actor_id = (select auth.uid())
    and (
      private.is_admin()
      or exists (
        select 1 from public.orders o
        where o.id = order_events.order_id
          and o.customer_id = (select auth.uid())
      )
    )
  );--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Realtime: workshop dashboards watch jobs, customers watch their orders.
-- Guarded so the migration also runs outside Supabase.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.jobs, public.orders;
  end if;
end
$$;
