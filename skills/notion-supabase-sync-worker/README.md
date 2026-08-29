# Notion-to-Supabase Sync Worker Skill

This directory contains the reusable `notion-supabase-sync-worker` skill for secure, server-only synchronization between Notion source-of-truth databases and Supabase operational stores.

## Install

Copy this directory into the target agent workspace’s skills directory, preserving `SKILL.md` and its frontmatter. The skill is workspace-neutral and contains no credentials, private workspace IDs, or raw Notion records.

## First use

Read `SKILL.md` before implementation. Start with read-only Notion schema verification, then write a versioned mapping and synchronization contract. Begin workers in dry-run mode and keep Notion write-back disabled until migrations, conflict policy, and authorization are reviewed.

## Runtime configuration

Use `config/notion-sync.env.example` as the server-only variable template. Never expose these values through client-prefixed variables such as `VITE_`, `PUBLIC_`, or `NEXT_PUBLIC_`. Never commit a populated `.env` file.

## Safety boundary

Existing business databases remain the source of truth. Optional operational databases for checkpoints, dead letters, or run audits require a written proposal and explicit approval before creation. Plan output is not evidence that a Notion mutation occurred.

## Validation

At minimum, validate syntax, mapping and normalization tests, missing-secret fail-closed behavior, bounded dry-run behavior, secret scans, `git diff --check`, and the target repository build. Record unavailable credentials or dependencies instead of bypassing checks.
