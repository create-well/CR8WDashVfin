import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runSync } from '../notion-sync.js';

function authorized(req: VercelRequest): boolean {
  const expected = process.env.CRON_SECRET ?? '';
  const provided = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  return Boolean(expected && provided && provided === expected);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!authorized(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const result = await runSync(false);
    res.status(200).json({ source: 'vercel-cron', ...result });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Notion cron sync failed' });
  }
}
