import { trpc } from "@/lib/trpc";
import { PRICING, PRICING_DISPLAY } from "@/lib/pricing";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import DashboardLayout from "../components/DashboardLayout";
import {
  Wallet,
  Clock,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  ShoppingCart,
  Info,
  Tag,
  CheckCircle2,
  XCircle,
  Gift,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

// ─── Source labels ────────────────────────────────────────────────────────────
const SOURCE_LABELS: Record<string, string> = {
  plan_basic: "Plan Básico",
  plan_pro: "Plan Pro",
  individual_basic: "Sesión Básica",
  individual_premium: "Sesión Premium",
};

const SOURCE_COLORS: Record<string, string> = {
  plan_basic: "bg-blue-100 text-blue-700",
  plan_pro: "bg-primary/10 text-primary",
  individual_basic: "bg-emerald-100 text-emerald-700",
  individual_premium: "bg-purple-100 text-purple-700",
};

const REASON_LABELS: Record<string, string> = {
  purchase: "Compra",
  consume: "Consumo",
  expire: "Expiración",
  refund: "Reembolso",
};

function BatchStatusBadge({ batch }: { batch: { remaining: number; expiresAt: string | Date; expiredEarly: boolean | null } }) {
  const now = new Date();
  const expiry = new Date(batch.expiresAt);
  const daysLeft = differenceInDays(expiry, now);

  if (batch.expiredEarly) {
    return <Badge className="bg-red-100 text-red-700 border-0 text-[10px]">Cancelada</Badge>;
  }
  if (batch.remaining === 0) {
    return <Badge className="bg-gray-100 text-gray-600 border-0 text-[10px]">Agotado</Badge>;
  }
  if (expiry < now) {
    return <Badge className="bg-red-100 text-red-700 border-0 text-[10px]">Expirado</Badge>;
  }
  if (daysLeft <= 10) {
    return <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">Vence en {daysLeft}d</Badge>;
  }
  return <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">Activo</Badge>;
}

async function redirectToStripeCheckout(productType: string, discountCode?: string) {
  try {
    const res = await fetch("/api/stripe/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productType, ...(discountCode ? { discountCode } : {}) }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error(data.error ?? "Error desconocido");
    }
  } catch (err) {
    toast.error("Error al iniciar el pago. Intenta de nuevo.");
    console.error("[Stripe] Error:", err);
  }
}

export default function WalletPage() {
  const { isAuthenticated, loading, user } = useAuth();
  const [checkingPayment, setCheckingPayment] = useState(false);
  const { data: wallet, isLoading, refetch } = trpc.user.getWallet.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Detectar retorno de Stripe y hacer polling hasta que los créditos aparezcan
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("payment") === "cancelled") {
      toast.info("Pago cancelado.");
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (params.get("payment") !== "success") return;

    // Limpiar URL inmediatamente para que no persista en recargas
    window.history.replaceState({}, "", window.location.pathname);
    setCheckingPayment(true);
    toast.success("¡Pago recibido! Verificando tus créditos...");

    let attempts = 0;
    const MAX_ATTEMPTS = 10; // 10 × 3s = 30 segundos máximo
    let baseBalance: number | null = null;

    const poll = setInterval(async () => {
      attempts++;
      const result = await refetch();
      const newBalance = result.data?.balance ?? 0;

      // Capturar el balance inicial en el primer resultado
      if (baseBalance === null) {
        baseBalance = newBalance;
      }

      const credited = newBalance > baseBalance;

      if (credited || attempts >= MAX_ATTEMPTS) {
        clearInterval(poll);
        setCheckingPayment(false);
        if (credited) {
          toast.success(`¡Créditos acreditados! Tu nuevo saldo: ${newBalance.toLocaleString("es-MX")} créditos.`);
        } else {
          toast.info("Los créditos llegarán en breve. Si no aparecen en unos minutos, recarga la página.");
        }
      }
    }, 3000);

    return () => clearInterval(poll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [buyingSession, setBuyingSession] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [discountResult, setDiscountResult] = useState<null | {
    valid: true; type: "percentage" | "fixed"; value: number;
    discountAmount: number; finalAmount: number; discountCodeId: number;
  } | { valid: false; reason: string }>(null);

  const validateDiscountMutation = trpc.user.validateDiscountCode.useMutation({
    onSuccess: (data) => {
      setDiscountResult(data);
      if (!data.valid) toast.error(data.reason);
    },
    onError: () => toast.error("Error al validar el código"),
  });

  const handleApplyDiscount = (productType: string) => {
    if (!discountCode.trim()) return;
    validateDiscountMutation.mutate({
      code: discountCode.trim(),
      productType: productType as "individual_basic" | "individual_premium" | "plan_basic" | "plan_pro",
    });
  };

  const [prepaidCode, setPrepaidCode] = useState("");
  const redeemMutation = trpc.user.redeemPrepaidCard.useMutation({
    onSuccess: (data) => {
      toast.success(`¡${data.credits.toLocaleString("es-MX")} créditos acreditados a tu wallet!`);
      setPrepaidCode("");
      refetch();
    },
    onError: (err: any) => toast.error(err.message ?? "Código inválido o ya fue canjeado"),
  });

  const handlePrepaidInput = (raw: string) => {
    // Strip non-alphanumeric, uppercase, limit to 16 chars, then insert dashes
    const clean = raw.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 16);
    const parts = clean.match(/.{1,4}/g) ?? [];
    setPrepaidCode(parts.join("-"));
  };

  const handleBuySession = async (sessionType: string) => {
    if (!user?.id) return;
    setBuyingSession(sessionType);
    const code = discountResult?.valid ? discountCode.trim() : undefined;
    await redirectToStripeCheckout(sessionType, code);
    setBuyingSession(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div style={{ padding: "24px", maxWidth: "900px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ height: "32px", width: "200px", background: "#e8ede8", borderRadius: "8px" }} />
          <div style={{ height: "120px", background: "#e8ede8", borderRadius: "12px" }} />
          <div style={{ height: "200px", background: "#e8ede8", borderRadius: "12px" }} />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Inicia sesión para ver tu wallet</h2>
          <a href={getLoginUrl()}>
            <Button className="gradient-brand text-white border-0">Iniciar sesión</Button>
          </a>
        </div>
      </div>
    );
  }

  const balance = wallet?.balance ?? 0;
  const batches = wallet?.batches ?? [];
  const transactions = wallet?.transactions ?? [];
  const nextExpiry = wallet?.nextExpiry ? new Date(wallet.nextExpiry) : null;
  const activeBatches = batches.filter(
    (b) => b.remaining > 0 && !b.expiredEarly && new Date(b.expiresAt) > new Date()
  );

  const sessionsCompleted = transactions.filter((tx) => tx.reason === "consume").length;
  const totalCreditsUsed = Math.abs(
    transactions.filter((tx) => tx.delta < 0).reduce((sum, tx) => sum + tx.delta, 0)
  );
  const activePlanBatch = activeBatches.find((b) => (b.source as string)?.startsWith("plan_"));

  return (
    <DashboardLayout>
      <div className="bg-white min-h-full">
        <div className="container py-6 max-w-4xl space-y-5">

          {/* ── 1. Balance card ── */}
          <div className="rounded-2xl bg-[#5B6A57] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div>
              <p className="text-[#c5d0c2] text-xs uppercase tracking-widest mb-1">
                {checkingPayment ? "Verificando pago..." : "Saldo disponible"}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white" style={{ fontFamily: "Poppins, sans-serif" }}>
                  {balance.toLocaleString("es-MX")}
                </span>
                <span className="text-lg text-[#c5d0c2]">créditos</span>
              </div>
              <p className="text-[#c5d0c2] text-sm mt-1">
                = <strong className="text-white">${balance.toLocaleString("es-MX")} MXN</strong>
              </p>
              {(wallet?.reservedCredits ?? 0) > 0 && (
                <p className="text-amber-300 text-xs mt-1.5 flex items-center gap-1">
                  ⏳ {wallet!.reservedCredits.toLocaleString("es-MX")} retenidos en citas pendientes
                </p>
              )}
              {nextExpiry && (() => {
                const daysLeft = differenceInDays(nextExpiry, new Date());
                if (daysLeft > 10 || balance === 0) return null;
                return (
                  <p className="text-amber-300 text-xs mt-1.5 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    Créditos vencen el {format(nextExpiry, "d 'de' MMMM", { locale: es })}
                    {" "}({daysLeft <= 0 ? "hoy" : `${daysLeft}d`})
                  </p>
                );
              })()}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                className="bg-white text-[#5B6A57] hover:bg-gray-100 font-semibold text-sm h-10 px-5 border-0"
                onClick={() => handleBuySession("individual_basic")}
                disabled={buyingSession !== null}
              >
                {buyingSession === "individual_basic" ? "..." : "Recargar"}
              </Button>
              <Button
                className="bg-transparent border border-white text-white hover:bg-white/10 font-semibold text-sm h-10 px-5"
                onClick={() => {
                  document.getElementById("prepaid-input")?.scrollIntoView({ behavior: "smooth", block: "center" });
                  setTimeout(() => document.getElementById("prepaid-input")?.focus(), 350);
                }}
              >
                Canjear
              </Button>
            </div>
          </div>

          {/* ── 2. Métricas ── */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-400 mb-1">Sesiones completadas</p>
              <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: "Poppins, sans-serif" }}>
                {sessionsCompleted}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-400 mb-1">Créditos usados</p>
              <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: "Poppins, sans-serif" }}>
                {totalCreditsUsed.toLocaleString("es-MX")}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-400 mb-1">Plan activo</p>
              {activePlanBatch ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-semibold text-gray-900">
                    {activePlanBatch.source === "plan_pro" ? "Pro" : "Básico"}
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
                    Activo
                  </span>
                </div>
              ) : (
                <p className="text-sm text-gray-400 mt-0.5">Sin plan</p>
              )}
            </div>
          </div>

          {/* ── 3. Grid 2 columnas ── */}
          <div className="grid md:grid-cols-2 gap-4">

            {/* Izquierda: Planes disponibles */}
            <div className="rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-[#5B6A57]" />
                Planes disponibles
              </h2>
              <div className="divide-y divide-gray-50">
                {[
                  { type: "individual_basic",   label: "Sesión Básica",    sub: `$${PRICING.SESSION_BASIC_MXN} MXN · créditos para 1 sesión` },
                  { type: "individual_premium",  label: "Sesión Premium",   sub: "$1,500 MXN · créditos para 1 sesión" },
                  { type: "plan_basic",          label: "Plan Básico",      sub: "Suscripción mensual" },
                  { type: "plan_pro",            label: "Plan Pro",         sub: "Suscripción mensual · acceso completo" },
                ].map(({ type, label, sub }) => (
                  <div key={type} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{label}</p>
                      <p className="text-xs text-gray-400">{sub}</p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-[#5B6A57] hover:bg-[#4a5847] text-white border-0 text-xs h-8 px-3 flex-shrink-0"
                      onClick={() => handleBuySession(type)}
                      disabled={buyingSession !== null}
                    >
                      {buyingSession === type ? "..." : "Comprar"}
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-3 flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z" fill="currentColor"/></svg>
                Pago seguro con Stripe
              </p>
            </div>

            {/* Derecha: Movimientos recientes */}
            <div className="rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#5B6A57]" />
                Movimientos recientes
              </h2>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Sin movimientos aún</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {transactions.slice(0, 8).map((tx) => (
                    <div key={tx.id} className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        tx.delta > 0 ? "bg-emerald-100" : "bg-[#f5ede6]"
                      }`}>
                        {tx.delta > 0
                          ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                          : <TrendingDown className="w-3.5 h-3.5 text-[#A7774E]" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">
                          {tx.description ?? REASON_LABELS[tx.reason]}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {format(new Date(tx.createdAt), "d MMM yyyy · HH:mm", { locale: es })}
                        </p>
                      </div>
                      <span className={`text-sm font-bold flex-shrink-0 ${
                        tx.delta > 0 ? "text-emerald-600" : "text-[#A7774E]"
                      }`}>
                        {tx.delta > 0 ? "+" : ""}{tx.delta.toLocaleString("es-MX")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── 4. Códigos ── */}
          <div className="rounded-2xl bg-[#f5f0eb] p-6">
            <div className="grid md:grid-cols-2 gap-6">

              {/* Código de descuento */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#A7774E]" />
                  Código de descuento
                </h3>
                <p className="text-xs text-gray-500 mb-3">Aplica un descuento en tu próxima compra</p>
                <div className="flex gap-2">
                  <Input
                    value={discountCode}
                    onChange={(e) => { setDiscountCode(e.target.value.toUpperCase()); setDiscountResult(null); }}
                    placeholder="Ej. BIENVENIDO10"
                    className="bg-white border-[#e0d5cc] text-sm h-10"
                    maxLength={50}
                  />
                  <Button
                    className="bg-[#A7774E] hover:bg-[#8d6340] text-white border-0 h-10 px-4 text-sm flex-shrink-0"
                    disabled={!discountCode.trim() || validateDiscountMutation.isPending}
                    onClick={() => handleApplyDiscount("individual_basic")}
                  >
                    {validateDiscountMutation.isPending ? "..." : "Aplicar"}
                  </Button>
                </div>
                {discountResult !== null && (
                  <div className={`flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 mt-2 ${
                    discountResult.valid
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-red-50 text-red-600 border border-red-200"
                  }`}>
                    {discountResult.valid
                      ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                      : <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    }
                    <span>
                      {discountResult.valid
                        ? `Descuento: -$${discountResult.discountAmount} MXN`
                        : discountResult.reason
                      }
                    </span>
                    {discountResult.valid && (
                      <button
                        className="ml-auto text-muted-foreground hover:text-foreground text-base leading-none"
                        onClick={() => { setDiscountCode(""); setDiscountResult(null); }}
                      >×</button>
                    )}
                  </div>
                )}
              </div>

              {/* Tarjeta prepago */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-[#A7774E]" />
                  Tarjeta prepago
                </h3>
                <p className="text-xs text-gray-500 mb-3">Canjea tu código para acreditar créditos</p>
                <div className="flex gap-2">
                  <Input
                    id="prepaid-input"
                    value={prepaidCode}
                    onChange={(e) => handlePrepaidInput(e.target.value)}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    className="bg-white border-[#e0d5cc] font-mono tracking-widest text-sm h-10"
                    maxLength={19}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && prepaidCode.replace(/-/g, "").length === 16)
                        redeemMutation.mutate({ code: prepaidCode });
                    }}
                  />
                  <Button
                    className="bg-[#A7774E] hover:bg-[#8d6340] text-white border-0 h-10 px-4 text-sm flex-shrink-0"
                    disabled={prepaidCode.replace(/-/g, "").length < 16 || redeemMutation.isPending}
                    onClick={() => redeemMutation.mutate({ code: prepaidCode })}
                  >
                    {redeemMutation.isPending ? "..." : "Canjear"}
                  </Button>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
