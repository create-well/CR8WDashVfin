# Typed Property Envelope and Approved Source Plan

## Decision

The two `[DEV SAMPLE]` Money pages should **remain temporarily**. They are clearly labeled, contain only validation values, and are the only evidence that the restricted Money source is rendering numeric amounts end to end. Deleting them now would remove the current regression fixture before authenticated visual verification has completed. Deletion should be considered after the `/moves` and Money UI checks are available and after the samples are no longer needed. Any deletion requires an explicit confirmation because it changes Notion operational data.

## Reviewed development samples

| Page | Amount | ID | Current recommendation |
|---|---:|---|---|
| `[DEV SAMPLE] Money income test` | 123.45 | MNY-1 | Keep until UI verification is complete |
| `[DEV SAMPLE] Money expense test` | -67.89 | MNY-2 | Keep until UI verification is complete |

Both pages are blank apart from their database properties. They belong to the `MONEY` data source, whose sensitivity is restricted. The read-only source query confirmed both records and their numeric values.

## Envelope goal

The typed property envelope should preserve the normalized value while retaining enough metadata for safe rendering, filtering, and future source-specific validation. The current server-side shape is already a sound starting point:

```ts
interface NotionPropertyValue {
  type: string;
  value: unknown;
  displayValue?: string;
  sensitivity?: 'public' | 'team' | 'restricted';
}
```

The next implementation should make the type field a closed union for supported Notion property types and should keep `value` source-type-specific through a discriminated mapping. The envelope must remain server-generated. The browser must never receive Notion credentials or write operational records directly to Notion.

## Proposed type model

```ts
type NotionPropertyType =
  | 'title' | 'rich_text' | 'number' | 'checkbox'
  | 'select' | 'status' | 'multi_select' | 'date'
  | 'people' | 'relation' | 'url' | 'email'
  | 'phone_number' | 'unique_id' | 'formula' | 'rollup'
  | 'created_time' | 'last_edited_time' | 'created_by' | 'last_edited_by'
  | 'unknown';

type NotionTypedValue =
  | string | number | boolean | null
  | string[]
  | { start: string | null; end: string | null; time_zone: string | null }
  | { id: string; url?: string | null }[]
  | { type: string; value: unknown };

interface NotionPropertyEnvelope {
  type: NotionPropertyType;
  value: NotionTypedValue;
  displayValue?: string;
  sensitivity: 'public' | 'team' | 'restricted';
  sourceProperty: string;
  warnings?: string[];
}
```

`sourceProperty` should be included so a UI or audit log can identify the originating Notion column without guessing from a transformed key. `warnings` should be reserved for non-fatal normalization conditions, such as an unsupported property type or an invalid numeric value converted to `null`.

## Source-specific mapping order

The next approved source is **Engineering Delivery** because it is already present in the source registry, is restricted, and has a concrete operational record. The source-family ambiguity is resolved in favor of the existing CR8W Engineering Delivery data source, not the separate System Admin master sources. This does not authorize any dashboard user grant or production mirror write; server-side restricted-source enforcement remains a prerequisite.

| Source | Current status | Highest-value typed fields | Key validation concern |
|---|---|---|---|
| Engineering Delivery | Registered and enabled; one blocked record observed; source family selected | `Stage` select, `Surface` multi-select, `Target` date, `Owner` person, URL fields, `Blocked By` text | Implement server-side restricted-source enforcement before exposure |
| Money | Registered, restricted, and mirrored | `Amount` number, `Direction` select, `Stage` select, `Actual`/`Expected` dates, relations, URL | Preserve numeric values and restricted sensitivity; retain labeled samples until UI verification |

The Engineering Delivery schema exposes `Target` as a date with expanded SQL columns (`date:Target:start`, `date:Target:end`, and `date:Target:is_datetime`). The implementation must treat those expanded columns as one date envelope rather than exposing them as unrelated fields.

## Delivery sequence

1. **Resolve source authorization.** The source family is now recorded as the existing CR8W Engineering Delivery data source. Obtain the named server-managed user grant or role policy before changing dashboard exposure or performing a real mirror write.
2. **Capture schema evidence.** Record property names, Notion types, select options, relation targets, date expansion rules, sensitivity, and expected display fields.
3. **Implement closed typing.** Replace the open `type: string` envelope with the closed property-type union and add source-property provenance and non-fatal warnings.
4. **Add normalization tests.** Cover number, checkbox, select, status, multi-select, date ranges, relations, URL values, unique IDs, formulas, rollups, unsupported types, and invalid numbers.
5. **Run a dry-run sync.** Report record counts and per-source failures without writing mirror data.
6. **Review sensitivity.** Confirm that restricted fields are minimized in the dashboard payload and are not written to logs, screenshots, or client-side diagnostics.
7. **Perform the approved mirror write.** Write only after the dry-run and sensitivity checks pass. Preserve the last successful mirror on partial source failure.
8. **Verify the endpoint and UI.** Confirm typed envelopes, freshness metadata, filters, search, and source-specific display behavior.
9. **Document the release.** Record the source decision, schema mapping, dry-run counts, mirror run ID, endpoint response, UI result, and any remaining blockers.

## Not now

Do not delete the two Money samples in this pass. Do not enable another Notion source, change the source registry, or perform a real mirror write until the Engineering Delivery source decision and typed-envelope tests are complete. Do not treat the blocked Engineering Delivery record as permission to select a source family autonomously.

## References

[1]: https://www.notion.so/ "Notion workspace and source-of-truth system"
[2]: https://www.cr8w.com/ "CR8W Dashboard production application"
[3]: https://app.notion.com/p/3d724acf799d812eb26ffb8a6d07e953?pvs=204 "Development Money income sample"
[4]: https://app.notion.com/p/3d724acf799d817dbaafeac706a5abd6?pvs=204 "Development Money expense sample"
[5]: https://app.notion.com/p/ca2b83fee6cd4fed9a1d202ed5f6862c?pvs=204 "CR8W Engineering Delivery data source"

Authored by Manus AI.


## Master System schema capture — 2026-09-10

The linked [Create Well OS — Master System](https://app.notion.com/p/7b4774c7e9ad4333841dd757a4b1c1df) is the canonical conceptual map. It defines one strategic spine, five stages, and the transition from a current to a dated flow. The strategic spine data source is `collection://7c9cfca0-378f-455e-bba8-6debc6ce334c`, titled `🌊 Create Well OS — Master`.

The spine schema includes title and text fields (`Name`, `What it holds`, `What needs tending`, `Next gentle move`, `Holding agreement`, `What returns to Source`, and `What the water taught us`), select fields (`Kind`, `Layer`, `Rhythm`, `Runway`, `Stage`, `Water state`, and `Call`), person field (`Held by`), relation fields (`Currents` and `Lives in`), and a date field (`Date`) represented by the expanded columns `date:Date:start`, `date:Date:end`, and `date:Date:is_datetime`. The envelope must preserve those expanded date columns as one `date` value and preserve relation targets as stable IDs rather than names.

The Master System page maps the current operational registry as FLOWS (`collection://c1677843-dd13-4e37-9f80-e960b26847dc`), MOVES (`collection://5597e583-f7df-4f6c-90b0-296a26c57454`), MONEY (`collection://55832c19-38fa-44cb-b4c2-0174b4c5b207`), CONTENT (`collection://cd410d33-8052-4897-8226-3a3ca84ea8bc`), and PEOPLE (`collection://b97bcbdf-2b1b-488d-9d07-4012b031732e`). Their typed mapping order is: title/text and IDs first; select, status, multi-select, checkbox, number, and date values next; relations and people as stable IDs; and URLs, email, phone, formula, rollup, and audit timestamps with sensitivity-aware exposure.

The Master System does not replace the approved Engineering Delivery source decision. Engineering Delivery remains the next restricted source for authorization and schema capture, while the strategic spine and the five operational sources remain separate source-registry decisions. No new source was enabled and no mirror write was performed in this pass.

## Engineering Delivery capture checkpoint — 2026-09-10

The approved source is `CR8W Engineering Delivery`, data source ID `eb498877-a74f-4abe-bac3-8d1dfbc62db8`, with page/database reference `https://app.notion.com/p/ca2b83fee6cd4fed9a1d202ed5f6862c`. Its schema is: `Name` title; `Stage` select with `Ready`, `Building`, `Review`, `Blocked`, `Verified`, and `Dropped`; `Surface` multi-select with `UI`, `API`, `Data/Sync`, and `Platform`; `Target` date; `Owner` person; `Blocked By` text; `GitHub PR`, `Acceptance Evidence`, `API Contract`, and `UI Spec` URLs; and `Last Updated` last-edited-time.

A bounded read-only aggregate query found one non-archived record in `Blocked` stage. Record contents, owner identity, blocker text, and URLs are not repeated here because the source is restricted. The source remains registered and typed, but it must not be included in an unauthorized dashboard payload.
