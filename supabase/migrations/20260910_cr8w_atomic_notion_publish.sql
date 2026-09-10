-- CR8W v2 atomic Notion mirror publication.
-- Draft only: inspect the target kv_store_8dcd9693.value type before applying.
-- The function inspects public.kv_store_8dcd9693.value at execution time and
-- supports exactly text or jsonb storage. The migration still must be applied
-- only after the guarded non-production schema inspection succeeds.

create or replace function public.cr8w_publish_notion_snapshot(
  p_run_id text,
  p_record_schema_version integer,
  p_typed_sources jsonb,
  p_source_last_edited_at timestamptz,
  p_snapshots jsonb
)
returns jsonb
language plpgsql
security definer
-- Resolve built-ins from pg_catalog first. pg_temp is intentionally omitted
-- from this SECURITY DEFINER function to avoid temporary-object shadowing.
set search_path = pg_catalog, public
as $$
declare
  item jsonb;
  item_key text;
  item_value text;
  item_present boolean;
  parsed jsonb;
  record jsonb;
  source_name text;
  expected_source text;
  metadata jsonb;
  metadata_item jsonb;
  metadata_present boolean := false;
  duplicate_count integer;
  written_count integer := 0;
  record_count integer;
  value_type text;
begin
  if p_run_id is null or btrim(p_run_id) = '' then
    raise exception 'run_id is required';
  end if;

  if p_record_schema_version <> 2 then
    raise exception 'record_schema_version must be 2';
  end if;

  if p_typed_sources is null or jsonb_typeof(p_typed_sources) <> 'array' then
    raise exception 'typed_sources must be a JSON array';
  end if;

  if p_snapshots is null or jsonb_typeof(p_snapshots) <> 'array' or jsonb_array_length(p_snapshots) = 0 then
    raise exception 'snapshots must be a non-empty JSON array';
  end if;

  if p_source_last_edited_at is not null
     and p_source_last_edited_at > clock_timestamp() then
    raise exception 'source_last_edited_at cannot be in the future';
  end if;

  select format_type(att.atttypid, att.atttypmod)
    into value_type
  from pg_class cls
  join pg_namespace n on n.oid = cls.relnamespace
  join pg_attribute att on att.attrelid = cls.oid
    and att.attname = 'value'
    and att.attnum > 0
    and not att.attisdropped
  where n.nspname = 'public'
    and cls.relname = 'kv_store_8dcd9693';

  if value_type is null then
    raise exception 'public.kv_store_8dcd9693.value was not found';
  end if;
  if value_type not in ('text', 'jsonb') then
    raise exception 'unsupported kv_store_8dcd9693.value type: % (expected text or jsonb)', value_type;
  end if;

  -- Prevent two sync generations from interleaving source and metadata writes.
  -- pg_advisory_xact_lock is released automatically at transaction end.
  perform pg_advisory_xact_lock(hashtextextended('cr8w_notion_publish', 0));

  select count(*) - count(distinct value->>'key')
    into duplicate_count
  from jsonb_array_elements(p_snapshots) as rows(value);
  if duplicate_count <> 0 then
    raise exception 'snapshots contain duplicate keys';
  end if;

  -- Pre-validate metadata before source records so count checks do not depend
  -- on the order of entries in p_snapshots.
  for item in
    select value
    from jsonb_array_elements(p_snapshots) as rows(value)
    where value->>'key' = 'cr8w_notion_sync_meta'
  loop
    if jsonb_typeof(item->'present') <> 'boolean' or (item->>'present')::boolean is not true then
      raise exception 'sync metadata snapshot must be present';
    end if;
    item_value := item->>'value';
    if item_value is null then raise exception 'metadata value is required'; end if;
    metadata := item_value::jsonb;
    if jsonb_typeof(metadata) <> 'object' then raise exception 'sync metadata must be an object'; end if;
    if metadata->>'source' <> 'notion' then raise exception 'sync metadata source must be notion'; end if;
    if (metadata->>'recordSchemaVersion')::integer <> 2 then raise exception 'sync metadata must be schema version 2'; end if;
    if metadata->>'syncRunId' <> p_run_id then raise exception 'sync metadata run ID mismatch'; end if;
    if jsonb_typeof(metadata->'counts') <> 'object' then raise exception 'sync metadata counts must be an object'; end if;
    if p_source_last_edited_at is null then
      if metadata->>'sourceLastEditedAt' is not null then
        raise exception 'source_last_edited_at mismatch: RPC parameter is null but metadata is not';
      end if;
    elsif metadata->>'sourceLastEditedAt' is null
       or (metadata->>'sourceLastEditedAt')::timestamptz <> p_source_last_edited_at then
      raise exception 'source_last_edited_at mismatch between RPC parameter and metadata';
    end if;
    metadata_present := true;
    raise log 'CR8W atomic publish run_id=% metadata_source=notion typed_sources=%', p_run_id, p_typed_sources;
  end loop;

  for item in select value from jsonb_array_elements(p_snapshots)
  loop
    if jsonb_typeof(item) <> 'object' then
      raise exception 'every snapshot entry must be an object';
    end if;

    item_key := item->>'key';
    if item_key is null or item_key not in (
      'cr8w_notion_mirror_people',
      'cr8w_notion_mirror_flows',
      'cr8w_notion_mirror_moves',
      'cr8w_notion_mirror_content',
      'cr8w_notion_mirror_money',
      'cr8w_notion_mirror_engineeringDelivery',
      'cr8w_notion_sync_meta'
    ) then
      raise exception 'snapshot key is not an approved CR8W mirror key: %', item_key;
    end if;

    if jsonb_typeof(item->'present') <> 'boolean' then
      raise exception 'present must be boolean for key %', item_key;
    end if;
    item_present := (item->>'present')::boolean;

    if item_key = 'cr8w_notion_sync_meta' then
      metadata_present := item_present;
      if item_present then
        item_value := item->>'value';
        if item_value is null then raise exception 'metadata value is required'; end if;
        metadata := item_value::jsonb;
        metadata_item := metadata;
        if jsonb_typeof(metadata_item) <> 'object' then raise exception 'sync metadata must be an object'; end if;
        if metadata_item->>'source' <> 'notion' then raise exception 'sync metadata source must be notion'; end if;
        if (metadata_item->>'recordSchemaVersion')::integer <> 2 then raise exception 'sync metadata must be schema version 2'; end if;
        if metadata_item->>'syncRunId' <> p_run_id then raise exception 'sync metadata run ID mismatch'; end if;
        if jsonb_typeof(metadata_item->'counts') <> 'object' then raise exception 'sync metadata counts must be an object'; end if;
      end if;
    elsif item_present then
      item_value := item->>'value';
      if item_value is null then raise exception 'snapshot value is required for key %', item_key; end if;
      parsed := item_value::jsonb;
      if jsonb_typeof(parsed) <> 'array' then raise exception 'source snapshot must be an array for key %', item_key; end if;
      expected_source := replace(item_key, 'cr8w_notion_mirror_', '');
      for record in select value from jsonb_array_elements(parsed)
      loop
        if jsonb_typeof(record) <> 'object' then raise exception 'source record must be an object for key %', item_key; end if;
        if coalesce(record->>'sourcePageId', '') = '' then raise exception 'sourcePageId is required for key %', item_key; end if;
        if record->>'source' <> expected_source then raise exception 'source mismatch for key %', item_key; end if;
        if jsonb_typeof(record->'properties') <> 'object' then raise exception 'properties must be an object for key %', item_key; end if;
        if (record->>'recordSchemaVersion')::integer <> 2 then raise exception 'record schema version must be 2 for key %', item_key; end if;
        if jsonb_typeof(record->'archived') <> 'boolean' then raise exception 'archived must be boolean for key %', item_key; end if;
      end loop;
      record_count := jsonb_array_length(parsed);
      source_name := expected_source;
      raise log 'CR8W atomic publish run_id=% source=% records=%', p_run_id, source_name, record_count;
      if metadata_present and metadata->'counts'->>expected_source is not null
         and (metadata->'counts'->>expected_source)::integer <> record_count then
        raise exception 'metadata count mismatch for source %', expected_source;
      end if;
    end if;

    if item_present then
      -- The catalog-derived type is restricted above to text/jsonb. Dynamic
      -- SQL keeps one RPC definition valid for either confirmed schema.
      execute format(
        'insert into public.kv_store_8dcd9693(key, value) values ($1, $2::%s) on conflict (key) do update set value = excluded.value',
        value_type
      ) using item_key, item_value;
    else
      delete from public.kv_store_8dcd9693 where key = item_key;
    end if;
    written_count := written_count + 1;
  end loop;

  if not metadata_present then
    raise exception 'sync metadata snapshot is required and must be present';
  end if;

  return jsonb_build_object(
    'committed', true,
    'run_id', p_run_id,
    'keys_written', written_count,
    'record_schema_version', p_record_schema_version,
    'typed_sources', p_typed_sources
  );
end;
$$;

-- Restrict execution to the server-side role used by the protected sync API.
-- Supabase grants EXECUTE on new functions to anon, authenticated, and
-- service_role by default, so revoking PUBLIC alone is not enough. The
-- browser roles (anon, authenticated) must never execute this function.
revoke all on function public.cr8w_publish_notion_snapshot(text, integer, jsonb, timestamptz, jsonb) from public;
revoke execute on function public.cr8w_publish_notion_snapshot(text, integer, jsonb, timestamptz, jsonb) from anon;
revoke execute on function public.cr8w_publish_notion_snapshot(text, integer, jsonb, timestamptz, jsonb) from authenticated;
grant execute on function public.cr8w_publish_notion_snapshot(text, integer, jsonb, timestamptz, jsonb) to service_role;
