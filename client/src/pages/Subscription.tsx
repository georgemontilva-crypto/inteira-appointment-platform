import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  ArrowLeft, Star, CheckCircle2, Calendar, Wallet, AlertCircle,
  Clock, Zap,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Subscription() {
  const { isAuthenticated, loading } = useAuth();

  const { data: subscription, isLoading: loadingSubscription } = trpc.user.getSubscription.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: plans, isLoading: loadingPlans } = trpc.subscriptionPlan.getAll.useQuery();
  const { data: wallet } = trpc.user.getWallet.useQuery(undefined, { enabled: isAuthenticated });

  if (loading || loadingSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-sm w-full mx-4">
          <CardContent className="p-8 text-center space-y-4">
            <Star className="w-12 h-12 text-primary mx-auto" />
            <h2 className="text-xl font-bold">Inicia sesión para gestionar tu suscripción</h2>
            <a href={getLoginUrl()}>
              <Button className="w-full gradient-brand text-white border-0">Iniciar sesión</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sub = subscription as any;
  const activePlan = plans?.find((p) => p.id === sub?.planId);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-hero text-white py-10">
        <div className="container">
          <Link href="/dashboard">
            <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 mb-4 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
            Mi suscripción
          </h1>
          <p className="text-white/70 mt-1">Gestiona tu plan y créditos</p>
        </div>
      </div>

      <div className="container py-8 max-w-4xl">
        {/* Current subscription status */}
        {sub ? (
          <Card className="border-border mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Star className="w-5 h-5 text-accent" />
                  Plan activo
                </CardTitle>
                <Badge className={`border-0 ${sub.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                  {sub.status === "active" ? "Activo" : sub.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{sub.planName ?? activePlan?.name ?? `Plan #${sub.planId}`}</h2>
                  <p className="text-muted-foreground text-sm">
                    ${Number(activePlan?.price ?? 0).toLocaleString("es-MX")} MXN / mes
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-muted/40 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Saldo disponible</span>
                  </div>
                  <p className="text-lg font-bold text-primary">
                    {(wallet?.balance ?? 0).toLocaleString("es-MX")} cr.
                  </p>
                </div>

                <div className="bg-muted/40 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Inicio</span>
                  </div>
                  <p className="text-sm font-semibold">
                    {sub.startDate
                      ? format(new Date(sub.startDate), "d MMM yyyy", { locale: es })
                      : "—"}
                  </p>
                </div>

                <div className="bg-muted/40 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Próx. renovación</span>
                  </div>
                  <p className="text-sm font-semibold">
                    {sub.endDate
                      ? format(new Date(sub.endDate), "d MMM yyyy", { locale: es })
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Credit expiry warning */}
              {wallet?.nextExpiry && (
                (() => {
                  const daysLeft = Math.ceil(
                    (new Date(wallet.nextExpiry!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  );
                  if (daysLeft > 15) return null;
                  return (
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-700">Créditos por vencer</p>
                        <p className="text-xs text-amber-600">
                          Tienes créditos que vencen en {daysLeft} día{daysLeft !== 1 ? "s" : ""}.
                          Úsalos antes del {format(new Date(wallet.nextExpiry!), "d 'de' MMMM", { locale: es })}.
                        </p>
                      </div>
                    </div>
                  );
                })()
              )}

              <div className="pt-2 flex gap-3">
                <Link href="/wallet">
                  <Button variant="outline" className="border-primary/30 text-primary gap-2">
                    <Wallet className="w-4 h-4" />
                    Ver wallet
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="border-red-200 text-red-500 hover:bg-red-50"
                  onClick={() => {
                    // Placeholder — se activará con Stripe
                    import("sonner").then(({ toast }) => toast.info("La cancelación estará disponible cuando se active Stripe."));
                  }}
                >
                  Cancelar suscripción
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border mb-8">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Star className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold">No tienes un plan activo</h3>
              <p className="text-muted-foreground text-sm">
                Elige un plan para acceder a consultas con especialistas y acumular créditos.
              </p>
              <Link href="/planes">
                <Button className="gradient-brand text-white border-0">Ver planes disponibles</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Available plans */}
        <div>
          <h2 className="text-lg font-bold mb-4" style={{ fontFamily: "Poppins, sans-serif" }}>
            {sub ? "Cambiar de plan" : "Planes disponibles"}
          </h2>
          {loadingPlans ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse border-border h-40" />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {(plans ?? []).map((plan) => {
                const isActive = sub?.planId === plan.id;
                return (
                  <Card
                    key={plan.id}
                    className={`border-2 transition-all ${
                      isActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                    }`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-base">{plan.name}</h3>
                          <p className="text-2xl font-bold text-primary mt-1">
                            ${Number(plan.price).toLocaleString("es-MX")}
                            <span className="text-sm font-normal text-muted-foreground"> MXN/mes</span>
                          </p>
                        </div>
                        {isActive && (
                          <Badge className="bg-primary/10 text-primary border-0">Plan actual</Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>

                      <div className="space-y-1.5 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                          <span>{Number(plan.price).toLocaleString("es-MX")} créditos / mes</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                          <span>Créditos válidos 60 días</span>
                        </div>
                        {plan.maxAppointmentsPerMonth && (
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                            <span>Hasta {plan.maxAppointmentsPerMonth} citas/mes</span>
                          </div>
                        )}
                      </div>

                      <Button
                        className={`w-full ${isActive ? "bg-muted text-muted-foreground cursor-default" : "gradient-brand text-white border-0"}`}
                        disabled={isActive}
                        onClick={() => {
                          if (!isActive) {
                            import("sonner").then(({ toast }) =>
                              toast.info("Los pagos estarán disponibles cuando se active Stripe.")
                            );
                          }
                        }}
                      >
                        {isActive ? "Plan actual" : "Seleccionar plan"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
