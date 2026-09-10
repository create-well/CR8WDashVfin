import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../../app/components/api';
import { createCoFlowActions } from '../actions';

vi.mock('../../../app/components/api', () => ({
  createCoFlowDate: vi.fn(),
  updateCoFlowDate: vi.fn(),
  deleteCoFlowDate: vi.fn(),
  createCoFlowCheckin: vi.fn(),
  deleteCoFlowCheckin: vi.fn(),
}));

describe('CoFlow actions', () => {
  const setDates = vi.fn();
  const setCheckins = vi.fn();
  const sendSystemMessage = vi.fn();
  let dates: any[] = [{
    id: 7,
    date: '2099-09-12',
    timeRange: '6:00 PM – 7:00 PM',
    location: 'The Well',
    rsvp: {},
    agendaItems: [],
    notes: '',
    vibeCheck: '',
    status: 'upcoming',
  }];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.updateCoFlowDate).mockResolvedValue(dates[0]);
    vi.mocked(api.deleteCoFlowDate).mockResolvedValue(undefined as never);
    vi.mocked(api.deleteCoFlowCheckin).mockResolvedValue(undefined as never);
  });

  it('optimistically updates an agenda and persists the mutation', async () => {
    const actions = createCoFlowActions(setDates, setCheckins, () => dates, sendSystemMessage);
    await actions.updateCoFlowDate(7, { agendaItems: [{ id: 1, text: 'Open', lead: 'monny', timeEstimate: 10, done: false }] });

    expect(setDates).toHaveBeenCalledWith(expect.any(Function));
    expect(api.updateCoFlowDate).toHaveBeenCalledWith(7, expect.objectContaining({ agendaItems: expect.any(Array) }));
  });

  it('removes a date optimistically and emits a cancellation message', async () => {
    const actions = createCoFlowActions(setDates, setCheckins, () => dates, sendSystemMessage);
    await actions.deleteCoFlowDate(7);

    expect(setDates).toHaveBeenCalledWith(expect.any(Function));
    expect(api.deleteCoFlowDate).toHaveBeenCalledWith(7);
    expect(sendSystemMessage).toHaveBeenCalledWith(expect.stringContaining('cancelled'));
  });

  it('removes a check-in optimistically without touching date state', async () => {
    const actions = createCoFlowActions(setDates, setCheckins, () => dates, sendSystemMessage);
    await actions.deleteCoFlowCheckin(11);

    expect(setCheckins).toHaveBeenCalledWith(expect.any(Function));
    expect(setDates).not.toHaveBeenCalled();
    expect(api.deleteCoFlowCheckin).toHaveBeenCalledWith(11);
  });
});
