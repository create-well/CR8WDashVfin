// ViewShell state derivation for the FLOWS route, extracted from FlowsPage so
// the empty/failed/fresh behavior can be tested without a React render harness.
export type FlowsViewState = 'loading' | 'failed' | 'stale' | 'empty' | 'fresh';

export function getFlowsViewState(input: {
  syncStatus: string;
  workshops?: unknown[] | null;
  workshopPrograms?: unknown[] | null;
}): FlowsViewState {
  const workshops = input.workshops ?? [];
  const programs = input.workshopPrograms ?? [];
  if (input.syncStatus === 'loading') return 'loading';
  if (input.syncStatus === 'failed') return 'failed';
  if (input.syncStatus === 'stale') return 'stale';
  return workshops.length === 0 && programs.length === 0 ? 'empty' : 'fresh';
}
