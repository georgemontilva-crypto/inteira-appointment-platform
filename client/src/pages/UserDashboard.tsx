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
import { format, isToday, isTomorrow, formatDistanceToNow, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { parseLocalDate } from "@/lib/utils";
import { getLoginUrl } from "@/const";
import DashboardLayout from "../components/DashboardLayout";
import { Link } from "wouter";

// ── Specialty icons & colors ───────────────────────────────────────────────
const specialtyIcon: Record<string, React.ReactNode> = {
  "Psicología": <Brain className="w-4 h-4 text-white" />,
  "Legal": <Scale className="w-4 h-4 text-white" />,
  "Emprendimiento": <TrendingUp className="w-4 h-4 text-white" />,
  "Finanzas": <DollarSign className="w-4 h-4 text-white" />,
  "Idiomas": <Mic2 className="w-4 h-4 text-white" />,
  "Imagen Personal": <Sparkles className="w-4 h-4 text-white" />,
  "Vocación": <Compass className="w-4 h-4 text-white" />,
  "Coaching de vida": <Sun className="w-4 h-4 text-white" />,
  "Mindfulness y meditación": <Leaf className="w-4 h-4 text-white" />,
  "Nutrición": <Apple className="w-4 h-4 text-white" />,
  "Orientación vocacional": <GraduationCap className="w-4 h-4 text-white" />,
  "Terapia de pareja": <HeartHandshake className="w-4 h-4 text-white" />,
  "Trabajo social": <HandHeart className="w-4 h-4 text-white" />,
  "Salud mental": <Brain className="w-4 h-4 text-white" />,
  "Desarrollo personal": <Smile className="w-4 h-4 text-white" />,
  "Educación": <BookOpen className="w-4 h-4 text-white" />,
  "Negocios": <Briefcase className="w-4 h-4 text-white" />,
  "Idiomas y cultura": <Globe className="w-4 h-4 text-white" />,
  "Bienestar": <Activity className="w-4 h-4 text-white" />,
  "Familia": <Heart className="w-4 h-4 text-white" />,
  "Recursos Humanos": <Users className="w-4 h-4 text-white" />,
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

// ── Timing badge helper ────────────────────────────────────────────────────
function getTimingBadge(date: Date): { label: string; cls: string } {
  if (isToday(date)) return { label: "Hoy", cls: "bg-emerald-100 text-emerald-700" };
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  if (date <= weekEnd) return { label: "Esta semana", cls: "bg-blue-100 text-blue-700" };
  return { label: "Pendiente", cls: "bg-gray-100 text-gray-500" };
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin w-8 h-8 border-4 border-[#5B6A57] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Card className="max-w-sm w-full mx-4 shadow-sm border border-gray-100">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#5B6A57] flex items-center justify-center mx-auto">
              <User className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Inicia sesión para continuar</h2>
            <p className="text-sm text-gray-500">
              Accede a tu dashboard, citas y más.
            </p>
            <a href={getLoginUrl()}>
              <Button className="w-full bg-[#5B6A57] text-white border-0 hover:bg-[#5B6A57]/90">
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

  // ── Additional derived data for new layout ─────────────────────────────
  const nowMs = Date.now();
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";
  const firstName =
    (user as any)?.name?.split(" ")[0] ??
    (user as any)?.email?.split("@")[0] ??
    "Usuario";
  const todayFormatted = format(new Date(), "EEEE d 'de' MMMM", { locale: es });

  const activeSessionApt = upcomingAppointments.reduce<
    (Apt & { minutesUntil: number }) | null
  >((found, a) => {
    if (found) return found;
    const aptMs = parseLocalDate(a.appointmentDate).getTime();
    const diffMin = (aptMs - nowMs) / 60_000;
    const dur = a.durationMinutes ?? 60;
    if (diffMin <= 30 && diffMin > -dur)
      return { ...a, minutesUntil: Math.max(0, Math.ceil(diffMin)) };
    return null;
  }, null);

  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const upcomingThisWeek = upcomingAppointments.filter(
    (a) => parseLocalDate(a.appointmentDate) <= weekEnd
  );

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="bg-white min-h-screen pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto px-4 pt-5 pb-4 space-y-4">

          {/* TOP BAR */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-semibold text-gray-900 truncate">
                {greeting}, {firstName}
              </p>
              <p className="text-xs text-gray-400 capitalize mt-0.5">{todayFormatted}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5 bg-[#5B6A57]/10 text-[#5B6A57] rounded-full px-3 py-1.5">
                <Wallet className="w-3.5 h-3.5" />
                <span className="text-sm font-bold">{creditBalance.toLocaleString("es-MX")}</span>
                <span className="text-xs font-normal text-[#5B6A57]/70">créditos</span>
              </div>
              <button
                onClick={() => {
                  if (unreadNotifications.length > 0) markAllReadMutation.mutate();
                }}
                className="relative w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <Bell className="w-4 h-4 text-gray-600" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadNotifications.length > 9 ? "9+" : unreadNotifications.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* ACTIVE SESSION BANNER */}
          {activeSessionApt && (
            <div className="flex items-center justify-between gap-3 bg-[#5B6A57] rounded-2xl px-4 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <Video className="w-5 h-5 text-white flex-shrink-0" />
                <p className="text-white text-sm font-medium truncate">
                  {activeSessionApt.minutesUntil === 0
                    ? `Tu sesión con ${(activeSessionApt as any).professionalName ?? "tu especialista"} está en curso`
                    : `Tu sesión con ${(activeSessionApt as any).professionalName ?? "tu especialista"} comienza en ${activeSessionApt.minutesUntil} min`}
                </p>
              </div>
              {activeSessionApt.videoCallLink ? (
                <a
                  href={activeSessionApt.videoCallLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0"
                >
                  <span className="inline-block bg-white text-[#5B6A57] text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer">
                    Unirse ahora
                  </span>
                </a>
              ) : (
                <span className="inline-block bg-white/30 text-white text-xs font-semibold px-3.5 py-2 rounded-xl whitespace-nowrap">
                  Sin enlace
                </span>
              )}
            </div>
          )}

          {/* CREDITS EXPIRY ALERT */}
          {creditsExpiringSoon && nextExpiry && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-800 flex-1 min-w-0">
                {creditBalance.toLocaleString("es-MX")} créditos vencen{" "}
                {formatDistanceToNow(nextExpiry, { addSuffix: true, locale: es })}
              </p>
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

          {/* METRICS ROW */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Esta semana",
                value: upcomingThisWeek.length,
                icon: <Calendar className="w-4 h-4 text-[#5B6A57]" />,
                iconBg: "bg-[#5B6A57]/10",
              },
              {
                label: "Completadas",
                value: completedCount,
                icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
                iconBg: "bg-emerald-100",
              },
              {
                label: "Créditos",
                value: creditBalance.toLocaleString("es-MX"),
                icon: <Wallet className="w-4 h-4 text-[#A7774E]" />,
                iconBg: "bg-[#A7774E]/10",
              },
            ].map((m) => (
              <div
                key={m.label}
                className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm flex flex-col gap-1.5"
              >
                <div className={`w-7 h-7 rounded-lg ${m.iconBg} flex items-center justify-center`}>
                  {m.icon}
                </div>
                <p className="text-lg font-bold text-gray-900 leading-none">{m.value}</p>
                <p className="text-[11px] text-gray-400 leading-tight">{m.label}</p>
              </div>
            ))}
          </div>

          {/* MAIN GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* LEFT — Próximas citas */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-900">Próximas citas</h2>
                <button
                  onClick={() => navigate("/citas")}
                  className="flex items-center gap-0.5 text-xs text-[#5B6A57] font-medium hover:underline"
                >
                  Ver todas <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {loadingAppointments ? (
                <div className="space-y-2.5">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : upcomingAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-7 gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-[#5B6A57]/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-[#5B6A57]" />
                  </div>
                  <p className="text-sm text-gray-500">No tienes citas próximas</p>
                  <button
                    onClick={() => navigate("/especialidades")}
                    className="text-xs text-[#5B6A57] font-semibold hover:underline"
                  >
                    + Agendar ahora
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingAppointments.slice(0, 3).map((a) => {
                    const aptDate = parseLocalDate(a.appointmentDate);
                    const { label, cls } = getTimingBadge(aptDate);
                    const rawName: string =
                      (a as any).professionalName ?? `Especialista #${a.professionalId}`;
                    const initials = rawName
                      .split(" ")
                      .slice(0, 2)
                      .map((w: string) => w[0] ?? "")
                      .join("")
                      .toUpperCase();
                    return (
                      <div
                        key={a.id}
                        className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl"
                      >
                        <div className="w-9 h-9 rounded-xl bg-[#5B6A57] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{rawName}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {format(aptDate, "d MMM · HH:mm", { locale: es })}
                          </p>
                        </div>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${cls}`}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* RIGHT — Explorar especialidades */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-900">Explorar especialidades</h2>
                <button
                  onClick={() => navigate("/especialidades")}
                  className="flex items-center gap-0.5 text-xs text-[#5B6A57] font-medium hover:underline"
                >
                  Ver todas <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {(
                  specialties ?? [
                    { id: 1, name: "Psicología" },
                    { id: 2, name: "Emprendimiento" },
                    { id: 3, name: "Finanzas" },
                    { id: 4, name: "Coaching de vida" },
                  ]
                )
                  .slice(0, 4)
                  .map((s) => (
                    <button
                      key={s.id}
                      onClick={() => navigate(`/especialidades/${s.id}`)}
                      className="flex flex-col gap-2.5 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg ${specialtyBg[s.name] ?? "bg-[#607562]"} flex items-center justify-center`}
                      >
                        {specialtyIcon[s.name] ?? <Compass className="w-4 h-4 text-white" />}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900 leading-tight">{s.name}</p>
                        {(s as any).professionalCount != null && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {(s as any).professionalCount} profesionales
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div
            className="flex items-center justify-between gap-4 rounded-2xl p-5"
            style={{ backgroundColor: "#f5f0eb" }}
          >
            <div>
              <p className="text-sm font-bold text-gray-900">¿Listo para tu próxima sesión?</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Encuentra el especialista ideal para ti.
              </p>
            </div>
            <Button
              onClick={() => navigate("/especialidades")}
              className="text-white flex-shrink-0 border-0 hover:opacity-90"
              style={{ backgroundColor: "#A7774E" }}
            >
              Explorar profesionales
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>

        </div>
      </div>

      {/* REVIEW MODAL */}
      {ratingId !== null && (() => {
        const apt = pastAppointments.find((a) => a.id === ratingId);
        if (!apt) return null;
        return (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setRatingId(null)}
          >
            <div
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-gray-900">Calificar sesión</h3>
                <button
                  onClick={() => setRatingId(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                ¿Cómo fue tu sesión con{" "}
                {(apt as any).professionalName ?? "el especialista"}?
              </p>
              <StarRating value={rating} onChange={setRating} />
              <textarea
                className="w-full mt-4 p-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#5B6A57]/30"
                rows={3}
                placeholder="Comparte tu experiencia (opcional)"
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
              />
              <Button
                className="w-full mt-4 text-white border-0 hover:opacity-90"
                style={{ backgroundColor: "#5B6A57" }}
                onClick={() => handleSubmitReview(apt)}
                disabled={reviewMutation.isPending}
              >
                {reviewMutation.isPending ? "Enviando..." : "Enviar reseña"}
              </Button>
            </div>
          </div>
        );
      })()}
    </DashboardLayout>
  );
}
