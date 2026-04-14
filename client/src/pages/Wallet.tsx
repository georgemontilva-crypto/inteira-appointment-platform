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

  return (
    <DashboardLayout>
      <div className="container py-5 md:py-8 space-y-5 md:space-y-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>Mi Wallet</h1>
          <p className="text-sm text-muted-foreground mt-1">Créditos Inteira · 1 crédito = $1 MXN</p>
        </div>

        {/* ── Balance card ── */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="md:col-span-2 border-2 border-primary/20 shadow-lg shadow-primary/10">
            <CardContent className="p-5 md:p-7">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                    {checkingPayment ? "Verificando pago..." : "Saldo disponible"}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl md:text-5xl font-bold text-primary" style={{ fontFamily: "Poppins, sans-serif" }}>
                      {balance.toLocaleString("es-MX")}
                    </span>
                    <span className="text-lg text-muted-foreground font-medium">créditos</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Equivale a <strong className="text-foreground">${balance.toLocaleString("es-MX")} MXN</strong>
                  </p>
                  {(wallet?.reservedCredits ?? 0) > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "13px", color: "#b07800" }}>
                      <span>⏳</span>
                      <span>{wallet!.reservedCredits.toLocaleString("es-MX")} créditos retenidos en citas pendientes</span>
                    </div>
                  )}
                </div>
                <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center shadow-md">
                  <Wallet className="w-7 h-7 text-white" />
                </div>
              </div>

              {nextExpiry && (() => {
                const daysLeft = differenceInDays(nextExpiry, new Date());
                const isUrgent = daysLeft <= 10 && balance > 0;
                return (
                  <div className={`mt-4 flex items-center gap-2 text-xs rounded-xl px-3 py-2.5 ${
                    isUrgent
                      ? "bg-amber-50 border border-amber-200 text-amber-700"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {isUrgent
                      ? <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
                      : <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    }
                    <span className="flex-1">
                      {isUrgent ? (
                        <><strong>¡Atención!</strong> Créditos que vencen el{" "}
                        <strong>{format(nextExpiry, "d 'de' MMMM", { locale: es })}</strong>
                        {" "}({daysLeft <= 0 ? "hoy" : `${daysLeft} día${daysLeft === 1 ? "" : "s"}`}). Úsalos antes de que expiren.</>
                      ) : (
                        <>Próximo vencimiento: <strong>{format(nextExpiry, "d 'de' MMMM yyyy", { locale: es })}</strong>{" "}({daysLeft} días restantes)</>
                      )}
                    </span>
                    {isUrgent && (
                      <Link href="/especialidades">
                        <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white border-0 text-xs h-7 px-2.5 flex-shrink-0">
                          Agendar
                        </Button>
                      </Link>
                    )}
                  </div>
                );
              })()}


            </CardContent>
          </Card>

          {/* Quick buy */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary" />
                Compra rápida
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* ── Discount code input ── */}
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <Tag className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={discountCode}
                    onChange={(e) => {
                      setDiscountCode(e.target.value.toUpperCase());
                      setDiscountResult(null);
                    }}
                    placeholder="Código descuento"
                    className="pl-8 h-8 text-xs"
                    maxLength={50}
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-xs"
                  disabled={!discountCode.trim() || validateDiscountMutation.isPending}
                  onClick={() => handleApplyDiscount("individual_basic")}
                >
                  {validateDiscountMutation.isPending ? "..." : "Aplicar"}
                </Button>
              </div>

              {/* ── Discount result feedback ── */}
              {discountResult !== null && (
                <div className={`flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 ${
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-auto text-muted-foreground hover:text-foreground"
                      onClick={() => { setDiscountCode(""); setDiscountResult(null); }}
                    >×</Button>
                  )}
                </div>
              )}

              {/* ── Buy buttons ── */}
              <Button
                onClick={() => handleBuySession("individual_basic")}
                disabled={buyingSession !== null}
                variant="outline"
                className="w-full justify-between border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs active:scale-95 transition-transform"
                size="sm"
              >
                <span>{buyingSession === "individual_basic" ? "Redirigiendo..." : "Sesión Básica"}</span>
                <span className="font-bold flex items-center gap-1">
                  {discountResult?.valid && (
                    <span className="line-through text-muted-foreground font-normal">${PRICING.SESSION_BASIC_MXN}</span>
                  )}
                  ${discountResult?.valid
                    ? Math.max(PRICING.SESSION_BASIC_MXN - discountResult.discountAmount, 0)
                    : PRICING.SESSION_BASIC_MXN
                  } MXN
                </span>
              </Button>
              <Button
                onClick={() => handleBuySession("individual_premium")}
                disabled={buyingSession !== null}
                variant="outline"
                className="w-full justify-between border-primary/30 text-primary hover:bg-primary/5 text-xs active:scale-95 transition-transform"
                size="sm"
              >
                <span>{buyingSession === "individual_premium" ? "Redirigiendo..." : "Sesión Premium"}</span>
                <span className="font-bold flex items-center gap-1">
                  {discountResult?.valid && (
                    <span className="line-through text-muted-foreground font-normal">$1,500</span>
                  )}
                  ${discountResult?.valid
                    ? Math.max(1500 - discountResult.discountAmount, 0).toLocaleString("es-MX")
                    : "1,500"
                  } MXN
                </span>
              </Button>
              <Link href="/planes">
                <Button className="w-full gradient-brand text-white border-0 text-xs active:scale-95 transition-transform" size="sm">
                  Ver planes mensuales
                </Button>
              </Link>
              <p className="text-[10px] text-muted-foreground text-center pt-1 flex items-center justify-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z" fill="currentColor"/></svg>
                Pago seguro con Stripe
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Policy info ── */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p><strong>Política de créditos Inteira (60 días):</strong></p>
            <p>Cada compra crea un lote de créditos con vigencia de 60 días. El sistema consume primero los créditos más antiguos (FIFO). Si cancelas tu suscripción, los créditos del plan expiran de inmediato. Los créditos de sesiones individuales no están sujetos a la suscripción.</p>
          </div>
        </div>

        {/* ── Active batches ── */}
        <div>
          <h2 className="text-base md:text-lg font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>
            Lotes activos ({activeBatches.length})
          </h2>
          {activeBatches.length === 0 ? (
            <Card className="border-dashed border-border">
              <CardContent className="p-6 text-center">
                <AlertCircle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No tienes créditos activos.</p>
                <p className="text-xs text-muted-foreground mt-1">Compra un plan o una sesión individual para comenzar.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {activeBatches.map((batch) => {
                const pct = Math.round((batch.remaining / batch.amount) * 100);
                return (
                  <Card key={batch.id} className="border-border active:scale-[0.99] transition-transform">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={`${SOURCE_COLORS[batch.source] ?? "bg-muted text-muted-foreground"} border-0 text-[10px]`}>
                            {SOURCE_LABELS[batch.source] ?? batch.source}
                          </Badge>
                          <BatchStatusBadge batch={batch} />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Vence {format(new Date(batch.expiresAt), "d MMM yyyy", { locale: es })}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full gradient-brand rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-primary whitespace-nowrap">
                          {batch.remaining.toLocaleString("es-MX")} / {batch.amount.toLocaleString("es-MX")}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Comprado el {format(new Date(batch.createdAt), "d 'de' MMMM yyyy", { locale: es })}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* ── All batches history ── */}
        {batches.length > activeBatches.length && (
          <div>
            <h2 className="text-base md:text-lg font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>
              Historial de lotes
            </h2>
            <div className="space-y-2">
              {batches
                .filter((b) => b.remaining === 0 || b.expiredEarly || new Date(b.expiresAt) <= new Date())
                .map((batch) => (
                  <Card key={batch.id} className="border-border opacity-70">
                    <CardContent className="p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Badge className={`${SOURCE_COLORS[batch.source] ?? "bg-muted text-muted-foreground"} border-0 text-[10px] opacity-70`}>
                            {SOURCE_LABELS[batch.source] ?? batch.source}
                          </Badge>
                          <BatchStatusBadge batch={batch} />
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium">{batch.amount.toLocaleString("es-MX")} créditos</p>
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(batch.createdAt), "d MMM yyyy", { locale: es })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* ── Transactions ── */}
        {transactions.length > 0 && (
          <div>
            <h2 className="text-base md:text-lg font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>
              Movimientos recientes
            </h2>
            <div className="space-y-1.5">
              {transactions.slice(0, 20).map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${tx.delta > 0 ? "bg-emerald-100" : "bg-red-100"}`}>
                    {tx.delta > 0
                      ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      : <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{tx.description ?? REASON_LABELS[tx.reason]}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(tx.createdAt), "d MMM yyyy HH:mm", { locale: es })}
                    </p>
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 ${tx.delta > 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {tx.delta > 0 ? "+" : ""}{tx.delta.toLocaleString("es-MX")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
