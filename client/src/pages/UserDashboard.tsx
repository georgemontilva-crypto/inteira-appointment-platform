import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  Calendar,
  Video,
  Star,
  Clock,
  ChevronRight,
  Plus,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  User,
  LogOut,
  Wallet,
  X,
  ThumbsUp,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getLoginUrl } from "@/const";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  canceled: "bg-red-100 text-red-700",
  "no-show": "bg-gray-100 text-gray-600",
};

const statusLabels: Record<string, string> = {
  scheduled: "Programada",
  completed: "Completada",
  canceled: "Cancelada",
  "no-show": "No asistió",
};

export default function UserDashboard() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const utils = trpc.useUtils();

  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [ratingId, setRatingId] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState("");

  const { data: appointments, isLoading: loadingAppointments } = trpc.user.getAppointments.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: subscription, isLoading: loadingSubscription } = trpc.user.getSubscription.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: wallet } = trpc.user.getWallet.useQuery(undefined, { enabled: isAuthenticated });

  // Cancel appointment mutation
  const cancelMutation = trpc.appointment.cancelAppointment.useMutation({
    onSuccess: () => {
      toast.success("Cita cancelada", { description: "Tus créditos han sido reembolsados." });
      setCancelingId(null);
      utils.user.getAppointments.invalidate();
      utils.user.getWallet.invalidate();
    },
    onError: (err) => {
      toast.error("Error al cancelar", { description: err.message });
      setCancelingId(null);
    },
  });

  // Submit review mutation
  const reviewMutation = trpc.review.create.useMutation({
    onSuccess: () => {
      toast.success("¡Gracias por tu reseña!", { description: "Tu calificación fue enviada." });
      setRatingId(null);
      setRating(5);
      setRatingComment("");
      utils.user.getAppointments.invalidate();
    },
    onError: (err) => {
      toast.error("Error al enviar reseña", { description: err.message });
    },
  });

  if (loading) {
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
          <h2 className="text-2xl font-bold">Inicia sesión para continuar</h2>
          <a href={getLoginUrl()}>
            <Button className="gradient-brand text-white border-0">Iniciar sesión</Button>
          </a>
        </div>
      </div>
    );
  }

  type Apt = NonNullable<typeof appointments>[number];
  const upcomingAppointments: Apt[] = appointments?.filter((a) => a.status === "scheduled") ?? [];
  const pastAppointments: Apt[] = appointments?.filter((a) => a.status !== "scheduled") ?? [];
  const completedCount = (appointments as Apt[] | undefined)?.filter((a) => a.status === "completed").length ?? 0;

  const handleCancel = (aptId: number) => {
    setCancelingId(aptId);
    cancelMutation.mutate({ appointmentId: aptId, reason: "Cancelado por el usuario" });
  };

  const handleSubmitReview = (apt: Apt) => {
    reviewMutation.mutate({
      professionalId: apt.professionalId,
      appointmentId: apt.id,
      rating,
      comment: ratingComment,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">

      {/* ── Mobile Header ── */}
      <div className="md:hidden gradient-hero text-white">
        <div className="px-5 pt-14 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-bold">
                {user?.name?.charAt(0) ?? "U"}
              </div>
              <div>
                <p className="text-white/70 text-xs">Bienvenido</p>
                <h1 className="text-lg font-bold leading-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
                  {user?.name?.split(" ")[0] ?? "Usuario"}
                </h1>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
        {/* Stats strip */}
        <div className="mx-4 mb-0 relative z-10">
          <div className="bg-white rounded-2xl shadow-xl border border-border/50 grid grid-cols-3 divide-x divide-border -mb-5">
            <div className="flex flex-col items-center py-3.5">
              <span className="text-xl font-bold text-primary">{upcomingAppointments.length}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">Próximas</span>
            </div>
            <div className="flex flex-col items-center py-3.5">
              <span className="text-xl font-bold text-emerald-600">{completedCount}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">Completadas</span>
            </div>
            <div className="flex flex-col items-center py-3.5">
              <span className="text-xl font-bold text-primary">{(wallet?.balance ?? 0).toLocaleString("es-MX")}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">Créditos</span>
            </div>
          </div>
        </div>
        <div className="h-5" />
      </div>

      {/* ── Desktop Header ── */}
      <div className="hidden md:block gradient-hero text-white py-8">
        <div className="container">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">
                {user?.name?.charAt(0) ?? "U"}
              </div>
              <div>
                <p className="text-white/70 text-sm">Bienvenido de vuelta</p>
                <h1 className="text-2xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
                  {user?.name ?? "Usuario"}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/especialidades">
                <Button className="bg-white text-primary hover:bg-white/90 font-semibold">
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva cita
                </Button>
              </Link>
              <Button variant="ghost" onClick={logout} className="text-white/80 hover:text-white hover:bg-white/10">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile Quick Actions ── */}
      <div className="md:hidden px-5 pt-8 pb-2">
        <div className="grid grid-cols-3 gap-2">
          <Link href="/especialidades">
            <div className="flex flex-col items-center gap-1.5 p-3 bg-primary/8 rounded-2xl active:scale-95 transition-transform border border-primary/15">
              <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] font-semibold text-primary text-center leading-tight">Nueva cita</span>
            </div>
          </Link>
          <Link href="/wallet">
            <div className="flex flex-col items-center gap-1.5 p-3 bg-muted rounded-2xl active:scale-95 transition-transform">
              <div className="w-9 h-9 rounded-xl bg-secondary/50 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-primary" />
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground text-center leading-tight">Mi wallet</span>
            </div>
          </Link>
          <Link href="/planes">
            <div className="flex flex-col items-center gap-1.5 p-3 bg-muted rounded-2xl active:scale-95 transition-transform">
              <div className="w-9 h-9 rounded-xl bg-secondary/50 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-primary" />
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground text-center leading-tight">Mis planes</span>
            </div>
          </Link>
        </div>
      </div>

      {/* ── Banner: créditos por vencer ── */}
      {wallet && wallet.nextExpiry && (() => {
        const daysLeft = Math.ceil((new Date(wallet.nextExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysLeft > 10 || wallet.balance === 0) return null;
        return (
          <div className="container pt-4 md:pt-6">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5 text-amber-800">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">
                  {daysLeft <= 0
                    ? "Tienes créditos que vencen hoy"
                    : `Tienes créditos que vencen en ${daysLeft} día${daysLeft === 1 ? "" : "s"}`}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Úsalos antes del {new Date(wallet.nextExpiry).toLocaleDateString("es-MX", { day: "numeric", month: "long" })} para no perderlos.
                </p>
              </div>
              <Link href="/especialidades">
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white border-0 text-xs h-8 px-3 flex-shrink-0">
                  Agendar ahora
                </Button>
              </Link>
            </div>
          </div>
        );
      })()}

      {/* ── Main content ── */}
      <div className="container py-4 md:py-8 space-y-4 md:space-y-8">

        {/* Desktop stats */}
        <div className="hidden md:grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{upcomingAppointments.length}</p>
                  <p className="text-xs text-muted-foreground">Próximas citas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{completedCount}</p>
                  <p className="text-xs text-muted-foreground">Completadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{(wallet?.balance ?? 0).toLocaleString("es-MX")}</p>
                  <p className="text-xs text-muted-foreground">Créditos disponibles</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Star className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{subscription?.appointmentsUsedThisMonth ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Citas este mes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
          {/* Appointments column */}
          <div className="lg:col-span-2 space-y-3 md:space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base md:text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
                Próximas citas
              </h2>
              <Button variant="ghost" size="sm" className="text-primary text-xs md:text-sm">
                Ver todas <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>

            {loadingAppointments ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Card key={i} className="border-border animate-pulse">
                    <CardContent className="p-4 h-16" />
                  </Card>
                ))}
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <Card className="border-border border-dashed">
                <CardContent className="p-6 md:p-8 text-center">
                  <Calendar className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium text-sm md:text-base">No tienes citas próximas</p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">Agenda tu primera consulta con un especialista</p>
                  <Link href="/especialidades">
                    <Button className="mt-4 gradient-brand text-white border-0" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Agendar cita
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {upcomingAppointments.slice(0, 5).map((apt) => (
                  <Card key={apt.id} className="border-border active:scale-[0.99] md:hover:shadow-md transition-all">
                    <CardContent className="p-4 md:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl gradient-brand flex items-center justify-center text-white font-bold flex-shrink-0">
                            P
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{(apt as any).professionalName ?? `Especialista #${apt.professionalId}`}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(apt.appointmentDate), "d MMM 'a las' HH:mm", { locale: es })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <Badge className={statusColors[apt.status] + " border-0 text-[10px] md:text-xs"}>
                            {statusLabels[apt.status]}
                          </Badge>
                          <div className="flex gap-1.5">
                            {apt.videoCallLink && (
                              <a href={apt.videoCallLink} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" className="gradient-brand text-white border-0 h-6 md:h-7 text-[10px] md:text-xs px-2 md:px-3">
                                  <Video className="w-3 h-3 mr-1" />
                                  Unirse
                                </Button>
                              </a>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 md:h-7 text-[10px] md:text-xs px-2 border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300"
                              disabled={cancelingId === apt.id}
                              onClick={() => handleCancel(apt.id)}
                            >
                              {cancelingId === apt.id ? (
                                <span className="animate-spin w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full" />
                              ) : (
                                <>
                                  <X className="w-3 h-3 mr-1" />
                                  Cancelar
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Past appointments */}
            {pastAppointments.length > 0 && (
              <>
                <h2 className="text-base md:text-xl font-bold pt-2 md:pt-4" style={{ fontFamily: "Poppins, sans-serif" }}>
                  Historial
                </h2>
                <div className="space-y-2 md:space-y-3">
                  {pastAppointments.slice(0, 5).map((apt) => (
                    <Card key={apt.id} className="border-border opacity-90">
                      <CardContent className="p-3.5 md:p-4">
                        {/* Rating form inline */}
                        {ratingId === apt.id ? (
                          <div className="space-y-3">
                            <p className="text-sm font-semibold">Califica tu sesión</p>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <button key={s} onClick={() => setRating(s)} className="focus:outline-none">
                                  <Star
                                    className={`w-6 h-6 transition-colors ${s <= rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`}
                                  />
                                </button>
                              ))}
                            </div>
                            <textarea
                              value={ratingComment}
                              onChange={(e) => setRatingComment(e.target.value)}
                              placeholder="Comentario opcional..."
                              rows={2}
                              className="w-full text-sm border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="gradient-brand text-white border-0 text-xs"
                                disabled={reviewMutation.isPending}
                                onClick={() => handleSubmitReview(apt)}
                              >
                                <ThumbsUp className="w-3 h-3 mr-1" />
                                Enviar
                              </Button>
                              <Button size="sm" variant="ghost" className="text-xs" onClick={() => setRatingId(null)}>
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground font-bold text-sm flex-shrink-0">
                                P
                              </div>
                              <div>
                                <p className="font-medium text-sm">{(apt as any).professionalName ?? `Especialista #${apt.professionalId}`}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(apt.appointmentDate), "d MMM yyyy", { locale: es })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Badge className={statusColors[apt.status] + " border-0 text-[10px] md:text-xs"}>
                                {statusLabels[apt.status]}
                              </Badge>
                              {apt.status === "completed" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-[10px] px-2 border-yellow-200 text-yellow-600 hover:bg-yellow-50"
                                  onClick={() => setRatingId(apt.id)}
                                >
                                  <Star className="w-3 h-3 mr-1" />
                                  Calificar
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-3 md:space-y-4">
            {/* Subscription card */}
            <Card className="border-border">
              <CardHeader className="pb-2 md:pb-3">
                <CardTitle className="text-sm md:text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  Mi suscripción
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4">
                {loadingSubscription ? (
                  <div className="animate-pulse h-16 bg-muted rounded-lg" />
                ) : subscription ? (
                  <>
                    <div className="p-4 rounded-xl gradient-brand text-white">
                      <p className="text-white/70 text-xs mb-1">Plan activo</p>
                      <p className="text-lg md:text-xl font-bold">
                        {(subscription as any).planName ?? `Plan #${subscription.planId}`}
                      </p>
                      <p className="text-white/70 text-xs mt-1">
                        Vence: {subscription.endDate
                          ? format(new Date(subscription.endDate), "d MMM yyyy", { locale: es })
                          : "Sin vencimiento"}
                      </p>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground text-xs">Citas usadas este mes</span>
                      <span className="font-medium text-xs">{subscription.appointmentsUsedThisMonth ?? 0}</span>
                    </div>
                    <Link href="/suscripcion">
                      <Button variant="outline" size="sm" className="w-full border-primary/30 text-primary hover:bg-primary/5 text-xs active:scale-95 transition-transform">
                        Gestionar plan
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="p-4 rounded-xl bg-muted text-center">
                      <AlertCircle className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium">Sin plan activo</p>
                      <p className="text-xs text-muted-foreground mt-1">Elige un plan para agendar citas</p>
                    </div>
                    <Link href="/planes">
                      <Button className="w-full gradient-brand text-white border-0 text-sm active:scale-95 transition-transform" size="sm">
                        Ver planes disponibles
                      </Button>
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Wallet widget */}
            <Card className="border-border">
              <CardHeader className="pb-2 md:pb-3">
                <CardTitle className="text-sm md:text-base flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-primary" />
                  Mi Wallet
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/15">
                  <p className="text-xs text-muted-foreground">Saldo disponible</p>
                  <p className="text-2xl font-bold text-primary" style={{ fontFamily: "Poppins, sans-serif" }}>
                    {(wallet?.balance ?? 0).toLocaleString("es-MX")}
                    <span className="text-sm font-normal text-muted-foreground ml-1">créditos</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ≈ ${(wallet?.balance ?? 0).toLocaleString("es-MX")} MXN
                  </p>
                  {wallet?.nextExpiry && (
                    <p className="text-[10px] text-amber-600 mt-1 font-medium">
                      ⚠ Créditos por vencer: {format(new Date(wallet.nextExpiry), "d MMM yyyy", { locale: es })}
                    </p>
                  )}
                </div>
                <Link href="/wallet">
                  <Button variant="outline" size="sm" className="w-full border-primary/30 text-primary hover:bg-primary/5 text-xs active:scale-95 transition-transform">
                    Ver historial de créditos
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Quick actions — desktop only */}
            <Card className="border-border hidden md:block">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Acciones rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/especialidades">
                  <Button variant="ghost" className="w-full justify-start text-sm h-9 hover:bg-primary/5 hover:text-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Agendar nueva cita
                  </Button>
                </Link>
                <Link href="/wallet">
                  <Button variant="ghost" className="w-full justify-start text-sm h-9 hover:bg-primary/5 hover:text-primary">
                    <Wallet className="w-4 h-4 mr-2" />
                    Ver mi wallet
                  </Button>
                </Link>
                <Link href="/perfil">
                  <Button variant="ghost" className="w-full justify-start text-sm h-9 hover:bg-primary/5 hover:text-primary">
                    <User className="w-4 h-4 mr-2" />
                    Editar perfil
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
