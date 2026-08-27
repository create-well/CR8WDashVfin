#!/usr/bin/env python3
"""Verify that tracked canonical files match a cross-storage lock manifest.

Manifest format (CSV):
path,source_id,source_version,sha256,status
sops/THS-CLI-Manage-Client-Projects.md,THS-CLI-Manage-Client-Projects,v01,<hash>,APPROVED

Use --write to create/update hashes only during an intentional release step.
Normal CI and pre-commit use read-only verification.
"""
from __future__ import annotations
import argparse, csv, hashlib, sys
from pathlib import Path


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', default='.')
    ap.add_argument('--manifest', default='canonical_manifest.csv')
    ap.add_argument('--write', action='store_true', help='write current hashes; use only in a deliberate release step')
    args = ap.parse_args()
    root = Path(args.root).resolve(); mp = root / args.manifest
    if not mp.exists():
        print(f'ERROR manifest not found: {mp}'); return 1
    rows = []
    with mp.open(newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        required = {'path','source_id','source_version','sha256','status'}
        if not required.issubset(reader.fieldnames or set()):
            print('ERROR manifest headers must include path,source_id,source_version,sha256,status'); return 1
        for row in reader:
            p = root / row['path']
            if not p.exists():
                print('ERROR missing canonical file:', row['path']); return 1
            actual = digest(p)
            if args.write:
                row['sha256'] = actual
            elif row['sha256'] != actual:
                print(f"ERROR hash drift: {row['path']} expected {row['sha256']} actual {actual}"); return 1
            if row['status'] == 'APPROVED' and not row['source_id']:
                print('ERROR approved file has no source_id:', row['path']); return 1
            rows.append(row)
    if args.write:
        with mp.open('w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['path','source_id','source_version','sha256','status'])
            writer.writeheader(); writer.writerows(rows)
        print('UPDATED manifest hashes:', mp)
    else:
        print(f'PASS: verified {len(rows)} canonical files against {mp}')
    return 0

if __name__ == '__main__':
    sys.exit(main())
