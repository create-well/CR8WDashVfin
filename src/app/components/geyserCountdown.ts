// Countdown derivation for the Geyser launch, extracted from GeyserView so the
// post-launch ("days since launch") behavior can be tested without rendering.
// The target date must be updated each Geyser cycle.
export const GEYSER_COUNTDOWN_TARGET = '2026-04-15T00:00:00';

export type GeyserCountdown = {
  /** Whole-day delta from the reference date to the target (signed). */
  daysToLaunch: number;
  /** True when the target is in the past relative to the reference date. */
  hasLaunched: boolean;
  /** Non-negative day count shown in the UI. */
  display: string;
  /** User-visible label; never a negative countdown. */
  label: string;
};

export function getGeyserCountdown(
  targetDate: string | Date = GEYSER_COUNTDOWN_TARGET,
  referenceDate: Date = new Date(),
): GeyserCountdown {
  const launch = new Date(targetDate);
  const diffDays = (launch.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24);
  const daysToLaunch = diffDays >= 0 ? Math.ceil(diffDays) : -Math.floor(Math.abs(diffDays));
  const hasLaunched = daysToLaunch < 0;
  const count = Math.abs(daysToLaunch);
  return {
    daysToLaunch,
    hasLaunched,
    display: hasLaunched ? `+${count}` : `${count}`,
    label: hasLaunched ? 'days since launch' : 'days til we go live',
  };
}
