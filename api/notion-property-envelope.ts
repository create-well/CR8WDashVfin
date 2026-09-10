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
  | 'url'
  | 'email'
  | 'phone_number'
  | 'unique_id'
  | 'formula'
  | 'rollup'
  | 'created_time'
  | 'last_edited_time'
  | 'created_by'
  | 'last_edited_by'
  | 'unknown';

export type NotionPropertySensitivity = 'public' | 'team' | 'restricted';

export interface NotionDateValue {
  start: string | null;
  end: string | null;
  time_zone: string | null;
}

export interface NotionRelationValue {
  id: string;
  url: string | null;
}

export type NotionPropertyValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | NotionDateValue
  | NotionRelationValue[]
  | { type: string; value: unknown };

export interface NotionPropertyEnvelope {
  type: NotionPropertyType;
  value: NotionPropertyValue;
  displayValue?: string;
  sensitivity: NotionPropertySensitivity;
  sourceProperty: string;
  warnings?: string[];
}

export interface RawNotionProperty {
  type?: string;
  [key: string]: unknown;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function propertyType(value: unknown): NotionPropertyType {
  const supported: NotionPropertyType[] = [
    'title', 'rich_text', 'number', 'checkbox', 'select', 'status', 'multi_select',
    'date', 'people', 'relation', 'url', 'email', 'phone_number', 'unique_id',
    'formula', 'rollup', 'created_time', 'last_edited_time', 'created_by', 'last_edited_by',
  ];
  return typeof value === 'string' && supported.includes(value as NotionPropertyType)
    ? value as NotionPropertyType
    : 'unknown';
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function textValue(value: unknown): string {
  return asArray(value).map(item => {
    const record = asRecord(item);
    const text = asRecord(record.text);
    return typeof record.plain_text === 'string' ? record.plain_text : stringValue(text.content) ?? '';
  }).join('');
}

function dateValue(value: unknown): NotionDateValue | null {
  if (!value) return null;
  const record = asRecord(value);
  return {
    start: stringValue(record.start),
    end: stringValue(record.end),
    time_zone: stringValue(record.time_zone),
  };
}

function relationValue(value: unknown): NotionRelationValue[] {
  return asArray(value).flatMap(item => {
    const record = asRecord(item);
    return typeof record.id === 'string' ? [{ id: record.id, url: stringValue(record.url) }] : [];
  });
}

function displayValue(value: NotionPropertyValue): string | undefined {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value) && value.every(item => typeof item === 'string')) return value.join(', ');
  if (value && typeof value === 'object' && 'start' in value) return value.start ?? undefined;
  return undefined;
}

export function normalizeNotionProperty(
  sourceProperty: string,
  property: RawNotionProperty | null | undefined,
  sensitivity: NotionPropertySensitivity = 'team',
): NotionPropertyEnvelope {
  const type = propertyType(property?.type);
  const rawValue = property?.[property?.type ?? ''];
  const warnings: string[] = [];
  let value: NotionPropertyValue;

  switch (type) {
    case 'title':
    case 'rich_text':
      value = textValue(rawValue);
      break;
    case 'number':
      value = typeof rawValue === 'number' && Number.isFinite(rawValue) ? rawValue : null;
      if (rawValue !== null && rawValue !== undefined && value === null) warnings.push('Invalid number normalized to null');
      break;
    case 'checkbox':
      value = Boolean(rawValue);
      break;
    case 'select':
    case 'status':
      value = stringValue(asRecord(rawValue).name);
      break;
    case 'multi_select':
      value = asArray(rawValue).flatMap(item => {
        const name = stringValue(asRecord(item).name);
        return name ? [name] : [];
      });
      break;
    case 'date':
      value = dateValue(rawValue);
      break;
    case 'people':
    case 'relation':
      value = relationValue(rawValue);
      break;
    case 'url':
    case 'email':
    case 'phone_number':
    case 'created_time':
    case 'last_edited_time':
      value = stringValue(rawValue);
      break;
    case 'unique_id': {
      const id = asRecord(rawValue);
      const prefix = stringValue(id.prefix) ?? '';
      const number = typeof id.number === 'number' ? String(id.number) : '';
      value = prefix || number ? `${prefix}${number}` : null;
      break;
    }
    case 'formula':
    case 'rollup': {
      const record = asRecord(rawValue);
      const resultType = stringValue(record.type) ?? 'unknown';
      value = { type: resultType, value: record[resultType] ?? null };
      break;
    }
    case 'created_by':
    case 'last_edited_by': {
      const record = asRecord(rawValue);
      value = typeof record.id === 'string' ? [{ id: record.id, url: stringValue(record.url) }] : [];
      break;
    }
    case 'unknown':
      value = rawValue === undefined ? null : rawValue as NotionPropertyValue;
      warnings.push(`Unsupported Notion property type: ${String(property?.type ?? 'missing')}`);
      break;
  }

  const result: NotionPropertyEnvelope = {
    type,
    value,
    sensitivity,
    sourceProperty,
  };
  const rendered = displayValue(value);
  if (rendered !== undefined) result.displayValue = rendered;
  if (warnings.length) result.warnings = warnings;
  return result;
}
