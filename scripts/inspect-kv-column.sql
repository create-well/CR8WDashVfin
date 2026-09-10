-- Read-only Supabase/PostgreSQL schema inspection.
-- Run against the intended database with psql. This returns metadata only.

select
  c.table_schema,
  c.table_name,
  c.column_name,
  c.data_type,
  c.udt_schema,
  c.udt_name,
  c.is_nullable,
  c.column_default,
  c.character_maximum_length,
  c.numeric_precision,
  c.numeric_scale
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = 'kv_store_8dcd9693'
  and c.column_name in ('key', 'value')
order by c.ordinal_position;

-- Catalog-level type details, including json/jsonb distinctions.
select
  n.nspname as table_schema,
  cls.relname as table_name,
  att.attname as column_name,
  format_type(att.atttypid, att.atttypmod) as exact_type,
  typ.typcategory as type_category,
  att.attnotnull as not_null,
  pg_get_expr(def.adbin, def.adrelid) as column_default
from pg_class cls
join pg_namespace n on n.oid = cls.relnamespace
join pg_attribute att on att.attrelid = cls.oid and att.attnum > 0 and not att.attisdropped
join pg_type typ on typ.oid = att.atttypid
left join pg_attrdef def on def.adrelid = att.attrelid and def.adnum = att.attnum
where n.nspname = 'public'
  and cls.relname = 'kv_store_8dcd9693'
  and att.attname in ('key', 'value')
order by att.attnum;

-- Constraints and indexes relevant to atomic upsert behavior.
select
  con.conname as constraint_name,
  pg_get_constraintdef(con.oid) as constraint_definition
from pg_constraint con
join pg_class cls on cls.oid = con.conrelid
join pg_namespace n on n.oid = cls.relnamespace
where n.nspname = 'public'
  and cls.relname = 'kv_store_8dcd9693'
order by con.conname;

select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'kv_store_8dcd9693'
order by indexname;
