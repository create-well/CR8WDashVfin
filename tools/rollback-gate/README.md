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

Manifest `entries[].path` values are relative to `backup-root`. Mirror keys use `cr8w_notion_mirror_<source>` and the metadata key is `cr8w_notion_sync_meta`. The manifest `generationId` must match every snapshot and the metadata file. Every mirror source named in `sync-meta.json` must have exactly one corresponding snapshot file, and each metadata count must match the snapshot record count.

## CLI

From the repository root:

```bash
pnpm verify:backup --root /absolute/path/to/backup-root
pnpm --silent verify:backup --root /absolute/path/to/backup-root --manifest /absolute/path/to/manifest.json --backup-directory backups --json
```

Exit code `0` means the complete backup passed. Exit code `1` means validation failed. In JSON mode, successful output is emitted on stdout and failure output is emitted on stderr as `{ "ok": false, "error": "..." }`. The command never restores, deletes, or writes backup or production mirror data.

## Path and symlink safety

The root is a trust boundary. The verifier rejects absolute manifest paths and any path that resolves outside the root, including `../` traversal, traversal hidden by repeated separators, and traversal through a nested directory. It checks every path component with `lstat`, so a symlinked backup directory or symlinked intermediate component is rejected even when the final target is a regular file. Symlink files, nested symlink directories, sockets, devices, and other non-regular entries are rejected.

The verifier recursively scans the configured backup directory. Every regular file must be referenced exactly by a manifest entry; nested orphan files are therefore rejected. The manifest itself may live at the root or another explicitly supplied path, but it is not part of the backup-directory scan unless it is placed inside that directory and referenced. Keep `manifest.json` outside `backups/` to avoid ambiguity.

Malformed JSON, missing files, duplicate keys or backup IDs, incorrect byte lengths, SHA-256 mismatches, invalid timestamps, missing metadata, missing source snapshots, generation mismatches, and metadata count drift all fail closed with exit code `1`.

## CI/CD pre-restore gate

The reusable GitHub Actions workflow `.github/workflows/pre-restore-verification.yml` downloads the named backup artifact and runs `pnpm --silent verify:backup --json`. The quiet flag is required when stdout is parsed as JSON because pnpm may otherwise print package-manager status lines. A restore workflow must call this workflow as its required verification job and only allow the restore job to depend on a successful completion. The gate is read-only; it never performs the restore itself.

The runner can also be imported by CI or a restore controller:

```ts
import { verifyProductionBackup } from './runner.ts';
const result = await verifyProductionBackup({
  root: '/absolute/path/to/backup-root',
  manifestPath: '/absolute/path/to/backup-root/manifest.json',
  backupDirectory: 'backups',
});
```
