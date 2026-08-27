#!/usr/bin/env python3
"""One-way Git/Markdown -> Notion sync for THS SOPs and RACI metadata.

Default behavior is dry-run. Use --apply only in an intentional sync job with
NOTION_TOKEN set. No token is stored in this repository.
"""
from __future__ import annotations
import argparse, json, os, re, sys, time
from pathlib import Path
import requests

API = 'https://api.notion.com/v1'
VERSION = '2026-03-11'
SOPS_DS = '08f24acf-799d-825b-bca6-8747471b53e6'
COLLAB_DS = '62124acf-799d-8226-ab8b-07096b1f9f3d'


def parse_frontmatter(text):
    if not text.startswith('---'):
        return {}, text
    parts = text.split('---', 2)
    if len(parts) < 3:
        return {}, text
    meta = {}
    for line in parts[1].splitlines():
        if ':' in line:
            k, v = line.split(':', 1)
            meta[k.strip().lower().replace(' ', '_')] = v.strip().strip('"\'')
    return meta, parts[2].lstrip('\n')


def title_from_md(path, body):
    for line in body.splitlines():
        m = re.match(r'^#\s+(.+?)\s*$', line)
        if m:
            return m.group(1).strip()
    return path.stem.replace('_', ' ').replace('-', ' ').strip()


def sha256(path):
    import hashlib
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def notion_headers(token):
    return {'Authorization': f'Bearer {token}', 'Notion-Version': VERSION, 'Content-Type': 'application/json'}


def request(method, url, headers, **kwargs):
    for attempt in range(5):
        r = requests.request(method, url, headers=headers, timeout=30, **kwargs)
        if r.status_code in (429, 500, 502, 503, 504):
            time.sleep(min(30, 2 ** attempt))
            continue
        if not r.ok:
            raise RuntimeError(f'{method} {url} -> {r.status_code}: {r.text[:500]}')
        return r.json() if r.content else {}
    raise RuntimeError(f'{method} {url} failed after retries')


def rich(value):
    return {'rich_text': [{'type': 'text', 'text': {'content': str(value)}}]} if value else {'rich_text': []}


def title(value):
    return {'title': [{'type': 'text', 'text': {'content': str(value)}}]}


def select(value):
    return {'select': {'name': value}} if value else {'select': None}


def status(value):
    return {'status': {'name': value}} if value else {'status': None}


def date(value):
    return {'date': {'start': value}} if value else {'date': None}


def prop_plain(page, property_name):
    p = page.get('properties', {}).get(property_name, {})
    typ = p.get('type')
    if typ == 'title': return ''.join(x.get('plain_text','') for x in p.get('title', []))
    if typ == 'rich_text': return ''.join(x.get('plain_text','') for x in p.get('rich_text', []))
    if typ in ('select','status'): return (p.get(typ) or {}).get('name','')
    return ''


def query_all(ds, headers):
    rows=[]; cursor=None
    while True:
        payload={'page_size':100}
        if cursor: payload['start_cursor']=cursor
        data=request('POST', f'{API}/data_sources/{ds}/query', headers, json=payload)
        rows += data.get('results', [])
        if not data.get('has_more'): return rows
        cursor=data.get('next_cursor')


def blocks_for(text):
    # Keep the Notion page body concise and deterministic. The source file remains canonical.
    blocks=[]
    for raw in text.splitlines():
        line=raw.strip()
        if not line: continue
        if line.startswith('# '): blocks.append({'object':'block','type':'heading_1','heading_1':{'rich_text':[{'type':'text','text':{'content':line[2:][:1900]}}]}})
        elif line.startswith('## '): blocks.append({'object':'block','type':'heading_2','heading_2':{'rich_text':[{'type':'text','text':{'content':line[3:][:1900]}}]}})
        elif line.startswith('- '): blocks.append({'object':'block','type':'bulleted_list_item','bulleted_list_item':{'rich_text':[{'type':'text','text':{'content':line[2:][:1900]}}]}})
        else: blocks.append({'object':'block','type':'paragraph','paragraph':{'rich_text':[{'type':'text','text':{'content':line[:1900]}}]}})
    return blocks[:100]


def sync_sops(root, headers, apply):
    pages=query_all(SOPS_DS, headers)
    by_title={prop_plain(p,'Procedure'):p for p in pages}
    files=sorted((root/'sops').glob('*.md')) if (root/'sops').exists() else sorted(root.glob('**/*.md'))
    files=[p for p in files if 'node_modules' not in p.parts and not p.name.startswith('README')]
    for path in files:
        raw=path.read_text(encoding='utf-8'); meta, body=parse_frontmatter(raw); name=meta.get('notion_title') or title_from_md(path, body)
        domain=meta.get('domain','Operations'); owner=meta.get('owner','Monica'); raw_state=meta.get('status','DRAFT'); state={'APPROVED':'Active','DRAFT':'Draft','REVIEW':'Needs Update','SUPERSEDED':'Archived','ARCHIVED':'Archived'}.get(raw_state.upper(), 'Draft'); frequency=meta.get('frequency','As Needed'); reviewed=meta.get('last_reviewed','')
        properties={'Procedure':title(name),'Owner':rich(owner),'Domain':select(domain),'Status':status(state),'Frequency':select(frequency),'Source Path':rich(str(path.relative_to(root))),'Source Version':rich(meta.get('version','unversioned')),'Source Hash':rich(sha256(path))}
        if reviewed: properties['Last Reviewed']=date(reviewed)
        existing=by_title.get(name)
        if existing:
            print(f'UPDATE SOP: {name}')
            if apply: request('PATCH', f"{API}/pages/{existing['id']}", headers, json={'properties':properties})
        else:
            print(f'CREATE SOP: {name}')
            if apply:
                request('POST', f'{API}/pages', headers, json={'parent':{'type':'data_source_id','data_source_id':SOPS_DS},'properties':properties})


def sync_raci(root, headers, apply):
    cfg_path = root/'raci_matrix.json'
    if not cfg_path.exists(): cfg_path = root/'tools'/'notion-sync'/'raci_matrix.json'
    cfg=json.loads(cfg_path.read_text(encoding='utf-8'))
    pages=query_all(COLLAB_DS, headers); by_name={prop_plain(p,'Name'):p for p in pages}
    for person in cfg['people']:
        name=person['name']; existing=by_name.get(name)
        notes='Working RACI assignment: ' + '; '.join(person.get('assignments', [])) + f" | matrix_version: {cfg['version']} | source: {cfg['source']}"
        properties={'Name':title(name),'Role':select(person['notion_role']),'Type':select(person.get('type','Partner')),'Status':status(person.get('status','Active')),'Skills':{'multi_select':[{'name':x} for x in person.get('skills',[])]},'Notes':rich(notes)}
        if existing:
            print(f'UPDATE RACI PERSON: {name}')
            if apply: request('PATCH', f"{API}/pages/{existing['id']}", headers, json={'properties':properties})
        else:
            print(f'CREATE RACI PERSON: {name}')
            if apply:
                request('POST', f'{API}/pages', headers, json={'parent':{'type':'data_source_id','data_source_id':COLLAB_DS},'properties':properties})


def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--root', default='.'); ap.add_argument('--apply', action='store_true'); ap.add_argument('--sops-only', action='store_true'); ap.add_argument('--raci-only', action='store_true'); args=ap.parse_args()
    token=os.getenv('NOTION_TOKEN')
    if not token and args.apply: print('ERROR: set NOTION_TOKEN only in the execution environment; never commit it.'); return 2
    if not token: token='dry-run-placeholder'
    headers=notion_headers(token)
    root=Path(args.root).resolve()
    if not args.raci_only: sync_sops(root, headers, args.apply)
    if not args.sops_only: sync_raci(root, headers, args.apply)
    print('SYNC COMPLETE', '(applied)' if args.apply else '(dry-run; no Notion writes)')
    return 0

if __name__ == '__main__': sys.exit(main())
