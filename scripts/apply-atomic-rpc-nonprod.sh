#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "SUPABASE_DB_URL must be loaded from an approved secret store" >&2
  exit 2
fi

if [[ "${ALLOW_NONPROD_MIGRATION:-}" != "1" ]]; then
  echo "Set ALLOW_NONPROD_MIGRATION=1 after confirming this is the dedicated non-production project." >&2
  exit 4
fi

case "$SUPABASE_DB_URL" in
  *cr8w-dash-vfin*|*production*|*prod*)
    echo "Refusing a URL that appears to target production." >&2
    exit 3
    ;;
esac

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required to inspect and apply the non-production migration." >&2
  exit 5
fi

export PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-10}"
SQL_DIR="$(cd "$(dirname "$0")/../supabase/migrations" && pwd)"
VALUE_TYPE="$(psql "$SUPABASE_DB_URL" --set=ON_ERROR_STOP=1 --no-psqlrc --tuples-only --no-align --command="
select format_type(att.atttypid, att.atttypmod)
from pg_class cls
join pg_namespace n on n.oid = cls.relnamespace
join pg_attribute att on att.attrelid = cls.oid
  and att.attname = 'value'
  and att.attnum > 0
  and not att.attisdropped
where n.nspname = 'public'
  and cls.relname = 'kv_store_8dcd9693';
" | tr -d '[:space:]')"

case "$VALUE_TYPE" in
  text|jsonb)
    echo "Confirmed non-production kv_store_8dcd9693.value type: $VALUE_TYPE"
    ;;
  '')
    echo "Could not find public.kv_store_8dcd9693.value." >&2
    exit 6
    ;;
  *)
    echo "Unsupported kv_store_8dcd9693.value type: $VALUE_TYPE; expected text or jsonb." >&2
    exit 7
    ;;
esac

psql "$SUPABASE_DB_URL" \
  --set=ON_ERROR_STOP=1 \
  --no-psqlrc \
  --file="$SQL_DIR/20260910_cr8w_atomic_notion_publish.sql"

echo "Atomic publication RPC migration applied to the confirmed non-production $VALUE_TYPE variant."
