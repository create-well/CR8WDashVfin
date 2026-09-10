import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateManifest, validateSourceSnapshot, validateSyncMetadata, verifyBackupFiles, type BackupManifest, type SourceSnapshot, type SyncMetadata } from './verify.ts';

export type ProductionVerificationResult = {
  ok: true;
  root: string;
  manifestPath: string;
  generationId: string;
  verifiedFiles: number;
  verifiedSnapshots: number;
  snapshotSources: string[];
  metadataKey: string;
};

export type ProductionVerificationOptions = {
  root: string;
  manifestPath?: string;
  backupDirectory?: string;
};

function fail(message: string): never { throw new Error(message); }
async function loadJson(path: string): Promise<unknown> {
  let text: string;
  try { text = await readFile(path, 'utf8'); } catch (error) { fail(`unable to read JSON file ${path}: ${error instanceof Error ? error.message : String(error)}`); }
  try { return JSON.parse(text); } catch (error) { fail(`invalid JSON in ${path}: ${error instanceof Error ? error.message : String(error)}`); }
}
function sourceForKey(key: string): string | null {
  const prefix = 'cr8w_notion_mirror_';
  return key.startsWith(prefix) ? key.slice(prefix.length) : null;
}

export async function verifyProductionBackup(options: ProductionVerificationOptions): Promise<ProductionVerificationResult> {
  const root = resolve(options.root);
  const manifestPath = resolve(options.manifestPath ?? `${root}/manifest.json`);
  const manifest = validateManifest(await loadJson(manifestPath));
  await verifyBackupFiles(root, manifest, options.backupDirectory ?? 'backups');

  const snapshots: SourceSnapshot[] = [];
  let metadata: SyncMetadata | undefined;
  let metadataKey = '';
  for (const entry of manifest.entries) {
    const source = sourceForKey(entry.key);
    if (!source && entry.key !== 'cr8w_notion_sync_meta') continue;
    const value = await loadJson(resolve(root, entry.path));
    if (entry.key === 'cr8w_notion_sync_meta') {
      if (metadata) fail('multiple sync metadata files are not allowed');
      metadata = validateSyncMetadata(value, manifest.generationId);
      metadataKey = entry.key;
      continue;
    }
    if (!source) continue;
    const snapshot = validateSourceSnapshot(value, manifest.generationId);
    if (snapshot.source !== source) fail(`snapshot source ${snapshot.source} does not match manifest key ${entry.key}`);
    if (snapshots.some((item) => item.source === snapshot.source)) fail(`duplicate snapshot source: ${snapshot.source}`);
    snapshots.push(snapshot);
  }
  if (!metadata) fail('manifest must reference cr8w_notion_sync_meta metadata');
  if (snapshots.length === 0) fail('manifest must reference at least one Notion mirror snapshot');
  for (const snapshot of snapshots) {
    const expected = metadata.counts[snapshot.source];
    if (expected === undefined) fail(`sync metadata is missing count for snapshot source ${snapshot.source}`);
    if (expected !== snapshot.records.length) fail(`sync metadata count mismatch for ${snapshot.source}: expected ${expected}, found ${snapshot.records.length}`);
  }
  for (const source of Object.keys(metadata.counts)) {
    if (!snapshots.some((snapshot) => snapshot.source === source)) fail(`sync metadata has no snapshot for source ${source}`);
  }
  return { ok: true, root, manifestPath, generationId: manifest.generationId, verifiedFiles: manifest.entries.length, verifiedSnapshots: snapshots.length, snapshotSources: snapshots.map((snapshot) => snapshot.source).sort(), metadataKey };
}
