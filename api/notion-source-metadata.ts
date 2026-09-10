import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ENABLED_NOTION_SOURCES } from './notion-sources.js';

function authorized(req: VercelRequest) {
  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  const expected = process.env.NOTION_SYNC_OPERATOR_TOKEN ?? '';
  return Boolean(token && expected && token === expected);
}
async function notion(path: string) {
  const token = process.env.NOTION_API_KEY;
  if (!token) throw new Error('Missing NOTION_API_KEY');
  const response = await fetch(`https://api.notion.com/v1${path}`, { headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2025-09-03' } });
  if (!response.ok) throw new Error(`Notion request failed with status ${response.status}`);
  return response.json();
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }
  if (!authorized(req)) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const sources = await Promise.all(ENABLED_NOTION_SOURCES.map(async ([key, config]) => {
      const schema = await notion(`/data_sources/${config.dataSourceId}`);
      return { key, label: config.label, visible: config.visible, searchable: config.searchable, sensitivity: config.sensitivity, displayFields: config.displayFields, dataSourceId: config.dataSourceId, archived: Boolean(schema.archived), properties: Object.fromEntries(Object.entries(schema.properties ?? {}).map(([name, value]: [string, any]) => [name, value.type])) };
    }));
    res.json({ ok: true, sources });
  } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Source metadata unavailable' }); }
}
