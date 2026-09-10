#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "SUPABASE_DB_URL is required and must be loaded from an approved secret store." >&2
  exit 2
fi

case "$SUPABASE_DB_URL" in
  *cr8w-dash-vfin*|*production*|*prod*)
    echo "Refusing to inspect a URL that appears to target production. Set ALLOW_PRODUCTION_SCHEMA_INSPECTION=1 only under an approved read-only production review." >&2
    if [[ "${ALLOW_PRODUCTION_SCHEMA_INSPECTION:-}" != "1" ]]; then exit 3; fi
    ;;
esac

if [[ "${ALLOW_SCHEMA_INSPECTION:-}" != "1" ]]; then
  echo "Set ALLOW_SCHEMA_INSPECTION=1 after confirming the target is the intended Supabase project." >&2
  exit 4
fi

export PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-10}"
exec psql "$SUPABASE_DB_URL" \
  --set=ON_ERROR_STOP=1 \
  --no-psqlrc \
  --file="$(dirname "$0")/inspect-kv-column.sql"
