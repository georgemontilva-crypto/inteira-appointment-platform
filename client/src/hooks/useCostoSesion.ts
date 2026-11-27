import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { PRICING } from "@/lib/pricing";

type SessionType = "basic" | "premium";

/**
 * Precio de una sesión según el asesor y si quien agenda tiene plan, más su
 * saldo. Lo comparten la agenda de especialidad y la búsqueda de sesiones.
 *
 * El precio lo fija la clasificación del asesor: "pro" se cobra como sesión
 * premium y "basic" como básica.
 */
export function useCostoSesion() {
  const { isAuthenticated } = useAuth();
  const { data: wallet } = trpc.user.getWallet.useQuery(undefined, { enabled: isAuthenticated });

  // Mismo criterio que el servidor: un lote de plan vigente y con saldo.
  const esMiembro = Boolean(
    (wallet as any)?.batches?.some(
      (b: any) =>
        (b.source === "plan_basic" || b.source === "plan_pro") &&
        Number(b.remaining) > 0 &&
        !b.expiredEarly &&
        (!b.expiresAt || new Date(b.expiresAt) > new Date())
    )
  );

  return useMemo(() => {
    const tipoDe = (tier: string): SessionType => (tier === "pro" ? "premium" : "basic");
    const costoDe = (tier: string) =>
      tipoDe(tier) === "premium"
        ? esMiembro
          ? PRICING.SESSION_PREMIUM_MEMBER_MXN
          : PRICING.SESSION_PREMIUM_MXN
        : esMiembro
          ? PRICING.SESSION_BASIC_MEMBER_MXN
          : PRICING.SESSION_BASIC_MXN;
    return { tipoDe, costoDe, saldo: Number((wallet as any)?.balance ?? 0) };
  }, [esMiembro, wallet]);
}
