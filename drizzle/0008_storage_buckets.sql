-- Public asset buckets for the admin dashboard's direct uploads: product
-- photography in 'images', GLB models in 'models'. Reads are public (the
-- storefront serves from these); writes require an admin, enforced by
-- storage RLS. Guarded so the migration also runs against plain Postgres
-- (local harness) where the storage schema does not exist.
do $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'storage schema not present, skipping bucket setup';
    return;
  end if;

  insert into storage.buckets (id, name, public)
  values ('images', 'images', true), ('models', 'models', true)
  on conflict (id) do update set public = true;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'retro_assets_public_read'
  ) then
    execute $p$create policy "retro_assets_public_read" on storage.objects
      for select to anon, authenticated
      using (bucket_id in ('images', 'models'))$p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'retro_assets_admin_insert'
  ) then
    execute $p$create policy "retro_assets_admin_insert" on storage.objects
      for insert to authenticated
      with check (bucket_id in ('images', 'models') and private.is_admin())$p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'retro_assets_admin_update'
  ) then
    execute $p$create policy "retro_assets_admin_update" on storage.objects
      for update to authenticated
      using (bucket_id in ('images', 'models') and private.is_admin())
      with check (bucket_id in ('images', 'models') and private.is_admin())$p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'retro_assets_admin_delete'
  ) then
    execute $p$create policy "retro_assets_admin_delete" on storage.objects
      for delete to authenticated
      using (bucket_id in ('images', 'models') and private.is_admin())$p$;
  end if;
end $$;
