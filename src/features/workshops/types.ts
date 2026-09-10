import type { Workshop, WorkshopProgram, WorkshopResource } from '@/app/components/api';

export type WorkshopTab = 'pipeline' | 'programs' | 'facilitators' | 'resources' | 'calendar';

export interface WorkshopsViewProps {
  workshops: Workshop[];
  programs: WorkshopProgram[];
  resources: WorkshopResource[];
  onAddWorkshop: (w: Omit<Workshop, 'id' | 'created_at'>) => void;
  onUpdateWorkshop: (id: number, updates: Partial<Workshop>) => void;
  onDeleteWorkshop: (id: number) => void;
  onAddProgram: (p: Omit<WorkshopProgram, 'id' | 'created_at'>) => void;
  onUpdateProgram: (id: number, updates: Partial<WorkshopProgram>) => void;
  onDeleteProgram: (id: number) => void;
  onAddResource: (r: Omit<WorkshopResource, 'id' | 'created_at'>) => void;
  onDeleteResource: (id: number) => void;
}

export type CoFlowProfile = {
  energyType: string;
  bestDays: string[];
  flowWindow: string;
  commitment: string;
  synergies: { with: string; note: string }[];
};

export interface GCalEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
}
