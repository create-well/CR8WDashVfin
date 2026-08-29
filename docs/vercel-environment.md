# Vercel environment configuration

The repository now deploys a single canonical handler at `api/server/[[...path]].ts`. The legacy `api/server.ts` handler was removed because the two files implemented overlapping `/api/server` routes with different Supabase configuration contracts.

## Required Vercel variables

Set these variables in the **Production** environment for the `cr8w-dash-vfin` project. Set them in Preview as well if preview deployments must access real data.

| Variable | Required | Value source | Used by | Secret? |
|---|---:|---|---|---:|
| `SUPABASE_URL` | Yes | Supabase Project Settings → Data API → Project URL. For the CR8W Dashboard project this is `https://axntibrdivccycxdwlzk.supabase.co`. | Server Supabase client and JWT verification | No, but keep server-side configuration consistent |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase Project Settings → API Keys → secret `service_role` key. | Server-only database access | **Yes** |
| `SUPABASE_PUBLISHABLE_KEY` | Yes for protected routes | Supabase Project Settings → API Keys → publishable key for the same project. | Server authentication gate; also matches the browser's bearer token contract | No, publishable |
| `GCAL_CLIENT_SECRET` | Only if Google Calendar OAuth is used | Google Cloud OAuth client configuration | `POST /api/server/gcal-token-exchange` | **Yes** |
| `CR8W_ICAL_URL` | Only if iCal sync is used | The authorized CR8W iCal feed URL | `POST /api/server/calendar-ical-sync` | Treat as sensitive if the URL contains a token |

The old `SUPABASE_SECRET_KEY` name is no longer accepted. Use `SUPABASE_SERVICE_ROLE_KEY` exactly. Do not add `SUPABASE_SERVICE_ROLE_KEY`, `GCAL_CLIENT_SECRET`, or any other secret to a `VITE_*` variable or to client-side source code.

## Client/build variables

These are optional and are not substitutes for the server variables above.

| Variable | Scope | Purpose |
|---|---|---|
| `VITE_API_BASE` | Production/Preview build | Optional API base override. On Vercel, the default is `/api/server`. |
| `VITE_APP_PASSWORD_HASH` | Production/Preview build | Overrides the current shared-password fallback. Set this while the separate authentication hardening work is completed. |

The browser currently obtains its Supabase URL and publishable key from the client-side project configuration. The service-role key must never be included in that bundle.

## Authentication behavior after the patch

`GET /api/server` and `GET /api/server/health` remain public health checks. Every other route requires `Authorization: Bearer <token>`. The token must either equal `SUPABASE_PUBLISHABLE_KEY` for the existing app-gate flow or be a valid Supabase user access token verified against the same project.

If `SUPABASE_PUBLISHABLE_KEY` is missing, protected requests now return `401 Unauthorized`; they no longer become public. If the server database variables are missing, database-backed requests fail with a configuration error rather than silently using another key name.

## Deployment checklist

1. Add the variables above in Vercel under **Settings → Environment Variables**, selecting **Production** for the live deployment.
2. Redeploy after saving the variables; changing a Vercel variable does not retroactively change an already-built deployment.
3. Confirm the deployment is Ready, then test `/api/server?path=health`, `/api/server?path=sync`, and `/api/server?path=notion-sync-runs`.
4. Keep the service-role key out of chat, commits, logs, browser storage, and client bundles.
5. Rotate any key that has previously been committed or exposed.
