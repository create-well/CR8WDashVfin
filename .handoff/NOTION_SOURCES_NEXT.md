# Next Notion Sources Iteration

## Decision

**YES: prioritize a typed property contract and source discovery before adding more live databases.** The Money source is now registered, deployed, synced, and visible in Supabase. The next risk is not another source ID. It is preserving property meaning while the dashboard grows.

## Completed baseline

The current registry is in `api/notion-sources.ts`. It drives enabled source reads and mirror keys for People, Flows, Moves, Content, and Money. Money now contains two development records and the production mirror reports 2 records.

The sync reads all registered Notion sources in parallel. The normalizer explicitly handles Checkbox and Number values and already handles title, rich text, select, status, multi-select, date, people, relation, unique ID, formula, and rollup.

## Iteration 1: typed property contract

Add an optional typed envelope for new or sensitive sources while keeping existing plain values backward compatible:

```ts
interface NotionPropertyValue {
  type: string;
  value: unknown;
  displayValue?: string;
  sensitivity?: 'public' | 'team' | 'restricted';
}
```

Use the envelope when a source config sets `typedProperties: true`. Keep People, Flows, Moves, Content, and Money on the current plain-value shape until the frontend contract is ready. This avoids a broad migration for a small improvement.

Explicitly test these live property types next:

| Source | Property | Expected value |
| --- | --- | --- |
| Flows | `Public?` | boolean |
| Flows | `Capacity` | number or null |
| Content | `Final?` | boolean |
| Money | `Amount` | number or null |

Also add explicit handling for Created time, Last edited time, Created by, Last edited by, URL, email, phone number, and unsupported formula or rollup results. Unsupported values should be represented safely, not silently discarded.

## Iteration 2: source discovery manifest

Add a server-only discovery command or protected endpoint that lists candidate Notion data sources visible to the integration. It should return only source ID, title, property names, property types, archived state, and access errors. It must not return page contents or secret values.

Review candidates against four criteria before enabling them:

| Criterion | Pass condition |
| --- | --- |
| Operational value | The team needs the data in the dashboard weekly |
| Source ownership | Notion is the agreed operational owner |
| Sensitivity | The dashboard can show a safe subset |
| Sync cost | Query time and payload remain within limits |

Do not add a new source just because the integration can see it.

## Iteration 3: likely source candidates

Start with one candidate at a time after the discovery manifest identifies the real data-source IDs. Prioritize:

1. **Events or Workshops** if the team needs schedule and capacity visibility.
2. **Decisions** if the team needs an auditable record of current choices.
3. **Intake or Requests** if the team needs a queue view.
4. **Resources** if the team needs links, assets, or reusable materials.

Money should remain restricted. Do not expose account numbers, payment credentials, private notes, or raw financial documents.

## Iteration 4: registry-driven UI

Move the frontend labels, filter options, searchable fields, and sensitivity rules into a registry-shaped response from the server. The current UI hard-codes the five source keys in `NotionMirrorSummary.tsx`. Replace that with a safe metadata response so a new approved source does not require a separate frontend edit.

For Money cards, show the record name and amount together. The current card can identify the record but does not yet format numeric amounts as a visible summary. Add currency only when the source schema provides it.

## Iteration 5: verification and performance

For each new source:

1. Run a dry-run and record count, property names, archived count, latest edit time, and errors.
2. Add one fixture with a Checkbox and one with a Number where the source supports them.
3. Sync only after the dry-run passes.
4. Verify the dashboard count, filter, search, and freshness label.
5. Capture three active-use latency and payload samples.
6. Keep client-side filtering while the payload stays below approximately 250 KB and 500 records.
7. Move search and pagination server-side only after those thresholds are exceeded.

## Current UI test note

The production API returns Money count 2 and numeric Amount values correctly. The connected browser opened `https://www.cr8w.com`, but the browser view artifact failed because the connected Chrome extension URL was inaccessible. Treat the API and source-code checks as passed, and repeat the visual click test when the browser view is available.

## Safe boundary

Never add a master password, shared account, frontend secret, or direct browser write to Notion. Use Supabase Auth for human access and the protected server operator for mirror writes.
