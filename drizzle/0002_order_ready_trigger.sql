-- When the last job on an order completes, the order moves to 'ready' on its
-- own and the transition lands in the audit log as a system event.
-- security definer: the workshop user completing the job cannot update or
-- even read the orders table, and should not need to.
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

  -- serialise concurrent completions on the same order so two final jobs
  -- finishing at once cannot both read a stale picture
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
    and status in ('paid', 'in_production');

  if found then
    insert into public.order_events (order_id, actor_id, type, payload)
    values (
      v_order_id,
      null, -- system transition, not attributed to the completing workshop
      'order.ready',
      jsonb_build_object('trigger', 'advance_order_when_complete', 'last_job_id', new.id)
    );
  end if;

  return new;
end;
$$;--> statement-breakpoint

create trigger advance_order_when_complete
  after update of status on public.jobs
  for each row
  when (new.status = 'completed' and old.status is distinct from new.status)
  execute function private.advance_order_when_complete();
