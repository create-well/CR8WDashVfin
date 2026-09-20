# CR8W Dash vfin

This is the CR8W internal dashboard. The public CR8W brand site and this authenticated product are separate surfaces that share the CR8W design language.

## Local setup

```bash
pnpm install
pnpm run dev
```

The app uses the existing `/api/server` boundary when running on localhost. Keep server credentials out of the browser and use explicit local environment values only when the API route requires them. The dashboard keeps its existing mock/fallback behavior when the backend is unavailable.

## Validation

```bash
pnpm test
pnpm typecheck
pnpm build
```

`pnpm test` covers the typed mutation boundary, including a successful write, rejected input, and rollback after a failed optimistic update. The mutation boundary validates task, content-item, and approval-shaped inputs, reports saving/saved/failed states, and restores the previous UI value when a write fails.

## Backend boundary

Dashboard mutations remain server-side through the existing API route. This pass does not add Supabase credentials, migrations, RLS changes, auth changes, or production deployment. Supabase schema and approval persistence require a separate reviewed change.

## Design reference

The original Figma project is available at https://www.figma.com/design/1zgMZlMEWFp0x6XWs0FTw0/CR8W-Dash-vfin.
