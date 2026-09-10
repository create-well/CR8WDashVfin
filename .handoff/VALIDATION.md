# Validation

## Final Production Result

Production deployment `dpl_5mmuZVWDdLY64A8ztodh5srZ4E9r` reached Ready and was aliased to `https://www.cr8w.com`.

The first production attempt failed during Vercel’s frozen pnpm install because the available lockfile did not match the package override configuration. The lockfile was regenerated with pnpm 10, validated with `pnpm@10 install --frozen-lockfile`, committed as `d87f3066`, and the production deployment succeeded on retry.

## Feature Validation

The frontend polls `/api/dashboard-sync` every 30 seconds while visible, applies jitter, backs off after failures, slows polling while hidden, and refreshes on visibility return.

The Notion panel supports source filtering across All, People, Flows, Moves, Content, and Money. Search is case-insensitive and covers source name, page ID, extracted record label, and property values. Rendering is capped at 12 cards with the total match count shown.

## Passed

| Check | Result |
| --- | --- |
| Vite production build | Pass |
| Esbuild server parsing | Pass |
| pnpm 10 frozen install | Pass |
| Vercel production deployment | Pass |
| `https://www.cr8w.com/` | HTTP 200 |
| `GET /api/dashboard-sync` | Pass |
| Freshness source | `notion` |
| People mirror count | 13 |
| Flows mirror count | 3 |
| Moves mirror count | 4 |
| Content mirror count | 2 |
| Money mirror count | 0 |

## Scope Protection

Unrelated existing working-tree changes remain unstaged and untouched.
