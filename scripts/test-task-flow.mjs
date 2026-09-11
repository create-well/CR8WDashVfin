#!/usr/bin/env node

const base = (process.env.CR8W_API_BASE_URL || 'https://www.cr8w.com/api/server').replace(/\/$/, '');
const token = process.env.CR8W_BEARER_TOKEN || process.env.CR8W_API_TOKEN;
const cleanup = process.env.CR8W_TASK_FLOW_CLEANUP !== '0';

if (!token) {
  console.error('Missing CR8W_BEARER_TOKEN (or CR8W_API_TOKEN). Set it in the shell; never commit or print it.');
  process.exit(2);
}

async function request(method, path, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let payload;
  try { payload = JSON.parse(text); } catch { payload = { raw: text.slice(0, 300) }; }
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}

const marker = `CR8W flow test ${new Date().toISOString()}`;
let created;
try {
  created = await request('POST', '/tasks', {
    title: marker,
    person: process.env.CR8W_TEST_TASK_PERSON || 'event-support',
    status: 'todo',
    priority: 'low',
    category: 'verification',
  });
  if (!created || typeof created.id !== 'number') throw new Error('Create response did not include a numeric task id.');

  const updated = await request('PUT', `/tasks/${created.id}`, { status: 'in_progress', priority: 'medium' });
  if (updated?.status !== 'in_progress') throw new Error('Update response did not return status=in_progress.');

  console.log(JSON.stringify({ ok: true, created: { id: created.id, status: created.status }, updated: { id: updated.id, status: updated.status, priority: updated.priority }, cleanup }, null, 2));
} finally {
  if (created?.id !== undefined && cleanup) {
    try { await request('DELETE', `/tasks/${created.id}`); }
    catch (error) { console.error(`Cleanup failed for task ${created.id}: ${error.message}`); process.exitCode = 1; }
  }
}
