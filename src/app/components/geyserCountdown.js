// Update this for each new Geyser cycle.
export const GEYSER_COUNTDOWN_TARGET = '2026-04-15';

export function getGeyserCountdown(targetDate = GEYSER_COUNTDOWN_TARGET, referenceDate = new Date()) {
  const target = new Date(`${targetDate}T00:00:00`);
  const dayMs = 1000 * 60 * 60 * 24;
  const now = referenceDate instanceof Date
    ? new Date(referenceDate)
    : new Date(`${referenceDate}T00:00:00`);
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((target.getTime() - now.getTime()) / dayMs);
  const targetLabel = target.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  if (diffDays > 0) {
    return {
      count: diffDays,
      compactLabel: 'days til we go live',
      detailLabel: 'days until',
      targetLabel,
    };
  }

  const elapsedDays = Math.abs(diffDays);

  return {
    count: elapsedDays,
    compactLabel: elapsedDays === 0 ? 'cycle complete' : 'days since we went live',
    detailLabel: elapsedDays === 0 ? 'cycle complete' : 'days since',
    targetLabel,
  };
}
