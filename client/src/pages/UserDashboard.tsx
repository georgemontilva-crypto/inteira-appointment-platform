import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Calendar,
  Video,
  Star,
  Clock,
  ChevronRight,
  Plus,
  X,
  ThumbsUp,
  Sparkles,
  Brain,
  Scale,
  TrendingUp,
  DollarSign,
  Mic2,
  Compass,
  Heart,
  Leaf,
  Apple,
  GraduationCap,
  HeartHandshake,
  HandHeart,
  Sun,
  Smile,
  BookOpen,
  Briefcase,
  Globe,
  Activity,
  Users,
  Bell,
  Wallet,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  User,
} from "lucide-react";
import { format, isToday, isTomorrow, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { getLoginUrl } from "@/const";
import DashboardLayout from "../components/DashboardLayout";
import { Link } from "wouter";

// ── Specialty icons & colors ───────────────────────────────────────────────
const specialtyIcon: Record<string, React.ReactNode> = {
  "Psicología": <Brain className="w-5 h-5 text-white" />,
  "Legal": <Scale className="w-5 h-5 text-white" />,
  "Emprendimiento": <TrendingUp className="w-5 h-5 text-white" />,
  "Finanzas": <DollarSign className="w-5 h-5 text-white" />,
  "Idiomas": <Mic2 className="w-5 h-5 text-white" />,
  "Imagen Personal": <Sparkles className="w-5 h-5 text-white" />,
  "Vocación": <Compass className="w-5 h-5 text-white" />,
  "Coaching de vida": <Sun className="w-5 h-5 text-white" />,
  "Mindfulness y meditación": <Leaf className="w-5 h-5 text-white" />,
  "Nutrición": <Apple className="w-5 h-5 text-white" />,
  "Orientación vocacional": <GraduationCap className="w-5 h-5 text-white" />,
  "Terapia de pareja": <HeartHandshake className="w-5 h-5 text-white" />,
  "Trabajo social": <HandHeart className="w-5 h-5 text-white" />,
  "Salud mental": <Brain className="w-5 h-5 text-white" />,
  "Desarrollo personal": <Smile className="w-5 h-5 text-white" />,
  "Educación": <BookOpen className="w-5 h-5 text-white" />,
  "Negocios": <Briefcase className="w-5 h-5 text-white" />,
  "Idiomas y cultura": <Globe className="w-5 h-5 text-white" />,
  "Bienestar": <Activity className="w-5 h-5 text-white" />,
  "Familia": <Heart className="w-5 h-5 text-white" />,
  "Recursos Humanos": <Users className="w-5 h-5 text-white" />,
};

const specialtyBg: Record<string, string> = {
  "Psicología": "bg-[#607562]",
  "Legal": "bg-[#4a5c4c]",
  "Emprendimiento": "bg-[#607562]",
  "Finanzas": "bg-[#4f6651]",
  "Idiomas": "bg-[#556e57]",
  "Imagen Personal": "bg-[#607562]",
  "Vocación": "bg-[#4a5c4c]",
  "Coaching de vida": "bg-[#607562]",
  "Mindfulness y meditación": "bg-[#4f6651]",
  "Nutrición": "bg-[#556e57]",
  "Orientación vocacional": "bg-[#4a5c4c]",
  "Terapia de pareja": "bg-[#607562]",
  "Trabajo social": "bg-[#4f6651]",
  "Salud mental": "bg-[#607562]",
  "Desarrollo personal": "bg-[#556e57]",
  "Educación": "bg-[#4a5c4c]",
  "Negocios": "bg-[#607562]",
  "Idiomas y cultura": "bg-[#4f6651]",
  "Bienestar": "bg-[#556e57]",
  "Familia": "bg-[#607562]",
  "Recursos Humanos": "bg-[#4a5c4c]",
};

// ── Status helpers ─────────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  canceled: "bg-red-100 text-red-700",
  "no-show": "bg-gray-100 text-gray-500",
};
const statusLabels: Record<string, string> = {
  scheduled: "Confirmada",
  completed: "Completada",
  canceled: "Cancelada",
  "no-show": "No asistió",
};

// ── Date label helper ──────────────────────────────────────────────────────
function getDateLabel(date: Date): string {
  if (isToday(date)) return "Hoy";
  if (isTomorrow(date)) return "Mañana";
  return format(date, "EEEE d MMM", { locale: es });
}

// ── Star rating component ──────────────────────────────────────────────────
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
        >
          <Star
            className={`w-7 h-7 transition-colors ${
              s <= (hovered || value)
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function UserDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // ── Local state ────────────────────────────────────────────────────────
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [ratingId, setRatingId] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [showAllHistory, setShowAllHistory] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────
  const { data: appointments, isLoading: loadingAppointments } =
    trpc.user.getAppointments.useQuery(undefined, { enabled: isAuthenticated });

  const { data: subscription } = trpc.user.getSubscription.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: walletData } = trpc.user.getWallet.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: specialties } = trpc.specialty.getAll.useQuery(undefined, {
    staleTime: 300_000,
  });

  const { data: featuredProfessionals } = trpc.professional.getFeatured.useQuery(
    { limit: 6 },
    { staleTime: 300_000 }
  );

  const { data: notifications } = trpc.notifications.getAll.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  });

  // ── Mutations ──────────────────────────────────────────────────────────
  const cancelMutation = trpc.appointment.cancelAppointment.useMutation({
    onSuccess: () => {
      toast.success("Cita cancelada", {
        description: "Tus créditos han sido reembolsados automáticamente.",
      });
      setCancelingId(null);
      utils.user.getAppointments.invalidate();
      utils.user.getWallet.invalidate();
    },
    onError: (err) => {
      toast.error("Error al cancelar", { description: err.message });
      setCancelingId(null);
    },
  });

  const reviewMutation = trpc.review.create.useMutation({
    onSuccess: () => {
      toast.success("¡Gracias por tu reseña!", {
        description: "Tu calificación ayuda a otros usuarios a elegir mejor.",
      });
      setRatingId(null);
      setRating(5);
      setRatingComment("");
      utils.user.getAppointments.invalidate();
    },
    onError: (err) => {
      toast.error("Error al enviar reseña", { description: err.message });
    },
  });

  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.getAll.invalidate();
      toast.success("Notificaciones marcadas como leídas");
    },
  });

  // ── Loading / Auth guards ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-sm w-full mx-4">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full gradient-brand flex items-center justify-center mx-auto">
              <User className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold">Inicia sesión para continuar</h2>
            <p className="text-sm text-muted-foreground">
              Accede a tu dashboard, citas y más.
            </p>
            <a href={getLoginUrl()}>
              <Button className="w-full gradient-brand text-white border-0">
                Iniciar sesión
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Derived data ───────────────────────────────────────────────────────
  type Apt = NonNullable<typeof appointments>[number];
  const upcomingAppointments: Apt[] =
    appointments?.filter((a) => a.status === "scheduled") ?? [];
  const pastAppointments: Apt[] =
    appointments?.filter((a) => a.status !== "scheduled") ?? [];
  const completedCount =
    appointments?.filter((a) => a.status === "completed").length ?? 0;
  const nextAppointment = upcomingAppointments[0] ?? null;
  const unreadNotifications = notifications?.filter((n: any) => !n.isRead) ?? [];
  const visibleHistory = showAllHistory
    ? pastAppointments
    : pastAppointments.slice(0, 3);

  const creditBalance = walletData?.balance ?? 0;
  const nextExpiry = walletData?.nextExpiry
    ? new Date(walletData.nextExpiry)
    : null;
  const creditsExpiringSoon =
    nextExpiry &&
    nextExpiry.getTime() - Date.now() < 10 * 24 * 60 * 60 * 1000 &&
    creditBalance > 0;

  const handleCancel = (aptId: number) => {
    setCancelingId(aptId);
    cancelMutation.mutate({
      appointmentId: aptId,
      reason: "Cancelado por el usuario",
    });
  };

  const handleSubmitReview = (apt: Apt) => {
    reviewMutation.mutate({
      professionalId: apt.professionalId,
      appointmentId: apt.id,
      rating,
      comment: ratingComment,
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">

        {/* ── HERO CARD ─────────────────────────────────────────────── */}
        <div className="rounded-2xl gradient-hero text-white p-5 shadow-lg">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-white/60 text-xs mb-0.5">Bienvenido de vuelta</p>
              <h1
                className="text-2xl font-bold leading-tight"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                {user?.name?.split(" ")[0] ?? "Hola"} 👋
              </h1>
            </div>
            <Button
              onClick={() => navigate("/especialidades")}
              className="bg-white/20 hover:bg-white/30 text-white border-0 flex-shrink-0 h-9"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Nueva cita
            </Button>
          </div>

          {/* Stats grid — each cell is clickable */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={() => navigate("/citas")}
              className="bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors rounded-xl p-3 text-left"
            >
              <p className="text-xl font-bold">{upcomingAppointments.length}</p>
              <p className="text-white/60 text-xs mt-0.5">Próximas</p>
            </button>
            <button
              onClick={() => navigate("/citas")}
              className="bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors rounded-xl p-3 text-left"
            >
              <p className="text-xl font-bold">{completedCount}</p>
              <p className="text-white/60 text-xs mt-0.5">Completadas</p>
            </button>
            <button
              onClick={() => navigate("/wallet")}
              className="bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors rounded-xl p-3 text-left"
            >
              <p className="text-xl font-bold">
                {creditBalance.toLocaleString("es-MX")}
              </p>
              <p className="text-white/60 text-xs mt-0.5">Créditos</p>
            </button>
            <button
              onClick={() => navigate("/suscripcion")}
              className="bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors rounded-xl p-3 text-left"
            >
              <p className="text-sm font-bold truncate leading-tight">
                {(subscription as any)?.planName ?? "Sin plan"}
              </p>
              <p className="text-white/60 text-xs mt-0.5">Plan activo</p>
            </button>
          </div>
        </div>

        {/* ── ALERTA DE CRÉDITOS POR VENCER ─────────────────────────── */}
        {creditsExpiringSoon && nextExpiry && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800">
                Créditos por vencer
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Tienes {creditBalance.toLocaleString("es-MX")} créditos que vencen{" "}
                {formatDistanceToNow(nextExpiry, { addSuffix: true, locale: es })}.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100 flex-shrink-0"
              onClick={() => navigate("/especialidades")}
            >
              Usar ahora
            </Button>
          </div>
        )}

        {/* ── NOTIFICACIONES ────────────────────────────────────────── */}
        {unreadNotifications.length > 0 && (
          <Card className="border-border">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  Notificaciones
                  <Badge className="bg-primary text-white border-0 text-[10px] px-1.5 py-0.5">
                    {unreadNotifications.length}
                  </Badge>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                >
                  {markAllReadMutation.isPending ? (
                    <span className="animate-spin w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full" />
                  ) : (
                    "Marcar leídas"
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {unreadNotifications.slice(0, 3).map((n: any) => (
                <div
                  key={n.id}
                  className="flex items-start gap-3 p-2.5 bg-primary/5 rounded-xl"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bell className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{n.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      {n.message}
                    </p>
                    {n.link && (
                      <button
                        onClick={() => navigate(n.link)}
                        className="text-[11px] text-primary font-medium mt-1 hover:underline"
                      >
                        Ver más →
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground flex-shrink-0 whitespace-nowrap">
                    {formatDistanceToNow(new Date(n.createdAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ── PRÓXIMA CITA DESTACADA ─────────────────────────────────── */}
        {nextAppointment && (
          <div>
            <h2
              className="text-base font-bold mb-3"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Tu próxima sesión
            </h2>
            <Card className="border-primary/30 bg-primary/5 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {((nextAppointment as any).professionalName ?? "P")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {(nextAppointment as any).professionalName ??
                        `Especialista #${nextAppointment.professionalId}`}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-primary font-medium capitalize">
                        <Calendar className="w-3 h-3" />
                        {getDateLabel(new Date(nextAppointment.appointmentDate))}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {format(new Date(nextAppointment.appointmentDate), "HH:mm", { locale: es })}
                        {" · "}{nextAppointment.durationMinutes} min
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {nextAppointment.videoCallLink ? (
                    <a
                      href={nextAppointment.videoCallLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button
                        size="sm"
                        className="w-full gradient-brand text-white border-0 h-9 text-xs font-semibold"
                      >
                        <Video className="w-3.5 h-3.5 mr-1.5" />
                        Unirse a la sesión
                      </Button>
                    </a>
                  ) : (
                    <div className="flex-1 flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                      <Video className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        El enlace estará disponible próximamente
                      </span>
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 text-xs border-red-200 text-red-500 hover:bg-red-50 flex-shrink-0 px-3"
                    disabled={cancelingId === nextAppointment.id}
                    onClick={() => handleCancel(nextAppointment.id)}
                  >
                    {cancelingId === nextAppointment.id ? (
                      <span className="animate-spin w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <X className="w-3 h-3 mr-1" />
                        Cancelar
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── PRÓXIMAS CITAS (lista) ─────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2
              className="text-base font-bold"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Próximas citas
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary text-xs h-7"
              onClick={() => navigate("/citas")}
            >
              Ver todas
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>
          </div>

          {loadingAppointments ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <Card key={i} className="border-border animate-pulse">
                  <CardContent className="p-4 h-16" />
                </Card>
              ))}
            </div>
          ) : upcomingAppointments.length === 0 ? (
            <Card className="border-border border-dashed">
              <CardContent className="p-8 text-center">
                <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-semibold text-muted-foreground text-sm">
                  No tienes citas próximas
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Agenda una consulta con un especialista
                </p>
                <Button
                  className="mt-4 gradient-brand text-white border-0"
                  size="sm"
                  onClick={() => navigate("/especialidades")}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agendar ahora
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {upcomingAppointments.map((apt) => (
                <Card
                  key={apt.id}
                  className="border-border hover:border-primary/30 hover:shadow-sm transition-all"
                >
                  <CardContent className="p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white font-bold flex-shrink-0">
                        {((apt as any).professionalName ?? "P")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {(apt as any).professionalName ??
                            `Especialista #${apt.professionalId}`}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground capitalize">
                            <Calendar className="w-3 h-3" />
                            {getDateLabel(new Date(apt.appointmentDate))}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {format(new Date(apt.appointmentDate), "HH:mm", { locale: es })}
                          </span>
                          <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px]">
                            Confirmada
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {apt.videoCallLink && (
                          <a
                            href={apt.videoCallLink}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              size="sm"
                              className="gradient-brand text-white border-0 h-7 text-xs px-2.5"
                            >
                              <Video className="w-3 h-3 mr-1" />
                              Unirse
                            </Button>
                          </a>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          disabled={cancelingId === apt.id}
                          onClick={() => handleCancel(apt.id)}
                          title="Cancelar cita"
                        >
                          {cancelingId === apt.id ? (
                            <span className="animate-spin w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* ── HISTORIAL ─────────────────────────────────────────────── */}
        {pastAppointments.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2
                className="text-base font-bold"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                Historial de sesiones
              </h2>
              {pastAppointments.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary text-xs h-7"
                  onClick={() => setShowAllHistory((v) => !v)}
                >
                  {showAllHistory
                    ? "Ver menos"
                    : `Ver todas (${pastAppointments.length})`}
                  <ChevronRight
                    className={`w-3.5 h-3.5 ml-0.5 transition-transform ${
                      showAllHistory ? "rotate-90" : ""
                    }`}
                  />
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {visibleHistory.map((apt) => (
                <Card key={apt.id} className="border-border">
                  <CardContent className="p-3.5">
                    {ratingId === apt.id ? (
                      /* ── Review form ── */
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {((apt as any).professionalName ?? "P")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">
                              Califica tu sesión con{" "}
                              {(apt as any).professionalName ?? "el especialista"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(apt.appointmentDate), "d 'de' MMMM", {
                                locale: es,
                              })}
                            </p>
                          </div>
                        </div>
                        <StarRating value={rating} onChange={setRating} />
                        <textarea
                          value={ratingComment}
                          onChange={(e) => setRatingComment(e.target.value)}
                          placeholder="Comparte tu experiencia (opcional)..."
                          rows={2}
                          className="w-full text-sm border border-border rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="gradient-brand text-white border-0 text-xs flex-1"
                            disabled={reviewMutation.isPending}
                            onClick={() => handleSubmitReview(apt)}
                          >
                            {reviewMutation.isPending ? (
                              <span className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-1.5" />
                            ) : (
                              <ThumbsUp className="w-3 h-3 mr-1.5" />
                            )}
                            Enviar reseña
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => {
                              setRatingId(null);
                              setRating(5);
                              setRatingComment("");
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* ── Normal row ── */
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground font-bold text-sm flex-shrink-0">
                          {((apt as any).professionalName ?? "P")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {(apt as any).professionalName ??
                              `Especialista #${apt.professionalId}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(apt.appointmentDate), "d MMM yyyy", {
                              locale: es,
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Badge
                            className={
                              statusColors[apt.status] + " border-0 text-[10px]"
                            }
                          >
                            {statusLabels[apt.status]}
                          </Badge>
                          {apt.status === "completed" &&
                            !(apt as any).hasReview && (
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
                          {apt.status === "completed" &&
                            (apt as any).hasReview && (
                              <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Calificada
                              </Badge>
                            )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── WALLET RESUMEN ─────────────────────────────────────────── */}
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mi wallet</p>
                  <p className="text-xl font-bold text-primary leading-tight">
                    {creditBalance.toLocaleString("es-MX")}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      créditos
                    </span>
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-primary/30 text-primary"
                onClick={() => navigate("/wallet")}
              >
                Ver detalle
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            {nextExpiry && creditBalance > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 mb-3">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                <span>
                  Próximo vencimiento:{" "}
                  <span className="font-medium text-foreground">
                    {format(nextExpiry, "d 'de' MMMM yyyy", { locale: es })}
                  </span>
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                className="gradient-brand text-white border-0 h-8 text-xs"
                onClick={() => navigate("/planes")}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Comprar créditos
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-primary/30 text-primary"
                onClick={() => navigate("/especialidades")}
              >
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                Agendar sesión
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── PROFESIONALES DESTACADOS ───────────────────────────────── */}
        {featuredProfessionals && featuredProfessionals.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2
                className="text-base font-bold"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                Profesionales destacados
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary text-xs h-7"
                onClick={() => navigate("/especialidades")}
              >
                Ver todos
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </div>
            <div
              className="flex gap-3 overflow-x-auto pb-2"
              style={{ scrollbarWidth: "none" } as React.CSSProperties}
            >
              {featuredProfessionals.map((pro) => (
                <button
                  key={pro.id}
                  onClick={() => navigate(`/profesional/${pro.id}`)}
                  className="flex-shrink-0 w-[155px] bg-white rounded-2xl p-3.5 border border-border/60 shadow-sm hover:shadow-md hover:border-primary/30 active:scale-[0.98] transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white font-bold mb-2.5">
                    {((pro as any).name ?? "P").charAt(0).toUpperCase()}
                  </div>
                  <p className="text-xs font-semibold truncate">
                    {(pro as any).name ?? "Profesional"}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {(pro as any).specialtyName ?? "Especialista"}
                  </p>
                  {pro.averageRating && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-[10px] font-medium">
                        {Number(pro.averageRating).toFixed(1)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        ({pro.totalReviews})
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── EXPLORAR ESPECIALIDADES ────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2
              className="text-base font-bold"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Explorar especialidades
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary text-xs h-7"
              onClick={() => navigate("/especialidades")}
            >
              Ver todas
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>
          </div>
          <div
            className="flex gap-3 overflow-x-auto pb-2"
            style={{ scrollbarWidth: "none" } as React.CSSProperties}
          >
            {(
              specialties ?? [
                { id: 1, name: "Psicología" },
                { id: 2, name: "Emprendimiento" },
                { id: 3, name: "Finanzas" },
                { id: 4, name: "Legal" },
                { id: 5, name: "Coaching de vida" },
                { id: 6, name: "Nutrición" },
              ]
            ).map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/especialidades/${s.id}`)}
                className="flex-shrink-0 flex items-center gap-2.5 bg-white rounded-2xl px-3.5 py-3 border border-border/60 shadow-sm hover:shadow-md hover:border-primary/30 active:scale-[0.98] transition-all"
              >
                <div
                  className={`w-8 h-8 rounded-lg ${
                    specialtyBg[s.name] ?? "bg-[#607562]"
                  } flex items-center justify-center flex-shrink-0`}
                >
                  {specialtyIcon[s.name] ?? (
                    <Compass className="w-4 h-4 text-white" />
                  )}
                </div>
                <p className="text-xs font-semibold text-foreground whitespace-nowrap">
                  {s.name}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* ── ACCESOS RÁPIDOS ────────────────────────────────────────── */}
        <div>
          <h2
            className="text-base font-bold mb-3"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            Accesos rápidos
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate("/perfil")}
              className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-border/60 shadow-sm hover:shadow-md hover:border-primary/30 active:scale-[0.98] transition-all text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold">Mi perfil</p>
                <p className="text-[10px] text-muted-foreground">
                  Editar información
                </p>
              </div>
            </button>
            <button
              onClick={() => navigate("/citas")}
              className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-border/60 shadow-sm hover:shadow-md hover:border-primary/30 active:scale-[0.98] transition-all text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-semibold">Mis citas</p>
                <p className="text-[10px] text-muted-foreground">
                  Ver historial
                </p>
              </div>
            </button>
            <button
              onClick={() => navigate("/wallet")}
              className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-border/60 shadow-sm hover:shadow-md hover:border-primary/30 active:scale-[0.98] transition-all text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Wallet className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold">Wallet</p>
                <p className="text-[10px] text-muted-foreground">
                  {creditBalance.toLocaleString("es-MX")} créditos
                </p>
              </div>
            </button>
            <button
              onClick={() => navigate("/suscripcion")}
              className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-border/60 shadow-sm hover:shadow-md hover:border-primary/30 active:scale-[0.98] transition-all text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-yellow-100 flex items-center justify-center flex-shrink-0">
                <Star className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs font-semibold">Suscripción</p>
                <p className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                  {(subscription as any)?.planName ?? "Sin plan"}
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* ── PROMO BANNER ───────────────────────────────────────────── */}
        <div className="rounded-2xl gradient-hero text-white p-5 flex items-center justify-between gap-4">
          <div>
            <p
              className="text-base font-bold"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Mejora tu experiencia
            </p>
            <p className="text-white/70 text-xs mt-1">
              Accede a más sesiones y beneficios exclusivos con un plan premium.
            </p>
          </div>
          <Button
            onClick={() => navigate("/planes")}
            className="bg-white text-primary hover:bg-white/90 border-0 flex-shrink-0 text-xs h-8 font-semibold"
            size="sm"
          >
            Ver planes
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>

        {/* Spacer for mobile nav */}
        <div className="h-6 md:h-0" />
      </div>
    </DashboardLayout>
  );
}
