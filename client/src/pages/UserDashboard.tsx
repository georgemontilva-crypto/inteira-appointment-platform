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
import { parseLocalDate } from "@/lib/utils";
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
      <div className="p-4 md:p-6 space-y-5 w-full max-w-2xl mx-auto">

        {/* Alerta de créditos por vencer */}
        {creditsExpiringSoon && nextExpiry && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800">Créditos por vencer</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Tienes {creditBalance.toLocaleString("es-MX")} créditos que vencen{" "}
                {formatDistanceToNow(nextExpiry, { addSuffix: true, locale: es })}.
              </p>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100 flex-shrink-0"
              onClick={() => navigate("/especialidades")}>Usar ahora</Button>
          </div>
        )}

        {/* BLOQUE A — Próxima cita o CTA primera sesión */}
        {loadingAppointments ? (
          <Card className="border-border animate-pulse"><CardContent className="p-6 h-32" /></Card>
        ) : nextAppointment ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>Tu próxima sesión</h2>
              <Button variant="ghost" size="sm" className="text-primary text-xs h-7" onClick={() => navigate("/citas")}>
                Ver todas <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </div>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                    {((nextAppointment as any).professionalName ?? "P").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">
                      {(nextAppointment as any).professionalName ?? `Especialista #${nextAppointment.professionalId}`}
                    </p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-sm text-primary font-semibold capitalize">
                        <Calendar className="w-3.5 h-3.5" />
                        {getDateLabel(parseLocalDate(nextAppointment.appointmentDate))}
                      </span>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        {format(parseLocalDate(nextAppointment.appointmentDate), "HH:mm", { locale: es })}
                        {nextAppointment.durationMinutes ? ` · ${nextAppointment.durationMinutes} min` : ""}
                      </span>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 border-0 flex-shrink-0">Confirmada</Badge>
                </div>
                <div className="flex gap-2">
                  {nextAppointment.videoCallLink ? (
                    <a href={nextAppointment.videoCallLink} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button size="sm" className="w-full gradient-brand text-white border-0 h-10 text-sm font-semibold">
                        <Video className="w-4 h-4 mr-2" /> Unirse a la sesión
                      </Button>
                    </a>
                  ) : (
                    <div className="flex-1 flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2.5">
                      <Video className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">El enlace estará disponible próximamente</span>
                    </div>
                  )}
                  <Button size="sm" variant="outline" className="h-10 text-xs border-red-200 text-red-500 hover:bg-red-50 flex-shrink-0 px-3"
                    disabled={cancelingId === nextAppointment.id} onClick={() => handleCancel(nextAppointment.id)}>
                    {cancelingId === nextAppointment.id
                      ? <span className="animate-spin w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full" />
                      : <><X className="w-3 h-3 mr-1" />Cancelar</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="border-border border-dashed">
            <CardContent className="p-8 text-center">
              <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <h2 className="font-bold text-lg mb-1" style={{ fontFamily: "Poppins, sans-serif" }}>
                ¡Agenda tu primera sesión!
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Conecta con un especialista y da el primer paso hacia tu bienestar.
              </p>
              <Button className="gradient-brand text-white border-0" onClick={() => navigate("/especialidades")}>
                <Plus className="w-4 h-4 mr-2" /> Explorar especialistas
              </Button>
            </CardContent>
          </Card>
        )}

        {/* BLOQUE B — 3 accesos rápidos */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Explorar", sub: "Especialistas", icon: <Star className="w-5 h-5 text-primary" />, bg: "bg-primary/10", action: () => navigate("/especialidades") },
            { label: "Mis citas", sub: `${upcomingAppointments.length} próximas`, icon: <Calendar className="w-5 h-5 text-blue-600" />, bg: "bg-blue-100", action: () => navigate("/citas") },
            { label: "Wallet", sub: `${creditBalance.toLocaleString("es-MX")} cred.`, icon: <Wallet className="w-5 h-5 text-emerald-600" />, bg: "bg-emerald-100", action: () => navigate("/wallet") },
          ].map((item) => (
            <button key={item.label} onClick={item.action}
              className="flex flex-col items-center gap-2 bg-white rounded-2xl py-4 px-2 border border-border/60 shadow-sm hover:shadow-md hover:border-primary/30 active:scale-[0.98] transition-all text-center">
              <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center`}>
                {item.icon}
              </div>
              <div>
                <p className="text-xs font-semibold">{item.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{item.sub}</p>
              </div>
            </button>
          ))}
        </div>

        {/* BLOQUE C — Especialidades destacadas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>Especialidades</h2>
            <Button variant="ghost" size="sm" className="text-primary text-xs h-7" onClick={() => navigate("/especialidades")}>
              Ver todas <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {(specialties ?? [
              { id: 1, name: "Psicología" }, { id: 2, name: "Emprendimiento" },
              { id: 3, name: "Finanzas" }, { id: 4, name: "Legal" },
              { id: 5, name: "Coaching de vida" }, { id: 6, name: "Nutrición" },
            ]).slice(0, 6).map((s) => (
              <button key={s.id} onClick={() => navigate(`/especialidades/${s.id}`)}
                className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-3 border border-border/60 shadow-sm hover:shadow-md hover:border-primary/30 active:scale-[0.98] transition-all text-left">
                <div className={`w-8 h-8 rounded-xl ${specialtyBg[s.name] ?? "bg-[#607562]"} flex items-center justify-center flex-shrink-0`}>
                  {specialtyIcon[s.name] ?? <Compass className="w-4 h-4 text-white" />}
                </div>
                <p className="text-xs font-semibold text-foreground truncate">{s.name}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="h-6 md:h-0" />
      </div>
    </DashboardLayout>
  );
}
