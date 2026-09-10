# CR8W production backup verification

The production runner is read-only. It loads a manifest, verifies every referenced backup file, loads Notion mirror snapshot JSON files and sync metadata, and rejects missing sources, generation drift, count drift, malformed JSON, path traversal, symlinks, and unreferenced files.

## Layout

```text
backup-root/
├── manifest.json
└── backups/
    ├── people.json
    ├── flows.json
    └── sync-meta.json
```

Manifest `entries[].path` values are relative to `backup-root`. Mirror keys use `cr8w_notion_mirror_<source>` and the metadata key is `cr8w_notion_sync_meta`. The manifest `generationId` must match every snapshot and the metadata file.

## CLI

From the repository root:

```bash
pnpm verify:backup --root /absolute/path/to/backup-root
pnpm verify:backup --root /absolute/path/to/backup-root --manifest /absolute/path/to/manifest.json --backup-directory backups --json
```

Exit code `0` means the complete backup passed. Exit code `1` means validation failed. In JSON mode, successful output is emitted on stdout and failure output is emitted on stderr as `{ "ok": false, "error": "..." }`. The command never restores, deletes, or writes backup or production mirror data.

The runner can also be imported by CI or a restore controller:

```ts
import { verifyProductionBackup } from './runner.ts';
const result = await verifyProductionBackup({
  root: '/absolute/path/to/backup-root',
  manifestPath: '/absolute/path/to/backup-root/manifest.json',
  backupDirectory: 'backups',
});
```
