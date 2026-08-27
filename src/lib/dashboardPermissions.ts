export const SOURCE_FLOW_STEWARDS = ['monny', 'sunshine', 'bingle', 'omar', 'pia'] as const;

export function canStewardSourceFlow(profile: string | null | undefined): boolean {
  return SOURCE_FLOW_STEWARDS.includes(String(profile ?? '').trim().toLowerCase() as typeof SOURCE_FLOW_STEWARDS[number]);
}
