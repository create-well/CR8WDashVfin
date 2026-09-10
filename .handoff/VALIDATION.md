# Validation

## Notion API

The Money data source was readable through the Notion API with the configured server credential. It initially returned zero records. Two `[DEV SAMPLE]` pages were created with numeric Amount values and were returned by a follow-up data-source query.

The Money schema includes an Amount number property. The registered Flows and Content schemas also expose Checkbox properties, confirming that the new normalizer paths correspond to live Notion property types.

## Code

Added `api/notion-sources.ts` as the shared metadata-driven source registry. The operator sync and dashboard read endpoint now derive enabled sources and mirror keys from the registry.

Added explicit Checkbox and Number handling in `api/notion-sync.ts`:

- Checkbox becomes a boolean.
- Number becomes a finite number or null.

## Passed

| Check | Result |
| --- | --- |
| Notion Money schema request | Pass |
| Notion Money query before samples | Pass, 0 records |
| Notion sample creation | Pass, 2 records |
| Notion sample verification | Pass, amounts 123.45 and -67.89 |
| Checkbox/Number schema scan | Pass |
| Vite production build | Pass |
| Server function parsing | Pass |
| Temporary script cleanup | Pass |

## Not Yet Done

The protected operator sync was not called, so Supabase still has the previous Money mirror count of 0. Production deployment of this registry change has not occurred yet.
