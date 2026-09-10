export const NOTION_SOURCES = {
  people: {
    dataSourceId: 'b97bcbdf-2b1b-488d-9d07-4012b031732e',
    label: 'People',
    enabled: true,
    visible: true,
    searchable: true,
    typedProperties: true,
    displayFields: ['Name', 'Role', 'Status'],
    sensitivity: 'team' as const,
  },
  flows: {
    dataSourceId: 'c1677843-dd13-4e37-9f80-e960b26847dc',
    label: 'Flows',
    enabled: true,
    visible: true,
    searchable: true,
    typedProperties: true,
    displayFields: ['Name', 'Status', 'Owner'],
    sensitivity: 'team' as const,
  },
  moves: {
    dataSourceId: '5597e583-f7df-4f6c-90b0-296a26c57454',
    label: 'Moves',
    enabled: true,
    visible: true,
    searchable: true,
    typedProperties: true,
    displayFields: ['Name', 'Status', 'Owner'],
    sensitivity: 'team' as const,
  },
  content: {
    dataSourceId: 'cd410d33-8052-4897-8226-3a3ca84ea8bc',
    label: 'Content',
    enabled: true,
    visible: true,
    searchable: true,
    typedProperties: true,
    displayFields: ['Name', 'Status', 'Owner'],
    sensitivity: 'team' as const,
  },
  money: {
    dataSourceId: '55832c19-38fa-44cb-b4c2-0174b4c5b207',
    label: 'Money',
    enabled: true,
    visible: true,
    searchable: true,
    typedProperties: true,
    displayFields: ['Name', 'Amount', 'Kind', 'Direction', 'Stage', 'Actual', 'Expected', 'Doc'],
    sensitivity: 'restricted' as const,
  },
  engineeringDelivery: {
    dataSourceId: 'eb498877-a74f-4abe-bac3-8d1dfbc62db8',
    label: 'Engineering Delivery',
    enabled: true,
    visible: true,
    searchable: true,
    typedProperties: true,
    displayFields: ['Name', 'Stage', 'Surface', 'Target', 'Owner', 'Blocked By', 'GitHub PR', 'Acceptance Evidence'],
    sensitivity: 'restricted' as const,
  },
} as const;

export type NotionSourceKey = keyof typeof NOTION_SOURCES;
export type NotionSourceConfig = typeof NOTION_SOURCES[NotionSourceKey];
export type NotionPropertySensitivity = 'public' | 'team' | 'restricted';
// Alias kept for main-branch compatibility; new code should use NotionPropertySensitivity.
export type NotionSourceSensitivity = NotionSourceConfig['sensitivity'];

export const ENABLED_NOTION_SOURCES = Object.entries(NOTION_SOURCES).filter(([, source]) => source.enabled) as [NotionSourceKey, NotionSourceConfig][];

export function publicSourceMetadata(source: NotionSourceKey, config: NotionSourceConfig, recordCount = 0) {
  return {
    key: source,
    label: config.label,
    visible: config.visible,
    searchable: config.searchable,
    sensitivity: config.sensitivity,
    displayFields: config.displayFields,
    recordCount,
  };
}

export const PUBLIC_NOTION_SOURCE_METADATA = ENABLED_NOTION_SOURCES.map(([source, config]) => publicSourceMetadata(source, config));
