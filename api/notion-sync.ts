import { timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runNotionSync, type NotionSyncResult } from './_lib/notion-sync-runner.js';

const MAX_BODY_BYTES = 2_048;

type WriteRequest = { dryRun: false };

function bearerToken(req: VercelRequest): string | null {
  const value = req.headers.authorization;
  return typeof value === 'string' ? value.match(/^Bearer\s+(.+)$/i)?.[1] ?? null : null;
}

function tokensMatch(received: string | null, expected: string): boolean {
  if (!received) return false;
  const left = Buffer.from(received, 'utf8');
  const right = Buffer.from(expected, 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
}

function parseBody(req: VercelRequest): WriteRequest {
  const length = req.headers['content-length'];
  if (typeof length === 'string' && Number(length) > MAX_BODY_BYTES) throw new Error('RequestTooLarge');
  if (typeof req.body === 'string') {
    if (Buffer.byteLength(req.body, 'utf8') > MAX_BODY_BYTES) throw new Error('RequestTooLarge');
    try { req.body = JSON.parse(req.body); } catch { throw new Error('InvalidJson'); }
  }
  const body = req.body as Partial<WriteRequest> | undefined;
  if (!body || body.dryRun !== false || Object.keys(body).some((key) => key !== 'dryRun')) throw new Error('WriteRequiresExplicitFalseDryRun');
  return { dryRun: false };
}

function summary(result: NotionSyncResult) {
  return { runId: result.runId, dryRun: result.dryRun, writes: result.writes, created: result.created, updated: result.updated, skipped: result.skipped, conflicts: result.conflicts, errors: result.errors, sourceCounts: result.sourceCounts, mirrorUpdatedAt: result.mirrorUpdatedAt, freshnessSource: result.freshnessSource };
}

export default async function notionSync(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Authorization');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).json({ error: 'method_not_allowed' }); return; }
  const expected = process.env.NOTION_SYNC_OPERATOR_TOKEN;
  if (!expected) { res.status(503).json({ error: 'notion_sync_unavailable' }); return; }
  if (!tokensMatch(bearerToken(req), expected)) { res.status(401).json({ error: 'unauthorized' }); return; }

  try {
    parseBody(req);
    const dryRun = await runNotionSync({ dryRun: true });
    if (dryRun.errors > 0 || dryRun.conflicts > 0) { res.status(409).json({ ok: false, error: 'dry_run_failed', dryRun: summary(dryRun) }); return; }
    const write = await runNotionSync({ dryRun: false });
    res.status(200).json({ ok: true, dryRun: summary(dryRun), write: summary(write) });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const clientError = ['RequestTooLarge', 'InvalidJson', 'WriteRequiresExplicitFalseDryRun'].includes(message);
    res.status(clientError ? 400 : 502).json({ ok: false, error: clientError ? message.toLowerCase() : 'notion_sync_failed' });
  }
}
