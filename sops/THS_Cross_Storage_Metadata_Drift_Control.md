---
Document ID: THS-CROSS-STORAGE-METADATA
Notion Title: THS — Cross-Storage Metadata Drift Control
Status: DRAFT
Version: v01
Owner: Monica
Approver: [confirm with core team]
Domain: Operations
Frequency: As Needed
Last reviewed: 2026-08-27
Next review: 2026-11-27
---
# THS-CROSS-STORAGE-METADATA

## Purpose
Prevent divergent versions of canonical SOPs, RACI records, legal templates, and derivatives across Git, Google Drive, and local sync folders.

## Controls
Run fast deterministic metadata validation pre-commit. Run policy, syntax, link, and manifest validation in CI. Run document export and cross-storage reconciliation on release or scheduled review, never on every commit.

## Conflict rule
Report source, version, or hash conflicts for human resolution. Never auto-overwrite or delete a cloud file.

## Provenance
Every Notion SOP record stores the repository path, source version, and content hash. The repository remains the canonical source for maintained Markdown SOPs; Notion is the operational index and human-facing view.
