# Validation

## Latest Implementation

The explicit `api/notion-sync.ts` function is deployed at `/api/notion-sync`. It avoids the ambiguous `/api/server/*` routing in this project.

## Passed

- `git diff --check`
- `./node_modules/.bin/vite build`
- `./node_modules/.bin/esbuild api/notion-sync.ts --platform=node --format=esm`
- Vercel preview deployment reached READY.
- `POST /api/notion-sync` reached the intended function.

## Blocked Safely

The preview returned `401 Unauthorized` because it has no matching public Supabase key environment variable. The endpoint did not call Notion and did not write Supabase mirror keys. This is the correct failure mode.

Accepted server-side public-key variable names are `SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_ANON_KEY`. Prefer `SUPABASE_PUBLISHABLE_KEY` in Vercel preview settings.

## Security Scope

No credential was printed, committed, or embedded. The service-role key was not used as the operator token. A real mirror write was not attempted.

## Existing Gaps

The repository has no project `tsconfig*.json`; the installed TypeScript 4.9 compiler cannot parse newer Node declaration syntax. Vitest is not installed. Existing Vite warnings remain for the AuthGate import pattern and the large application chunk.
