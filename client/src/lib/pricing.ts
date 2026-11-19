/**
 * Centralized pricing constants for Inteira.
 * All session and plan prices live here — update once, reflects everywhere.
 */

export const PRICING = {
  SESSION_BASIC_MXN:          350,
  SESSION_PREMIUM_MXN:        1500,
  SESSION_BASIC_MEMBER_MXN:   245,
  SESSION_PREMIUM_MEMBER_MXN: 1250,
  PLAN_BASIC_MXN:             980,
  PLAN_PRO_MXN:               2500,
} as const;

/** Pre-formatted display strings (include $ sign and thousands separators) */
export const PRICING_DISPLAY = {
  SESSION_BASIC:          "$350",
  SESSION_PREMIUM:        "$1,500",
  SESSION_BASIC_MEMBER:   "$245",
  SESSION_PREMIUM_MEMBER: "$1,250",
  PLAN_BASIC:             "$980",
  PLAN_PRO:               "$2,500",
} as const;

/**
 * Precio de una sesión según la clasificación del asesor.
 *
 * La duración no sirve para distinguirlas: básica y premium duran las dos 60
 * minutos. Lo que marca el precio es el tier del asesor — "pro" se cobra como
 * premium y "basic" como básica.
 */
export function sessionCostByTier(
  tier: string | null | undefined,
  esMiembro = false
): number {
  if (tier === "pro") {
    return esMiembro ? PRICING.SESSION_PREMIUM_MEMBER_MXN : PRICING.SESSION_PREMIUM_MXN;
  }
  return esMiembro ? PRICING.SESSION_BASIC_MEMBER_MXN : PRICING.SESSION_BASIC_MXN;
}

/** Etiqueta visible de la clasificación del asesor. */
export function tierLabel(tier: string | null | undefined): "Pro" | "Básico" {
  return tier === "pro" ? "Pro" : "Básico";
}

/** Returns the credit cost for a session based on its duration in minutes */
export function sessionCostByDuration(durationMinutes: number | undefined): number {
  return (durationMinutes ?? 60) > 60
    ? PRICING.SESSION_PREMIUM_MXN
    : PRICING.SESSION_BASIC_MXN;
}
