import React from 'react';
import { useDashboard } from '../../contexts/DashboardContext';
import { ViewShell } from '../components/ViewShell';
import { WorkshopsView } from '../components/WorkshopsView';

export function FlowsPage() {
  const { data, actions } = useDashboard();
  const workshops = data.workshops ?? [];
  const programs = data.workshopPrograms ?? [];
  const resources = data.workshopResources ?? [];

  const state =
    data.syncStatus === 'loading' ? 'loading' :
    data.syncStatus === 'failed' ? 'failed' :
    data.syncStatus === 'stale' ? 'stale' :
    (workshops.length === 0 && programs.length === 0) ? 'empty' : 'ready';

  return (
    <ViewShell
      state={state}
      emptyTitle="No FLOWS yet"
      emptyBody="Public workshops, programs, and resources will appear here when they are available."
      onRetry={actions.retrySync}
    >
      <WorkshopsView
        workshops={workshops}
        programs={programs}
        resources={resources}
        onAddWorkshop={actions.addWorkshop}
        onUpdateWorkshop={actions.updateWorkshop}
        onDeleteWorkshop={actions.deleteWorkshop}
        onAddProgram={actions.addWorkshopProgram}
        onUpdateProgram={actions.updateWorkshopProgram}
        onDeleteProgram={actions.deleteWorkshopProgram}
        onAddResource={actions.addWorkshopResource}
        onDeleteResource={actions.deleteWorkshopResource}
      />
    </ViewShell>
  );
}
