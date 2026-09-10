# CR8W Dashboard Context

## Product Goal

Build the internal Create Well team dashboard at `cr8w.com`. The front end should help the team see the current week, current moves, Podyap preflight, consent-gated invitations, real money, and content readiness.

## Ownership Rule

Notion writes. Supabase remembers. `cr8w.com` reads. The dashboard must not become a second operational write surface.

## Team Boundary

Create Well team: Sunshine, Bingle, and Monny, with Omar as podcast tech anchor. Other people may exist in PEOPLE as relationship records but must not be presented as the Create Well team.

## Technical Boundary

Current stack: Vite, React, TypeScript, React Router, Tailwind/PostCSS, Supabase, Vercel. Current route data flows through `src/app/components/api.ts`, `src/contexts/SyncProvider.tsx`, `src/contexts/DashboardContext.tsx`, and `supabase/functions/server/index.tsx`.

## Change Rules

- Work on a feature branch.
- Preserve existing user changes.
- Do not expose credentials or read environment values into handoff artifacts.
- Do not mutate Notion data or schema without explicit approval.
- Keep changes small and independently verifiable.
- Do not add a new database or a second source of truth.
