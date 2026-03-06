import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  Wallet,
  ArrowLeft,
  Clock,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ShoppingCart,
  Info,
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

export default function WalletPage() {
  const { isAuthenticated, loading } = useAuth();
  const { data: wallet, isLoading, refetch } = trpc.user.getWallet.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const buySession = trpc.user.buyIndividualSession.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
    },
    onError: () => toast.error("Error al procesar la compra. Intenta de nuevo."),
  });

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
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
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      {/* ── Header ── */}
      <div className="gradient-hero text-white">
        <div className="container py-7 md:py-10">
          <Link href="/dashboard">
            <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 mb-3 -ml-2 active:scale-95 transition-transform">
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="text-sm">Dashboard</span>
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-1">
            <Wallet className="w-6 h-6 text-white/80" />
            <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
              Mi Wallet
            </h1>
          </div>
          <p className="text-white/70 text-sm">Créditos Inteira · 1 crédito = $1 MXN</p>
        </div>
      </div>

      <div className="container py-5 md:py-8 space-y-5 md:space-y-8">

        {/* ── Balance card ── */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="md:col-span-2 border-2 border-primary/20 shadow-lg shadow-primary/10">
            <CardContent className="p-5 md:p-7">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Saldo disponible</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl md:text-5xl font-bold text-primary" style={{ fontFamily: "Poppins, sans-serif" }}>
                      {balance.toLocaleString("es-MX")}
                    </span>
                    <span className="text-lg text-muted-foreground font-medium">créditos</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Equivale a <strong className="text-foreground">${balance.toLocaleString("es-MX")} MXN</strong>
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center shadow-md">
                  <Wallet className="w-7 h-7 text-white" />
                </div>
              </div>

              {nextExpiry && (
                <div className="mt-4 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    Próximo vencimiento: <strong>{format(nextExpiry, "d 'de' MMMM yyyy", { locale: es })}</strong>
                    {" "}({differenceInDays(nextExpiry, new Date())} días restantes)
                  </span>
                </div>
              )}

              {/* Sesión cost reference */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Sesión Básica: <strong className="text-foreground">350 créditos</strong>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  Sesión Premium: <strong className="text-foreground">1,250 créditos</strong>
                </div>
              </div>
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
              <Button
                onClick={() => buySession.mutate({ sessionType: "individual_basic" })}
                disabled={buySession.isPending}
                variant="outline"
                className="w-full justify-between border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs active:scale-95 transition-transform"
                size="sm"
              >
                <span>Sesión Básica</span>
                <span className="font-bold">$350 MXN</span>
              </Button>
              <Button
                onClick={() => buySession.mutate({ sessionType: "individual_premium" })}
                disabled={buySession.isPending}
                variant="outline"
                className="w-full justify-between border-primary/30 text-primary hover:bg-primary/5 text-xs active:scale-95 transition-transform"
                size="sm"
              >
                <span>Sesión Premium</span>
                <span className="font-bold">$1,250 MXN</span>
              </Button>
              <Link href="/planes">
                <Button className="w-full gradient-brand text-white border-0 text-xs active:scale-95 transition-transform" size="sm">
                  Ver planes mensuales
                </Button>
              </Link>
              <p className="text-[10px] text-muted-foreground text-center pt-1">
                Pago con Stripe disponible próximamente
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
    </div>
  );
}
