export const NOTION_RECORD_SCHEMA_VERSION = 2 as const;

export type NotionSourceSensitivity = 'team' | 'restricted';

export type NotionPropertyType =
  | 'title'
  | 'rich_text'
  | 'number'
  | 'checkbox'
  | 'select'
  | 'status'
  | 'multi_select'
  | 'date'
  | 'people'
  | 'relation'
  | 'unique_id'
  | 'formula'
  | 'rollup'
  | 'unknown'
  | (string & {});

export interface NotionDateValue {
  start: string | null;
  end: string | null;
  time_zone: string | null;
}

export interface NotionPropertyEnvelope {
  notionType: NotionPropertyType;
  value: unknown;
  displayValue: string;
  sensitivity: NotionSourceSensitivity;
  isEmpty: boolean;
  /** Formula and rollup result subtypes, when Notion provides one. */
  rawType?: string;
}

export interface NotionMirrorRecordV2 {
  recordSchemaVersion: typeof NOTION_RECORD_SCHEMA_VERSION;
  source: string;
  sourcePageId: string;
  sourceUrl: string | null;
  sourceLastEditedAt: string | null;
  archived: boolean;
  properties: Record<string, NotionPropertyEnvelope>;
}

export interface NotionSyncMetaV2 {
  source: 'notion';
  mirrorUpdatedAt: string;
  sourceLastEditedAt: string | null;
  syncRunId: string;
  counts: Record<string, number>;
  recordSchemaVersion: typeof NOTION_RECORD_SCHEMA_VERSION;
  typedSources: string[];
}

export interface NotionValidationIssue {
  path: string;
  message: string;
}

export function isNotionPropertyEnvelope(value: unknown): value is NotionPropertyEnvelope {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<NotionPropertyEnvelope>;
  return typeof candidate.notionType === 'string'
    && typeof candidate.displayValue === 'string'
    && typeof candidate.sensitivity === 'string'
    && typeof candidate.isEmpty === 'boolean'
    && 'value' in candidate;
}

export function unwrapNotionProperty(value: unknown): unknown {
  return isNotionPropertyEnvelope(value) ? value.value : value;
}

function primitiveValue(property: any): { value: unknown; rawType?: string } {
  if (!property || typeof property.type !== 'string') return { value: null };
  const value = property[property.type];

  if (property.type === 'title' || property.type === 'rich_text') {
    return { value: (value ?? []).map((item: any) => item.plain_text ?? item.text?.content ?? '').join('') };
  }
  if (property.type === 'checkbox') return { value: Boolean(value) };
  if (property.type === 'number') return { value: typeof value === 'number' && Number.isFinite(value) ? value : null };
  if (property.type === 'select' || property.type === 'status') return { value: value?.name ?? null };
  if (property.type === 'multi_select') return { value: (value ?? []).map((item: any) => item.name) };
  if (property.type === 'date') {
    return {
      value: value ? {
        start: value.start ?? null,
        end: value.end ?? null,
        time_zone: value.time_zone ?? null,
      } satisfies NotionDateValue : null,
    };
  }
  if (property.type === 'people' || property.type === 'relation') {
    return { value: (value ?? []).map((item: any) => item.id).filter(Boolean) };
  }
  if (property.type === 'unique_id') return { value: value ? `${value.prefix ?? ''}${value.number ?? ''}` : null };
  if (property.type === 'formula') return { value: value?.[value.type] ?? null, rawType: value?.type };
  if (property.type === 'rollup') return { value: value?.type === 'array' ? value.array : value?.[value.type] ?? null, rawType: value?.type };
  return { value: value ?? null };
}

export function displayNotionValue(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(displayNotionValue).filter(Boolean).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function isEmptyNotionValue(value: unknown): boolean {
  return value == null || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && value.length === 0);
}

export function normalizeNotionProperty(
  property: any,
  sensitivity: NotionSourceSensitivity,
): NotionPropertyEnvelope {
  const notionType = (typeof property?.type === 'string' ? property.type : 'unknown') as NotionPropertyType;
  const normalized = primitiveValue(property);
  return {
    notionType,
    value: normalized.value,
    displayValue: displayNotionValue(normalized.value),
    sensitivity,
    isEmpty: isEmptyNotionValue(normalized.value),
    ...(normalized.rawType ? { rawType: normalized.rawType } : {}),
  };
}

export function normalizeNotionRecord(
  page: any,
  source: string,
  sensitivity: NotionSourceSensitivity,
): NotionMirrorRecordV2 {
  return {
    recordSchemaVersion: NOTION_RECORD_SCHEMA_VERSION,
    source,
    sourcePageId: page.id,
    sourceUrl: page.url ?? null,
    sourceLastEditedAt: page.last_edited_time ?? null,
    archived: Boolean(page.archived),
    properties: Object.fromEntries(
      Object.entries(page.properties ?? {}).map(([name, property]) => [name, normalizeNotionProperty(property, sensitivity)]),
    ),
  };
}

export function validateNotionPropertyEnvelope(
  envelope: unknown,
  path = 'property',
): NotionValidationIssue[] {
  const issues: NotionValidationIssue[] = [];
  if (!isNotionPropertyEnvelope(envelope)) {
    return [{ path, message: 'Expected a v2 Notion property envelope' }];
  }
  if (envelope.sensitivity !== 'team' && envelope.sensitivity !== 'restricted') {
    issues.push({ path: `${path}.sensitivity`, message: 'Unsupported sensitivity' });
  }
  if (envelope.notionType === 'number' && envelope.value !== null
      && (typeof envelope.value !== 'number' || !Number.isFinite(envelope.value))) {
    issues.push({ path: `${path}.value`, message: 'Number values must be finite or null' });
  }
  if ((envelope.notionType === 'people' || envelope.notionType === 'relation' || envelope.notionType === 'multi_select')
      && !Array.isArray(envelope.value) && envelope.value !== null) {
    issues.push({ path: `${path}.value`, message: `${envelope.notionType} values must be arrays or null` });
  }
  if (envelope.notionType === 'date' && envelope.value !== null) {
    const date = envelope.value as Partial<NotionDateValue>;
    if (!date || typeof date !== 'object' || !('start' in date) || !('end' in date) || !('time_zone' in date)) {
      issues.push({ path: `${path}.value`, message: 'Date values must include start, end, and time_zone' });
    }
  }
  return issues;
}

export function validateNotionMirrorRecord(record: unknown): NotionValidationIssue[] {
  const issues: NotionValidationIssue[] = [];
  if (!record || typeof record !== 'object') return [{ path: 'record', message: 'Expected a mirror record object' }];
  const candidate = record as Partial<NotionMirrorRecordV2>;
  if (candidate.recordSchemaVersion !== NOTION_RECORD_SCHEMA_VERSION) issues.push({ path: 'recordSchemaVersion', message: 'Expected v2 record schema' });
  if (typeof candidate.sourcePageId !== 'string' || !candidate.sourcePageId) issues.push({ path: 'sourcePageId', message: 'Expected a stable source page ID' });
  if (!candidate.properties || typeof candidate.properties !== 'object' || Array.isArray(candidate.properties)) {
    return [...issues, { path: 'properties', message: 'Expected a property map' }];
  }
  for (const [name, envelope] of Object.entries(candidate.properties)) {
    issues.push(...validateNotionPropertyEnvelope(envelope, `properties.${name}`));
  }
  return issues;
}
