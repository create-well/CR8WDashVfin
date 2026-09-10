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

The next approved source should be **Engineering Delivery** because it is already present in the source registry, is restricted, and has a concrete operational record. Its current record is blocked and explicitly asks for a source-target decision before a production sync PR. Do not enable additional sources until that ambiguity is resolved.

| Source | Current status | Highest-value typed fields | Key validation concern |
|---|---|---|---|
| Engineering Delivery | Registered and enabled; one blocked record observed | `Stage` select, `Surface` multi-select, `Target` date, `Owner` person, URL fields, `Blocked By` text | Decide whether this dashboard mirrors current Create Well OS sources or separate System Admin master sources |
| Money | Registered, restricted, and mirrored | `Amount` number, `Direction` select, `Stage` select, `Actual`/`Expected` dates, relations, URL | Preserve numeric values and restricted sensitivity; retain labeled samples until UI verification |

The Engineering Delivery schema exposes `Target` as a date with expanded SQL columns (`date:Target:start`, `date:Target:end`, and `date:Target:is_datetime`). The implementation must treat those expanded columns as one date envelope rather than exposing them as unrelated fields.

## Delivery sequence

1. **Resolve source authorization.** Confirm the intended Engineering Delivery source family and obtain approval for the exact data source before changing the registry or mirror behavior.
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
