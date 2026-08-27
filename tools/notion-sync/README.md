# THS Git → Notion synchronization

This directory contains the one-way synchronization layer for the Take Home Studio governance library. Git/Markdown is the canonical source for maintained SOP text and RACI metadata. Notion is the operational index and team-facing view. The workflow never writes backward into Git and never deletes or overwrites cloud files.

## Repository setup

```bash
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit tools/notion-sync/*.py
python3 -m py_compile tools/notion-sync/*.py
```

The local hook runs the fast metadata validator. The CI workflow runs the same validator and checks the RACI manifest. The Notion workflow runs a dry-run first, then applies the one-way property update when scheduled or when a manually dispatched run explicitly sets `apply=true`.

## GitHub setup

Create a GitHub Actions environment named `notion-production`. Store the Notion integration token as an environment secret named `NOTION_TOKEN`; do not commit it, put it in a file, or pass it on a command line. The integration must be shared with the target Operations and Team & Collaborators databases and have read/update content capabilities.

Protect the default branch and require the metadata-drift check before merge. Keep the `notion-production` environment reviewer-gated at first. This prevents an accidental branch or malformed export from writing into the operational index while the team calibrates the mapping.

## Sync commands

Dry-run (no Notion writes):

```bash
NOTION_TOKEN='…' python3 tools/notion-sync/sync_notion_ths.py --root .
```

Apply changes deliberately:

```bash
NOTION_TOKEN='…' python3 tools/notion-sync/sync_notion_ths.py --root . --apply
```

Sync only one side:

```bash
NOTION_TOKEN='…' python3 tools/notion-sync/sync_notion_ths.py --root . --sops-only
NOTION_TOKEN='…' python3 tools/notion-sync/sync_notion_ths.py --root . --raci-only
```

The script matches SOP pages by their `Procedure` title and collaborator pages by `Name`. It updates existing rows rather than creating duplicates. SOP provenance is written to `Source Path`, `Source Version`, and `Source Hash`; RACI provenance is written in `Notes` with the matrix version and source filename.

## Rate and safety controls

The script uses bounded exponential backoff for 429 and transient 5xx responses, queries at most 100 rows per page, and caps Markdown body parsing at 100 blocks. It is intentionally deterministic and has no AI generation step. It does not erase page content, move pages, trash pages, or modify database schemas.

Use the scheduled job as a daily reconciliation, not as a high-frequency poller. For a larger corpus, narrow the sync to changed SOPs using Git diff or use Notion webhooks for event-driven reconciliation. Keep a human reviewer on the production environment until the team has confirmed the first several runs.

## Source files

- `sops/*.md`: canonical Markdown SOPs with YAML-style metadata.
- `raci_matrix.json`: canonical working RACI assignments.
- `sync_notion_ths.py`: one-way Notion API sync.
- `validate_metadata.py`: repository metadata and version checks.
- `verify_manifest.py`: optional SHA-256 manifest verification.
- `.github/workflows/notion-sync.yml`: scheduled/manual synchronization.
