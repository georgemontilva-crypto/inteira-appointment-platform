/**
 * Centralized pricing constants for Inteira.
 * All session and plan prices live here — update once, reflects everywhere.
 */

export const PRICING = {
  SESSION_BASIC_MXN: 350,
  SESSION_PREMIUM_MXN: 1500,
  PLAN_BASIC_MXN: 980,
  PLAN_PRO_MXN: 2500,
} as const;

/** Pre-formatted display strings (include $ sign and thousands separators) */
export const PRICING_DISPLAY = {
  SESSION_BASIC: "$350",
  SESSION_PREMIUM: "$1,500",
  PLAN_BASIC: "$980",
  PLAN_PRO: "$2,500",
} as const;

/** Returns the credit cost for a session based on its duration in minutes */
export function sessionCostByDuration(durationMinutes: number | undefined): number {
  return (durationMinutes ?? 60) > 60
    ? PRICING.SESSION_PREMIUM_MXN
    : PRICING.SESSION_BASIC_MXN;
}
