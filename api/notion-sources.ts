export const NOTION_SOURCES = {
  people: {
    dataSourceId: 'b97bcbdf-2b1b-488d-9d07-4012b031732e',
    label: 'People',
    enabled: true,
    displayFields: ['Name', 'Role', 'Status'],
    sensitivity: 'team' as const,
    typedProperties: false,
    searchable: true,
    visible: true,
  },
  flows: {
    dataSourceId: 'c1677843-dd13-4e37-9f80-e960b26847dc',
    label: 'Flows',
    enabled: true,
    displayFields: ['Name', 'Status', 'Owner'],
    sensitivity: 'team' as const,
    typedProperties: false,
    searchable: true,
    visible: true,
  },
  moves: {
    dataSourceId: '5597e583-f7df-4f6c-90b0-296a26c57454',
    label: 'Moves',
    enabled: true,
    displayFields: ['Name', 'Status', 'Owner'],
    sensitivity: 'team' as const,
    typedProperties: false,
    searchable: true,
    visible: true,
  },
  content: {
    dataSourceId: 'cd410d33-8052-4897-8226-3a3ca84ea8bc',
    label: 'Content',
    enabled: true,
    displayFields: ['Name', 'Status', 'Owner'],
    sensitivity: 'team' as const,
    typedProperties: false,
    searchable: true,
    visible: true,
  },
  money: {
    dataSourceId: '55832c19-38fa-44cb-b4c2-0174b4c5b207',
    label: 'Money',
    enabled: true,
    displayFields: ['Name', 'Amount', 'Kind', 'Direction', 'Stage', 'Actual', 'Expected', 'Doc'],
    sensitivity: 'restricted' as const,
    typedProperties: true,
    searchable: true,
    visible: true,
  },
} as const;

export type NotionSourceKey = keyof typeof NOTION_SOURCES;
export type NotionSourceConfig = typeof NOTION_SOURCES[NotionSourceKey];
export type NotionSourceSensitivity = NotionSourceConfig['sensitivity'];

export const ENABLED_NOTION_SOURCES = Object.entries(NOTION_SOURCES).filter(([, source]) => source.enabled) as [NotionSourceKey, NotionSourceConfig][];
