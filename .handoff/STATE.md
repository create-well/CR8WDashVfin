# CR8W Dashboard State

## Confirmed state

Production authentication is fixed and verified after PR #12. The referenced verification reports Vercel deployment `3f207e7` READY, 19 of 19 production smoke routes passing, authenticated sync returning 200, protected Notion sync-runs returning 200, and unauthorized sync returning 401.

## Root cause

The browser sent a stale hardcoded Supabase publishable token from the client API and calendar-sync paths instead of the injected `VITE_SUPABASE_PUBLISHABLE_KEY` contract.

## Architecture

Notion is the operational source of truth. Supabase is the structured runtime/cache boundary. Manus API is orchestration only. Notion access is server-side; secrets remain in platform secret stores.

## Current branch note

Before new code work, verify the checkout against merged `main`. Historical feature branches may contain stale route or authentication states. Never force-push or merge a stale branch solely to deliver documentation.

## Next action

Run fresh Lighthouse against populated Production `/system` and compare CLS/LCP with the earlier failure-state baseline.

## Last updated

2026-08-29
