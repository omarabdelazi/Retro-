-- Hardening for the workshop dashboard. The floor UI reads and writes
-- through the user's own JWT (PostgREST), so these rules are the actual
-- boundary — not the interface.
--
-- What a workshop user must never reach, even with hand-written queries:
--   other workshops' jobs        → jobs row policies (0001, unchanged)
--   customer contact details     → no orders/profiles access (0001, unchanged)
--   order totals and unit prices → order_items access removed below;
--                                  jobs now carry product_id and qty
--   payouts beyond their own     → payouts row policy (0001, unchanged)

-- ---------------------------------------------------------------------------
-- order_items: drop the workshop branch. Jobs are self-sufficient, so the
-- only readers left are the order's customer and admin.
-- ---------------------------------------------------------------------------
drop policy "order_items_read" on public.order_items;--> statement-breakpoint
create policy "order_items_read" on public.order_items
  for select to authenticated
  using (
    private.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.customer_id = (select auth.uid())
    )
  );--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- products: a workshop reads the products it builds — through its production
-- chain or through a job on its bench (covers chain edits after routing).
-- Catalog price stays readable: it is public storefront data for anyone.
-- ---------------------------------------------------------------------------
drop policy "products_read" on public.products;--> statement-breakpoint
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
    or exists (
      select 1 from public.jobs j
      where j.product_id = products.id
        and j.workshop_id = private.user_workshop_id()
    )
  );--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- jobs: workshop users update progress fields and nothing else. Assignment,
-- quantity, product, and sequence belong to the admin (service role).
-- ---------------------------------------------------------------------------
revoke update on table public.jobs from anon, authenticated;--> statement-breakpoint
grant update (status, accepted_at, started_at, completed_at, rejection_reason)
  on table public.jobs to authenticated;--> statement-breakpoint

-- payouts are read-only through the API; transfers happen through the
-- admin's service path
revoke insert, update, delete on table public.payouts from anon, authenticated;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Status moves only forward, and only along the real workflow. Applies to
-- API callers (a JWT is present); the service connection stays free for
-- admin corrections.
-- ---------------------------------------------------------------------------
create or replace function private.enforce_job_transitions()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  claims text := nullif(current_setting('request.jwt.claims', true), '');
  legacy_sub text := nullif(current_setting('request.jwt.claim.sub', true), '');
begin
  if claims is null and legacy_sub is null then
    return new; -- direct connection: migrations, seed, admin service actions
  end if;

  if new.status = old.status then
    return new;
  end if;

  if (old.status = 'pending' and new.status in ('accepted', 'rejected'))
     or (old.status = 'accepted' and new.status in ('in_progress', 'rejected'))
     or (old.status = 'in_progress' and new.status = 'completed') then
    return new;
  end if;

  raise exception 'invalid job transition % -> %', old.status, new.status;
end;
$$;--> statement-breakpoint

create trigger enforce_job_transitions
  before update of status on public.jobs
  for each row execute function private.enforce_job_transitions();
