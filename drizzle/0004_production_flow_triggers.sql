-- The admin confirm step introduces 'routed': jobs are generated from
-- product_workshops and the order waits for workshops to pick them up.
-- Two flow updates follow from that:
--   routed → in_production  when the first job is accepted or started
--   routed/paid/in_production → ready  when the last job completes

create or replace function private.advance_order_when_complete()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
begin
  select oi.order_id into v_order_id
  from public.order_items oi
  where oi.id = new.order_item_id;

  if v_order_id is null then
    return new;
  end if;

  perform 1 from public.orders where id = v_order_id for update;

  if exists (
    select 1
    from public.jobs j
    join public.order_items oi on oi.id = j.order_item_id
    where oi.order_id = v_order_id
      and j.status <> 'completed'
  ) then
    return new;
  end if;

  update public.orders
  set status = 'ready'
  where id = v_order_id
    and status in ('paid', 'routed', 'in_production');

  if found then
    insert into public.order_events (order_id, actor_id, type, payload)
    values (
      v_order_id,
      null,
      'order.ready',
      jsonb_build_object('trigger', 'advance_order_when_complete', 'last_job_id', new.id)
    );
  end if;

  return new;
end;
$$;--> statement-breakpoint

create or replace function private.start_order_production()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
begin
  select oi.order_id into v_order_id
  from public.order_items oi
  where oi.id = new.order_item_id;

  if v_order_id is null then
    return new;
  end if;

  update public.orders
  set status = 'in_production'
  where id = v_order_id
    and status = 'routed';

  if found then
    insert into public.order_events (order_id, actor_id, type, payload)
    values (
      v_order_id,
      null,
      'order.in_production',
      jsonb_build_object('trigger', 'start_order_production', 'first_job_id', new.id)
    );
  end if;

  return new;
end;
$$;--> statement-breakpoint

create trigger start_order_production
  after update of status on public.jobs
  for each row
  when (new.status in ('accepted', 'in_progress') and old.status = 'pending')
  execute function private.start_order_production();--> statement-breakpoint

-- payout changes feed the admin overview live
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public' and tablename = 'payouts'
     ) then
    alter publication supabase_realtime add table public.payouts;
  end if;
end
$$;
