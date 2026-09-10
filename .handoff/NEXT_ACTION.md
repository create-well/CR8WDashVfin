# Next Action

Implement a backward-compatible freshness object in the sync response and consume it in `SyncProvider` and `SyncStatusBar`.

Acceptance criteria:

1. Existing payloads without freshness continue to render.
2. The UI distinguishes dashboard fetch time from mirror write time.
3. The UI shows a stale warning when mirror freshness is outside the configured threshold.
4. No operational record mutation is introduced.
5. Focused checks and `git diff --check` pass.
