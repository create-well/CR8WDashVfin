# Validation

## Latest Commit Scope

The next commit contains the protected Notion mirror endpoint, freshness metadata on the deployed sync route, and a minimal repair to an existing malformed iCalendar string literal that prevented server parsing.

## Passed

- `git diff --check`
- `./node_modules/.bin/vite build`
- `./node_modules/.bin/esbuild api/server/[[...path]].ts --platform=node --format=esm --outfile=/tmp/cr8w-handler-check.mjs`
- Live Notion API schema inspection for PEOPLE, FLOWS, MOVES, CONTENT, and MONEY using property metadata and bounded sample counts.

## Not Available or Blocked

The repository has no project `tsconfig*.json`. Its installed TypeScript 4.9 compiler also fails on newer Node declaration syntax, so the explicit typecheck is not authoritative. Vitest is not installed in the current dependency set.

## Security Scope

The Notion token was used only by a temporary local inspector and was never printed, committed, or written into a project artifact. The adapter reads `NOTION_API_KEY` only at server runtime. The preview dry-run gate must be completed before any real mirror write.

## Working Tree Scope

Only the adapter file and handoff files are intended for the next commit. Existing deletions, `.env.production`, lockfile changes, and untracked feature/test files remain unstaged.
