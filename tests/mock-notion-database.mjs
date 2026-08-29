import { createServer } from 'node:http';

const pages = {
  projects: {
    id: 'mock-project-page',
    url: 'http://mock.local/projects/mock-project-page',
    last_edited_time: '2026-08-29T00:00:00.000Z',
    archived: false,
    properties: {
      Name: { type: 'title', title: [{ plain_text: 'Mock Project' }] },
      'Project Status': { type: 'select', select: { name: 'Active' } },
      'Start Date': { type: 'date', date: { start: '2026-08-01', end: null } },
      Deadline: { type: 'date', date: { start: '2026-09-01', end: null } },
      'Completion Date': { type: 'date', date: null },
      'Site Address': { type: 'rich_text', rich_text: [{ plain_text: '1 Mock Street' }] },
      Archived: { type: 'checkbox', checkbox: false },
      Tasks: { type: 'relation', relation: [] },
      Notes: { type: 'relation', relation: [] },
      'Site Photos': { type: 'relation', relation: [] },
      'Client Last Name': { type: 'relation', relation: [] },
    },
  },
  clients: {
    id: 'mock-client-page',
    url: 'http://mock.local/clients/mock-client-page',
    last_edited_time: '2026-08-29T00:00:00.000Z',
    archived: false,
    properties: {
      'Last Name': { type: 'title', title: [{ plain_text: 'Mock' }] },
      'First Names': { type: 'rich_text', rich_text: [{ plain_text: 'Casey' }] },
      Email: { type: 'email', email: 'casey@example.test' },
      'Mobile Phone': { type: 'phone_number', phone_number: '+1 555 0100' },
      'Work Phone': { type: 'phone_number', phone_number: null },
      'Billing Address': { type: 'rich_text', rich_text: [] },
      'Archive Client': { type: 'checkbox', checkbox: false },
      Project: { type: 'relation', relation: [{ id: 'mock-project-page' }] },
      Notes: { type: 'relation', relation: [] },
      ID: { type: 'unique_id', unique_id: { number: 1, prefix: 'CL' } },
    },
  },
  tasks: {
    id: 'mock-task-page',
    url: 'http://mock.local/tasks/mock-task-page',
    last_edited_time: '2026-08-29T00:00:00.000Z',
    archived: false,
    properties: {
      Tasks: { type: 'title', title: [{ plain_text: 'Mock Task' }] },
      'Task Status': { type: 'status', status: { name: 'Not started' } },
      Priority: { type: 'select', select: { name: 'Medium' } },
      Schedule: { type: 'date', date: { start: '2026-08-30', end: null } },
      Projects: { type: 'relation', relation: [{ id: 'mock-project-page' }] },
      'Blocked by': { type: 'relation', relation: [] },
      Blocking: { type: 'relation', relation: [] },
    },
  },
  photos_media: {
    id: 'mock-photo-page',
    url: 'http://mock.local/photos/mock-photo-page',
    last_edited_time: '2026-08-29T00:00:00.000Z',
    archived: false,
    properties: {
      Description: { type: 'title', title: [{ plain_text: 'Mock Photo' }] },
      Category: { type: 'select', select: { name: 'Progress' } },
      Media: { type: 'files', files: [] },
      'Date Taken': { type: 'date', date: { start: '2026-08-29', end: null } },
      'Projects ': { type: 'relation', relation: [{ id: 'mock-project-page' }] },
      ID: { type: 'unique_id', unique_id: { number: 1, prefix: 'MED' } },
    },
  },
  notes: {
    id: 'mock-note-page',
    url: 'http://mock.local/notes/mock-note-page',
    last_edited_time: '2026-08-29T00:00:00.000Z',
    archived: false,
    properties: {
      Subject: { type: 'title', title: [{ plain_text: 'Mock Note' }] },
      Type: { type: 'select', select: { name: 'General' } },
      Date: { type: 'created_time', created_time: '2026-08-29T00:00:00.000Z' },
      'Projects ': { type: 'relation', relation: [{ id: 'mock-project-page' }] },
      Clients: { type: 'relation', relation: [{ id: 'mock-client-page' }] },
    },
  },
};

export function startMockNotionServer() {
  const server = createServer((request, response) => {
    if (request.method !== 'POST') {
      response.writeHead(405).end();
      return;
    }
    if (request.headers.authorization !== 'Bearer mock-notion-key') {
      response.writeHead(401, { 'content-type': 'application/json' }).end(JSON.stringify({ message: 'unauthorized' }));
      return;
    }
    const match = request.url?.match(/^\/v1\/data_sources\/([^/]+)\/query$/);
    if (!match) {
      response.writeHead(404).end();
      return;
    }
    const sourceById = {
      'bf924acf-799d-82ae-be91-07cbd38ffeae': 'projects',
      '57224acf-799d-8231-8b20-8798657e2d79': 'clients',
      '10a24acf-799d-830f-95d5-8747f7ab2531': 'tasks',
      '7c824acf-799d-8338-9e2e-87decd0369d3': 'photos_media',
      '37024acf-799d-82a2-8635-870171412004': 'notes',
    };
    const source = sourceById[match[1]];
    const page = source ? pages[source] : undefined;
    response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({
      results: page ? [page] : [],
      next_cursor: null,
      has_more: false,
    }));
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

export function mockNotionUrl(server) {
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Mock server is not listening');
  return `http://127.0.0.1:${address.port}/v1`;
}
