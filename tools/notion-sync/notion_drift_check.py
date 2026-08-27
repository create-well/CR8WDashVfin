#!/usr/bin/env python3
"""Compare canonical repository SOP metadata with Notion SOP rows.

Report-only by design. Non-zero exit means drift was found; no Notion writes occur.
Use --snapshot with a JSON export for local dry-run testing.
"""
from __future__ import annotations
import argparse, json, os, re, sys, hashlib
from pathlib import Path
import requests

API='https://api.notion.com/v1'
VERSION='2026-03-11'
SOPS_DS='08f24acf-799d-825b-bca6-8747471b53e6'

def parse(path):
    text=path.read_text(encoding='utf-8')
    body=text.split('---',2)[2] if text.startswith('---') and text.count('---')>=2 else text
    meta={}
    if text.startswith('---'):
        for line in text.split('---',2)[1].splitlines():
            if ':' in line:
                k,v=line.split(':',1); meta[k.strip().lower().replace(' ','_')]=v.strip().strip('"\'')
    return meta, body

def sha(path):
    h=hashlib.sha256(path.read_bytes()).hexdigest(); return h

def plain(p):
    if not p: return ''
    typ=p.get('type')
    if typ=='title': return ''.join(x.get('plain_text','') for x in p.get('title',[]))
    if typ=='rich_text': return ''.join(x.get('plain_text','') for x in p.get('rich_text',[]))
    if typ in ('select','status'): return (p.get(typ) or {}).get('name','')
    if typ=='date': return (p.get('date') or {}).get('start','')
    return ''

def prop(row,name): return plain(row.get('properties',{}).get(name,{})) if 'properties' in row else row.get(name)

def query(token):
    h={'Authorization':f'Bearer {token}','Notion-Version':VERSION,'Content-Type':'application/json'}
    r=requests.post(f'{API}/data_sources/{SOPS_DS}/query',headers=h,json={'page_size':100},timeout=30)
    r.raise_for_status(); return r.json().get('results',[])

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--root',default='.'); ap.add_argument('--snapshot'); ap.add_argument('--output',default='notion-drift-report.json'); args=ap.parse_args()
    root=Path(args.root).resolve()
    notion=query(os.getenv('NOTION_TOKEN')) if not args.snapshot else json.loads(Path(args.snapshot).read_text())
    by_title={prop(x,'Procedure'):x for x in notion}
    findings=[]; checked=[]
    for path in sorted((root/'sops').glob('*.md')):
        meta,_=parse(path); title=meta.get('notion_title') or path.stem
        expected={'Owner':meta.get('owner',''),'Domain':meta.get('domain',''),'Frequency':meta.get('frequency',''),'Source Path':str(path.relative_to(root)),'Source Version':meta.get('version',''),'Source Hash':sha(path),'Status':{'APPROVED':'Active','DRAFT':'Draft','REVIEW':'Needs Update','SUPERSEDED':'Archived','ARCHIVED':'Archived'}.get(meta.get('status','').upper(),'Draft')}
        row=by_title.get(title)
        if not row:
            findings.append({'type':'missing_notion_record','procedure':title,'expected':expected}); continue
        checked.append(title)
        for key,want in expected.items():
            got=prop(row,key)
            if got != want:
                findings.append({'type':'property_drift','procedure':title,'property':key,'expected':want,'actual':got})
    report={'status':'DRIFT' if findings else 'IN_SYNC','checked':checked,'findings':findings}
    Path(args.output).write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(json.dumps(report,indent=2,ensure_ascii=False))
    return 1 if findings else 0

if __name__=='__main__': sys.exit(main())
