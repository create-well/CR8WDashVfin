#!/usr/bin/env python3
"""Validate THS document metadata, IDs, links, and canonical-source rules.

Run from a repository or synced project root:
    python3 validate_metadata.py --root .

The validator is intentionally dependency-free so it can run locally, in a git
hook, or in CI. It does not modify files.
"""
from __future__ import annotations
import argparse, json, re, sys
from pathlib import Path
from datetime import date

STATUSES = {"DRAFT", "REVIEW", "APPROVED", "SUPERSEDED", "ARCHIVED"}
REQUIRED = {"Status", "Version", "Owner", "Last reviewed", "Next review"}
FRONT_RE = re.compile(r"^---\s*$\n(.*?)^---\s*$", re.M | re.S)
FIELD_RE = re.compile(r"^([A-Za-z][A-Za-z ]+):\s*(.*?)\s*$", re.M)
ID_RE = re.compile(r"^#\s+((?:THS|[A-Z][A-Z0-9]+)-[A-Za-z0-9][A-Za-z0-9-]*)\s*$", re.M)
LINK_RE = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def load_manifest(root: Path):
    p = root / "metadata_manifest.json"
    if not p.exists():
        return {"canonical_dirs": ["sops", "templates"], "ignore_dirs": ["archive", "_EXTRACTED_ARCHIVE", "chunks"], "required_governance_links": []}
    return json.loads(p.read_text(encoding="utf-8"))


def parse_front_matter(text: str):
    m = FRONT_RE.search(text)
    if not m:
        return {}, False
    fields = {k.strip(): v.strip().strip('"') for k, v in FIELD_RE.findall(m.group(1))}
    return fields, True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    args = ap.parse_args()
    root = Path(args.root).resolve()
    manifest = load_manifest(root)
    errors, warnings, ids = [], [], {}
    canonical_dirs = [root / x for x in manifest.get("canonical_dirs", [])]
    ignore_dirs = {root / x for x in manifest.get("ignore_dirs", [])}
    files = []
    for d in canonical_dirs:
        if d.exists():
            files.extend(p for p in d.rglob("*.md") if not any(x == p or x in p.parents for x in ignore_dirs))
    for p in sorted(set(files)):
        rel = p.relative_to(root).as_posix()
        text = p.read_text(encoding="utf-8", errors="replace")
        fields, has_front = parse_front_matter(text)
        doc_match = ID_RE.search(text)
        doc_id = doc_match.group(1) if doc_match else None
        if not has_front:
            errors.append(f"{rel}: missing YAML-style front matter")
        missing = REQUIRED - fields.keys()
        if missing:
            errors.append(f"{rel}: missing metadata fields: {', '.join(sorted(missing))}")
        if fields.get("Status") and fields["Status"] not in STATUSES:
            errors.append(f"{rel}: invalid Status={fields['Status']!r}")
        if fields.get("Version") and not re.fullmatch(r"v\d{2}(?:\.\d+)?", fields["Version"]):
            errors.append(f"{rel}: Version must look like v01 or v01.1")
        for k in ("Last reviewed", "Next review"):
            if fields.get(k) and not DATE_RE.fullmatch(fields[k]):
                errors.append(f"{rel}: {k} must be YYYY-MM-DD")
        if fields.get("Status") == "APPROVED" and not fields.get("Approver"):
            errors.append(f"{rel}: APPROVED document requires Approver")
        if doc_id:
            if doc_id in ids:
                errors.append(f"duplicate document ID {doc_id}: {ids[doc_id]} and {rel}")
            ids[doc_id] = rel
        else:
            errors.append(f"{rel}: first H1 must begin with a stable document ID")
        for target in LINK_RE.findall(text):
            if target.startswith(("http://", "https://", "#", "mailto:")):
                continue
            target_path = (p.parent / target.split("#", 1)[0]).resolve()
            if target_path.suffix and not target_path.exists():
                warnings.append(f"{rel}: broken relative link -> {target}")
        required_links = manifest.get("required_governance_links", [])
        if fields.get("Status") in {"REVIEW", "APPROVED"}:
            for needle in required_links:
                if needle not in text:
                    warnings.append(f"{rel}: missing governance dependency text {needle!r}")
    # Detect version-like siblings with no status file in the same family.
    for d in canonical_dirs:
        if not d.exists():
            continue
        by_family = {}
        for p in d.rglob("*.md"):
            family = re.sub(r"-v\d+(?:\.\d+)?(?=\.md$)", "", p.name)
            by_family.setdefault(family, []).append(p)
        for family, paths in by_family.items():
            if len(paths) > 1:
                warnings.append(f"version family has multiple Markdown files: {d.relative_to(root)}/{family} -> {[x.name for x in paths]}")
    print(f"Scanned {len(set(files))} canonical Markdown files under {root}")
    if errors:
        print(f"ERRORS: {len(errors)}")
        for x in errors: print("ERROR", x)
    if warnings:
        print(f"WARNINGS: {len(warnings)}")
        for x in warnings: print("WARN", x)
    if not errors:
        print("PASS: no blocking metadata errors")
    return 1 if errors else 0

if __name__ == "__main__":
    sys.exit(main())
