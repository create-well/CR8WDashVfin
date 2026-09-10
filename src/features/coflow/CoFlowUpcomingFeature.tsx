import React from 'react';
import type { CalendarEventKV, CoFlowDate } from '../../app/components/api';
import { UpcomingDates } from './components/UpcomingDates';

export interface CoFlowUpcomingFeatureProps {
  upcomingD8s: CoFlowDate[];
  kvCalEvents: CalendarEventKV[];
  onDeleteCoFlowDate: (id: number) => void;
}

/**
 * First incremental CoFlow migration slice. It owns the upcoming-date and
 * calendar presentation while the parent retains the existing mutation API.
 */
export function CoFlowUpcomingFeature({ upcomingD8s, kvCalEvents, onDeleteCoFlowDate }: CoFlowUpcomingFeatureProps) {
  return (
    <UpcomingDates
      upcomingD8s={upcomingD8s}
      kvCalEvents={kvCalEvents}
      onDeleteCoFlowDate={onDeleteCoFlowDate}
    />
  );
}
