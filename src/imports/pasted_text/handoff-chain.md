# YES: use Figma → GitHub Copilot → Kimi Code → Manus

This is the strongest handoff chain for CR8W: **Figma chat defines the product and design source of truth. GitHub Copilot cloud agent builds a reviewable first PR. Kimi Code connects to Supabase and performs the careful local integration work. Manus handles research, QA scripts, and scoped parallel tasks.** Your connected tools support reading Figma design files, components, styles, comments, exports, and GitHub’s Copilot coding-agent PR workflow. [figma_mcp_merge][github_mcp_direct]

## Operating split

| Tool | Use it for | Do not use it for |
|---|---|---|
| Figma Chat / Figma Make | Product concept, user flows, dashboard surfaces, component direction, client-portal behavior, page copy, prototype decisions | Your production database authority |
| GitHub Copilot cloud agent | New repo scaffold, initial frontend, docs, reusable components, test setup, PR-based implementation | Live production Supabase changes without review |
| Kimi Code + Supabase MCP | Existing-code context, schema inspection, migrations after approval, RLS, auth, Edge Functions, local debugging, PR review fixes | Broad unreviewed rewrites or secret exposure |
| Manus | Research, competitor scans, documentation drafts, acceptance-test lists, QA plans, user-flow edge cases | Direct database access, merges, production deployments |

## Source of truth

- **Design truth:** Figma file and approved node/frame links.
- **Code truth:** GitHub `main` branch and reviewed pull requests.
- **Data truth:** Supabase migrations, RLS policies, and typed schema definitions in the repo.
- **Decision truth:** GitHub Issues or a `/docs/decisions` log. Never leave product decisions trapped only in chat.
- **Secrets truth:** Supabase secrets and GitHub repository secrets. Never Figma, Git history, `.env.example`, agent prompts, screenshots, or PR comments.

## Execution plan

### 1. Figma Chat: make the build brief

Use Figma Chat or Figma Make first. Ask it to produce the exact screens and states, not only a beautiful dashboard.

```text
We are building CR8W, a creative studio operations dashboard and client portal.

Create the complete product design specification for a production web app.

Core users:
- Internal studio team members
- Workspace admins
- Clients with limited shared access

Core sections:
- Overview
- Projects
- Content pipeline
- Tasks
- Approvals
- Assets
- Calendar
- Client portal
- Workspace settings

For every primary screen, design:
- Default state
- Loading state
- Empty state
- Error state
- Permission-denied state where relevant
- Mobile behavior
- Desktop behavior
- Create, edit, archive, and status-change flows

Design system:
- Editorial creative-studio feeling
- Warm and structured
- Operational, not generic SaaS
- Quiet surfaces with clear hierarchy
- No purple gradients
- No repetitive feature-card grid
- No icon-in-colored-circle treatment
- Accessible contrast and keyboard-visible focus states

Data entities:
- Profiles
- Workspaces
- Workspace members
- Clients
- Projects
- Tasks
- Content items
- Assets
- Deliverables
- Approvals
- Comments
- Activity events
- Client shares

For every screen, identify:
- Required data
- Actions a user can take
- Required permissions
- Empty-state copy
- Error-state copy
- Success feedback
- Status labels
- Any notifications or activity-log events created

Create named frames and reusable components. Add developer-ready annotations for behavior, not just appearance.
```

Then lock your first build scope:

```text
Prepare an MVP handoff for CR8W.

MVP includes:
- Authentication
- Workspace selection
- Overview dashboard
- Projects list and project detail
- Tasks
- Approvals
- Client-safe shared deliverables view

Out of scope:
- Billing
- Advanced reporting
- Full asset DAM
- Complex automation
- Native mobile app

Give each screen and component an exact, stable name for implementation handoff.
```

## 2. GitHub: let Copilot make the first PR

Create the repository, then give Copilot cloud agent a bounded implementation issue. The GitHub connector can delegate a coding task to Copilot and create a PR for review, rather than writing directly to your main branch. [github_mcp_direct]

Use this prompt:

```text
Build the first implementation pass for CR8W, a creative studio operations dashboard and client portal.

Repository objective:
Create a production-ready web-app foundation with a clean component system, protected routes, typed data boundaries, and a Supabase-ready architecture. Do not connect to or mutate any production database.

Tech direction:
- TypeScript
- React and Next.js App Router
- Tailwind CSS
- Supabase client abstraction, but no committed secrets
- Zod validation
- React Hook Form
- Accessible UI primitives
- Testing setup for critical flows
- Environment-variable templates only

Build scope:
- Auth shell with sign-in and sign-out placeholders
- Protected app layout
- Workspace switcher
- Sidebar navigation
- Overview dashboard
- Projects list
- Project detail route
- Tasks list
- Approvals list
- Client shared-deliverables route
- Responsive desktop and mobile layouts
- Loading, empty, error, and permission-denied states

Data models to type locally:
- Profile
- Workspace
- WorkspaceMember
- Client
- Project
- Task
- ContentItem
- Asset
- Deliverable
- Approval
- Comment
- ActivityEvent
- ClientShare

Architecture rules:
- Use a src/ directory.
- Keep database types separate from UI view models.
- Create a service layer for data access.
- Use mock repositories and realistic seed data until Supabase wiring is approved.
- Put shared components in src/components.
- Put domain modules in src/features.
- Put routes in src/app.
- Put validation schemas in src/lib/validation.
- Put types in src/types.
- Use no hardcoded credentials, URLs, keys, or project references.
- Add .env.example with safe variable names only.
- Do not create destructive scripts, migrations, or database calls.
- Do not use placeholder copy such as “Lorem ipsum.”
- Make copy direct, creative-ops focused, and client-safe.

Design rules:
- Do not produce generic SaaS visuals.
- Use restrained color and strong typographic hierarchy.
- Build for Figma parity once design links are provided.
- Do not invent a competing design system.
- Include keyboard navigation, focus states, semantic HTML, and accessible labels.

Documentation:
- Write README setup steps.
- Write docs/architecture.md.
- Write docs/data-model.md.
- Write docs/acceptance-criteria.md.
- Write docs/figma-handoff.md with placeholders for Figma file and node URLs.
- Add a project decision log at docs/decisions.md.

Validation:
- Add lint, typecheck, and test scripts.
- Include a test for route protection, data validation, and an empty state.
- Ensure the app runs locally with mock data.

Open a pull request. In the PR description, list:
- Completed work
- Files added or changed
- Commands to run
- What needs Supabase MCP work next
- Any assumptions that need Monica’s approval
```

## 3. Kimi Code: database and integration pass

Do this **after** the first Copilot PR is reviewed and merged or checked out locally.

First Kimi prompt:

```text
You are the Supabase integration engineer for CR8W.

Current phase: inspect and plan only. Do not modify the Supabase project, create a migration, alter authentication, deploy a function, change storage, or write production data.

Read this repository first:
- README.md
- docs/architecture.md
- docs/data-model.md
- docs/acceptance-criteria.md
- docs/figma-handoff.md
- src/types
- src/features
- src/lib
- .env.example

Then use the connected Supabase MCP to inspect:
- Existing database schema
- Existing migrations
- Auth configuration
- Existing RLS policies
- Storage buckets
- Edge Functions
- Branching configuration, if enabled

Return a concise implementation plan with:
1. Existing-state summary
2. Schema gaps
3. Proposed migrations in dependency order
4. Proposed Row Level Security policies
5. Auth and client-portal access approach
6. Required environment variables
7. Storage approach for assets
8. Risks, including destructive or irreversible steps
9. Rollback plan
10. A test plan

Do not execute changes. Wait for approval.
```

After you approve its plan, use this:

```text
Approved scope: implement CR8W MVP database and integration only.

Create additive, reversible migrations for:
- profiles
- workspaces
- workspace_members
- clients
- projects
- tasks
- deliverables
- approvals
- comments
- activity_events
- client_shares

Requirements:
- UUID primary keys.
- created_at and updated_at timestamps.
- created_by where relevant.
- Soft archive columns for user work. Avoid hard deletion.
- Workspace-level tenancy.
- RLS enabled on every user-data table.
- Internal users may only access records in workspaces where they are active members.
- Workspace admins manage membership and workspace settings.
- Clients may only access explicitly shared client-share resources.
- No broad public read policy.
- Client share links must be revocable and expire.
- Record activity events for create, status change, approval, comment, archive, and share creation.
- Generate typed database definitions for the frontend.
- Update the frontend service layer to use the new schema.
- Add seed data that is clearly development-only.
- Add integration tests for RLS-sensitive paths where practical.

Before each migration, show me the exact SQL and expected impact. Do not continue until I approve that migration.
```

## 4. Manus: research and QA support

Give Manus work that produces decisions or test artifacts, not database actions.

```text
Research creative-studio dashboard and client-portal patterns for CR8W.

Deliver:
- Five strong reference products or workflows.
- Specific interaction patterns for project health, approvals, client sharing, content pipelines, and activity history.
- A table separating patterns to borrow from patterns to avoid.
- A mobile-use audit for a working creative director.
- A list of 20 acceptance tests for the CR8W MVP.
- Edge cases for access permissions, expired share links, duplicate approvals, failed uploads, offline edits, and conflicting updates.
- Plain-language client-facing copy for empty states, access denial, expired links, and approval completion.

Do not recommend generic enterprise patterns unless they solve a specific CR8W problem.
```

## PR gates

Do not merge until each gate passes:

- Figma frame exists for the screen or flow being built.
- GitHub PR has no exposed keys, project refs, or production credentials.
- Lint, typecheck, and tests pass.
- Critical route flows work with mock data before real data.
- Kimi Code has documented RLS policies before schema changes.
- You have approved every Supabase migration.
- Desktop and mobile screens match the Figma intent.
- Client views cannot reveal workspace-private records.
- Archive actions are reversible.
- The PR contains docs for any new environment variable, permission rule, or migration.

## Fastest first sprint

- **Day 1:** Figma MVP frames plus GitHub starter PR.
- **Day 2:** Review and merge the UI foundation. Manus delivers QA and edge cases.
- **Day 3:** Kimi inspects Supabase and proposes schema plus RLS. You approve only the first additive migration.
- **Day 4:** Kimi wires auth, workspace context, and project CRUD.
- **Day 5:** Build approvals and client-shared deliverables, then run the acceptance checklist.

## Decision

**YES: use all four, but keep one owner per layer.** Figma owns intent, GitHub owns reviewed code, Kimi owns careful Supabase execution, and Manus owns research and test pressure.

**Why:** That prevents your design, code, and database from drifting into four competing versions of CR8W.

**Ignore today:** Webhooks, advanced automation, billing, and full asset-library complexity.

Smallest Next Action: Paste the **Figma Chat build brief** into Figma and lock the six-screen MVP before creating the GitHub Copilot task.