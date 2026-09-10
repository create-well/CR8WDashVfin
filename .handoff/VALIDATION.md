# Validation

## Registry-Driven Mirror UI Validation — 2026-09-10

- Scope: `NotionMirrorSummary.tsx` (registry-driven collections + Money amount display), `ThisWeekPage.tsx` (passes `data.notionSources`), `NotionMirrorSummary.test.ts` (five new cases).
- Vitest could not start workers within 60 s across forks, threads, single-fork, and vmThreads pools; root cause is machine load (Spotlight indexing and Docker pinning cores, load avg 4.8–6.8), not the code. This is an environment limitation, not a pass.
- Fallback: the full test file was bundled with esbuild and executed in plain Node with a minimal vitest shim (`scripts/validate-mirror-summary.mjs`). All 15 assertions passed, including: registry-order collections, invisible-source hiding, unknown-key skipping, static-label fallback, Money amount formatting from typed envelopes and plain numbers, and null handling for missing or non-finite amounts.
- `pnpm build` passed (built in 7m 36s under the same load; `ThisWeekPage` chunk hash changed, confirming the new code is in the bundle).
- Resolved 2026-09-10 ~14:06: real Vitest passed. Focused file: 15/15 in 45s. Full serial suite (`--maxWorkers=1`): 8 files, 50 tests passed in 78s. Root cause of the earlier worker-start timeouts was concurrent vitest runs from another IDE session on this same repo plus machine load; once those cleared, workers started normally. The esbuild harness remains in `scripts/` as a backup but is not needed for normal runs.

## Production Money Filter Test

The production homepage returned HTTP 200. The production dashboard sync endpoint returned the current Notion freshness metadata and Money count 2.

| Money record | Amount |
| --- | ---: |
| `[DEV SAMPLE] Money expense test` | -67.89 |
| `[DEV SAMPLE] Money income test` | 123.45 |

The source code confirms the Money filter is wired in `NotionMirrorSummary.tsx`: the filter key is `money`, the button and select option use the label `Money`, and matching records render as linked cards with the record label.

The connected browser navigated to `https://www.cr8w.com`, but the browser view artifact failed with a Chrome extension access error before a visual screenshot or click result could be captured. API and code-path checks passed. A visual click test remains pending when browser viewing is available.

## Handoff Prompt Review

Reviewed and corrected `AI_HANDOFF_PROMPT.md`:

- Updated the latest implementation and production deployment identifiers.
- Changed the pending-sync language to completed-sync language.
- Recorded the verified Money count of 2 and sync run ID.
- Replaced the old release sequence with the next typed-property and source-discovery sequence.

## Next Iteration Plan

`NOTION_SOURCES_NEXT.md` now prioritizes a typed property envelope, a protected source discovery manifest, one approved new database at a time, registry-driven UI metadata, visible Money amounts, and payload thresholds for moving search server-side.
