import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { sessionCostByDuration } from "@/lib/pricing";
import { parseLocalDate } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { format, isToday, isTomorrow, differenceInHours } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar,
  Clock,
  Video,
  X,
  Star,
  ThumbsUp,
  Plus,
  CheckCircle2,
  CalendarCheck,
  CalendarX,
  History,
  ArrowRight,
  Lock,
  CreditCard,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { VideoCallPanel } from "../components/VideoCallPanel";
import { useLocation } from "wouter";

/* ─── helpers ─── */
const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  scheduled: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  completed: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  canceled: { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-400" },
  "no-show": { bg: "bg-gray-100", text: "text-gray-500", dot: "bg-gray-400" },
  pending_review: { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500" },
};
const statusLabels: Record<string, string> = {
  scheduled: "Confirmada",
  completed: "Completada",
  canceled: "Cancelada",
  "no-show": "No asistió",
  pending_review: "Calificar sesión",
};

function getDateLabel(date: Date): string {
  if (isToday(date)) return "Hoy";
  if (isTomorrow(date)) return "Mañana";
  return format(date, "EEEE d 'de' MMM", { locale: es });
}

function getUrgencyColor(date: Date): string {
  const h = differenceInHours(date, new Date());
  if (h <= 2) return "text-[#A32D2D] font-bold";
  if (h <= 24) return "text-orange-500";
  return "text-gray-600";
}

/* ─── StarRating ─── */
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
              s <= (hovered || value) ? "text-yellow-400 fill-yellow-400" : "text-gray-200"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

/* ─── Main ─── */
export default function AppointmentsPage() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();

  const [tab, setTab] = useState<"upcoming" | "history">("upcoming");
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);
  const [ratingId, setRatingId] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [prRating, setPrRating] = useState(5);
  const [prComment, setPrComment] = useState("");
  const [activeCall, setActiveCall] = useState<{
    url: string;
    appointmentId: number;
    professionalName: string;
    startTime: Date;
    endTime: Date;
  } | null>(null);

  const { data: appointments, isLoading } = trpc.user.getAppointments.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const joinAppointmentMutation = trpc.appointment.joinAppointment.useMutation();

  // Activate video call panel 5 minutes before session start
  useEffect(() => {
    const check = () => {
      if (!appointments) return;
      const fiveMin = 5 * 60 * 1000;
      const now = Date.now();
      const upcoming = appointments.find((a) => {
        if (a.status !== "scheduled") return false;
        const start = parseLocalDate(a.appointmentDate).getTime();
        return now >= start - fiveMin && now < start + (((a as any).durationMinutes ?? 60) * 60 * 1000);
      });
      if (upcoming && (upcoming as any).videoCallLink) {
        const start = parseLocalDate(upcoming.appointmentDate);
        const end = new Date(start.getTime() + ((upcoming as any).durationMinutes ?? 60) * 60 * 1000);
        setActiveCall((prev) =>
          prev?.appointmentId === upcoming.id ? prev : {
            url: (upcoming as any).videoCallLink,
            appointmentId: upcoming.id,
            professionalName: (upcoming as any).professionalName ?? `Especialista #${upcoming.professionalId}`,
            startTime: start,
            endTime: end,
          }
        );
      }
    };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [appointments]);

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

  const markPendingReviewMutation = trpc.appointment.markAppointmentPendingReview.useMutation({
    onSuccess: () => utils.user.getAppointments.invalidate(),
    onError: () => utils.user.getAppointments.invalidate(),
  });

  const submitReviewMutation = trpc.appointment.submitReview.useMutation({
    onSuccess: () => {
      toast.success("¡Gracias por tu reseña! El pago al profesional ha sido liberado.");
      setPrRating(5);
      setPrComment("");
      utils.user.getAppointments.invalidate();
    },
    onError: (err) => toast.error("Error al enviar reseña", { description: err.message }),
  });

  const reviewMutation = trpc.review.create.useMutation({
    onSuccess: () => {
      toast.success("¡Gracias por tu reseña!");
      setRatingId(null);
      setRating(5);
      setRatingComment("");
      utils.user.getAppointments.invalidate();
    },
    onError: (err) => toast.error("Error al enviar reseña", { description: err.message }),
  });

  type Apt = NonNullable<typeof appointments>[number];

  const now = new Date();
  const pendingReviewApt = appointments?.find((a) => a.status === "pending_review") ?? null;
  const upcomingAppointments: Apt[] = appointments?.filter((a) =>
    a.status === "scheduled" && parseLocalDate(a.appointmentDate) > now
  ) ?? [];
  const pastAppointments: Apt[] = appointments?.filter((a) =>
    a.status !== "scheduled" || parseLocalDate(a.appointmentDate) <= now
  ) ?? [];
  const completedCount = appointments?.filter((a) => a.status === "completed").length ?? 0;
  const pendingReviews = pastAppointments.filter(
    (a) => a.status === "completed" && !(a as any).hasReview
  ).length;

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

  /* ─── Upcoming Card ─── */
  const UpcomingCard = ({ apt }: { apt: Apt }) => {
    const date = parseLocalDate(apt.appointmentDate);
    const [nowMs, setNowMs] = useState(Date.now());
    useEffect(() => {
      const id = setInterval(() => setNowMs(Date.now()), 1000);
      return () => clearInterval(id);
    }, []);
    const startMs = date.getTime();
    const msUntilUnlock = startMs - 5 * 60 * 1000 - nowMs;
    const canJoin = msUntilUnlock <= 0;
    const countdownStr = (() => {
      if (canJoin) return "";
      const ms = msUntilUnlock;
      const days = Math.floor(ms / (1000 * 60 * 60 * 24));
      const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      if (days > 0) return `${days}d ${hours}h`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    })();

    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-colors">
        <div className="flex items-start gap-3">
          {/* Avatar circular */}
          <div className="w-12 h-12 rounded-full bg-[#5B6A57] flex items-center justify-center text-white font-semibold text-base flex-shrink-0">
            {((apt as any).professionalName ?? "P").charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">
                  {(apt as any).professionalName ?? `Especialista #${apt.professionalId}`}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`flex items-center gap-1 text-xs capitalize ${getUrgencyColor(date)}`}>
                    <Calendar className="w-3 h-3" />
                    {getDateLabel(date)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {format(date, "HH:mm")}
                    {apt.durationMinutes ? ` · ${apt.durationMinutes} min` : ""}
                  </span>
                </div>
              </div>
              {/* Status badge */}
              <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Confirmada
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              {(apt as any).videoCallLink && (
                <button
                  disabled={!canJoin}
                  onClick={async () => {
                    if (!canJoin) return;
                    await joinAppointmentMutation.mutateAsync({ appointmentId: apt.id }).catch(() => {});
                    setActiveCall({
                      url: (apt as any).videoCallLink,
                      appointmentId: apt.id,
                      professionalName: (apt as any).professionalName ?? `Especialista #${apt.professionalId}`,
                      startTime: parseLocalDate(apt.appointmentDate),
                      endTime: new Date(parseLocalDate(apt.appointmentDate).getTime() + ((apt as any).durationMinutes ?? 55) * 60 * 1000),
                    });
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg h-8 px-3 transition-colors ${
                    canJoin
                      ? "bg-[#5B6A57] hover:bg-[#4a5847] text-white"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {canJoin
                    ? <Video className="w-3.5 h-3.5" />
                    : <Lock className="w-3.5 h-3.5" />
                  }
                  {canJoin ? "Unirse a la sesión" : `Disponible en ${countdownStr}`}
                </button>
              )}
              <button
                className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg h-8 px-3 border border-red-100 transition-colors disabled:opacity-50"
                disabled={cancelingId === apt.id}
                onClick={() => setConfirmCancelId(apt.id)}
              >
                {cancelingId === apt.id ? (
                  <span className="animate-spin w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full" />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ─── History Card ─── */
  const HistoryCard = ({ apt }: { apt: Apt }) => {
    const date = parseLocalDate(apt.appointmentDate);
    const sc = statusColors[apt.status] ?? statusColors["completed"];
    const isRating = ratingId === apt.id;

    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-colors">
        {isRating ? (
          /* Review form */
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-[#5B6A57] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {((apt as any).professionalName ?? "P").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Califica tu sesión con {(apt as any).professionalName ?? "el especialista"}
                </p>
                <p className="text-xs text-gray-400">
                  {format(date, "d 'de' MMMM yyyy", { locale: es })}
                </p>
              </div>
            </div>
            <StarRating value={rating} onChange={setRating} />
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Comparte tu experiencia (opcional)..."
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#5B6A57]/20 bg-gray-50 text-gray-800"
            />
            <div className="flex gap-2">
              <button
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-[#5B6A57] hover:bg-[#4a5847] rounded-lg h-9 px-4 transition-colors disabled:opacity-50"
                disabled={reviewMutation.isPending}
                onClick={() => handleSubmitReview(apt)}
              >
                {reviewMutation.isPending ? (
                  <span className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <ThumbsUp className="w-3.5 h-3.5" />
                )}
                Enviar reseña
              </button>
              <button
                className="text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg h-9 px-4 border border-gray-200 transition-colors"
                onClick={() => { setRatingId(null); setRating(5); setRatingComment(""); }}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          /* Compact row */
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-semibold text-sm flex-shrink-0">
              {((apt as any).professionalName ?? "P").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900 truncate">
                {(apt as any).professionalName || (apt as any).specialtyName || `Especialista #${apt.professionalId}`}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {format(date, "d MMM yyyy · HH:mm", { locale: es })}
                {apt.durationMinutes ? ` · ${apt.durationMinutes} min` : ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {statusLabels[apt.status]}
              </span>
              <span className="text-[10px] text-gray-400">
                {sessionCostByDuration(apt.durationMinutes)} créditos
              </span>
              {apt.status === "completed" && !(apt as any).hasReview && (
                <button
                  className="flex items-center gap-1 text-[10px] font-semibold text-yellow-600 hover:bg-yellow-50 rounded-full h-5 px-2 border border-yellow-200 transition-colors"
                  onClick={() => setRatingId(apt.id)}
                >
                  <Star className="w-3 h-3" />
                  Calificar
                </button>
              )}
              {apt.status === "completed" && (apt as any).hasReview && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-full h-5 px-2 border border-emerald-100">
                  <CheckCircle2 className="w-3 h-3" />
                  Calificada
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ─── Render ─── */
  return (
    <DashboardLayout>
      <div className={activeCall ? "flex gap-4 p-4 md:p-6 items-start" : ""}>
        <div className="bg-white min-h-full" style={activeCall ? { flex: 1, minWidth: 0 } : {}}>
          <div className="max-w-7xl mx-auto w-full px-4 md:px-6 py-6 space-y-5">

            {/* ── Page Header ── */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Mis citas</h1>
                <p className="text-sm text-gray-400 mt-0.5">Gestiona tus sesiones y revisa tu historial</p>
              </div>
              <button
                onClick={() => navigate("/especialidades")}
                className="flex items-center gap-1.5 text-sm font-semibold text-white bg-[#5B6A57] hover:bg-[#4a5847] rounded-lg h-9 px-4 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Nueva cita
              </button>
            </div>

            {/* ── Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

              {/* ── Columna principal (2/3) ── */}
              <div className="lg:col-span-2 space-y-4">

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
                  {(["upcoming", "history"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                        tab === t
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      {t === "upcoming" ? (
                        <>
                          <CalendarCheck className="w-3.5 h-3.5" />
                          Próximas
                          {upcomingAppointments.length > 0 && (
                            <span className="ml-0.5 min-w-[18px] h-[18px] bg-[#5B6A57] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                              {upcomingAppointments.length}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <History className="w-3.5 h-3.5" />
                          Historial
                          {pastAppointments.length > 0 && (
                            <span className="ml-0.5 min-w-[18px] h-[18px] bg-gray-300 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                              {pastAppointments.length}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  ))}
                </div>

                {/* Content */}
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
                        <div className="flex gap-3">
                          <div className="w-12 h-12 rounded-full bg-gray-100" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3.5 bg-gray-100 rounded-full w-1/3" />
                            <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : tab === "upcoming" ? (
                  upcomingAppointments.length === 0 ? (
                    <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
                      <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                        <CalendarX className="w-7 h-7 text-gray-300" />
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">No tienes citas próximas</p>
                      <p className="text-xs text-gray-400 mt-1 mb-4">Agenda una sesión con un especialista</p>
                      <button
                        onClick={() => navigate("/especialidades")}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#5B6A57] hover:bg-[#4a5847] rounded-lg h-9 px-5 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Agendar ahora
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingAppointments.map((apt) => (
                        <UpcomingCard key={apt.id} apt={apt} />
                      ))}
                    </div>
                  )
                ) : pastAppointments.length === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
                    <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                      <History className="w-7 h-7 text-gray-300" />
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">Sin historial de citas</p>
                    <p className="text-xs text-gray-400 mt-1">Tus sesiones completadas aparecerán aquí</p>
                  </div>
                ) : (
                  <div
                    className="max-h-[600px] overflow-y-auto space-y-3 [&::-webkit-scrollbar]:hidden"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {pastAppointments.map((apt) => (
                      <HistoryCard key={apt.id} apt={apt} />
                    ))}
                  </div>
                )}
              </div>

              {/* ── Columna lateral (1/3) — oculta durante videollamada ── */}
              {!activeCall && (
                <div className="lg:col-span-1 space-y-4">

                  {/* Stats */}
                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-3">Resumen</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CalendarCheck className="w-4 h-4 text-[#5B6A57]" />
                          <span className="text-sm text-gray-600">Próximas</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{upcomingAppointments.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-sm text-gray-600">Completadas</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{completedCount}</span>
                      </div>
                    </div>
                    {pendingReviews > 0 && (
                      <div className="mt-3 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2 flex items-center gap-2">
                        <Star className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                        <p className="text-[11px] text-yellow-700">
                          <strong>{pendingReviews}</strong> sesión{pendingReviews > 1 ? "es" : ""} por calificar
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Accesos rápidos */}
                  <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-3">Accesos rápidos</p>
                    <div className="space-y-0.5">
                      <button
                        onClick={() => navigate("/especialidades")}
                        className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <Plus className="w-4 h-4 text-[#5B6A57] flex-shrink-0" />
                        <span className="text-sm text-gray-700">Explorar especialistas</span>
                        <ArrowRight className="w-3.5 h-3.5 text-gray-300 ml-auto" />
                      </button>
                      <button
                        onClick={() => navigate("/wallet")}
                        className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <CreditCard className="w-4 h-4 text-[#5B6A57] flex-shrink-0" />
                        <span className="text-sm text-gray-700">Mi wallet</span>
                        <ArrowRight className="w-3.5 h-3.5 text-gray-300 ml-auto" />
                      </button>
                      <button
                        onClick={() => { setTab("history"); }}
                        className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <History className="w-4 h-4 text-[#5B6A57] flex-shrink-0" />
                        <span className="text-sm text-gray-700">Ver historial</span>
                        <ArrowRight className="w-3.5 h-3.5 text-gray-300 ml-auto" />
                      </button>
                    </div>
                  </div>

                  {/* Tip */}
                  <div className="bg-[#f5f0eb] rounded-xl p-4">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-2">Consejo</p>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Cancela con al menos <strong>4 horas</strong> de anticipación para recibir el reembolso completo de tus créditos.
                    </p>
                  </div>

                </div>
              )}
            </div>

            <div className="h-6 md:h-0" />
          </div>
        </div>

        {/* ─── Modal confirmación de cancelación ─── */}
        {confirmCancelId !== null && (() => {
          const apt = upcomingAppointments.find((a) => a.id === confirmCancelId);
          if (!apt) return null;
          const hoursUntil = (parseLocalDate(apt.appointmentDate).getTime() - Date.now()) / 3_600_000;
          const isFree = hoursUntil >= 4;
          const sessionCost = sessionCostByDuration(apt.durationMinutes);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
              <div className="bg-white rounded-2xl border border-gray-100 w-full max-w-sm p-6 space-y-4">
                <h2 className="text-base font-bold text-gray-900">¿Cancelar cita?</h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {isFree
                    ? "Podrás cancelar sin costo. Tus créditos serán devueltos."
                    : `Perderás los ${sessionCost} créditos de esta sesión. No se realizará ningún cargo adicional a tu tarjeta.`}
                </p>
                {!isFree && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    La cita comienza en menos de 4 horas.
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setConfirmCancelId(null)}
                    className="flex-1 h-10 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Volver
                  </button>
                  <button
                    onClick={() => { handleCancel(confirmCancelId); setConfirmCancelId(null); }}
                    className="flex-1 h-10 rounded-lg bg-red-600 hover:bg-red-700 text-sm font-semibold text-white transition-colors"
                  >
                    Confirmar cancelación
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ─── Modal obligatorio de reseña pendiente ─── */}
        {pendingReviewApt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl border border-gray-100 w-full max-w-sm p-6 space-y-4">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-[#5B6A57] mx-auto flex items-center justify-center text-white font-bold text-xl">
                  {((pendingReviewApt as any).professionalName ?? "P").charAt(0).toUpperCase()}
                </div>
                <h2 className="text-base font-bold text-gray-900">Califica tu sesión</h2>
                <p className="text-xs text-gray-400">
                  Con {(pendingReviewApt as any).professionalName ?? "el especialista"} ·{" "}
                  {format(parseLocalDate(pendingReviewApt.appointmentDate), "d 'de' MMMM yyyy", { locale: es })}
                </p>
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
                  El pago al profesional se libera al enviar tu reseña.
                </p>
              </div>
              <div className="flex justify-center">
                <StarRating value={prRating} onChange={setPrRating} />
              </div>
              <textarea
                value={prComment}
                onChange={(e) => setPrComment(e.target.value)}
                placeholder="Comparte tu experiencia (opcional)..."
                rows={3}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#5B6A57]/20 bg-gray-50 text-gray-800"
              />
              <button
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white bg-[#5B6A57] hover:bg-[#4a5847] rounded-lg h-10 px-4 transition-colors disabled:opacity-50"
                disabled={submitReviewMutation.isPending}
                onClick={() =>
                  submitReviewMutation.mutate({
                    appointmentId: pendingReviewApt.id,
                    rating: prRating,
                    comment: prComment || undefined,
                  })
                }
              >
                {submitReviewMutation.isPending ? (
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <ThumbsUp className="w-4 h-4" />
                )}
                Enviar reseña
              </button>
            </div>
          </div>
        )}

        {/* ── Video call panel (columna derecha, aparece 5 min antes) ── */}
        {activeCall && (
          <div style={{ width: "420px", minWidth: "420px", height: "calc(100vh - 120px)", flexShrink: 0, position: "sticky", top: "24px" }}>
            <VideoCallPanel
              roomUrl={activeCall.url}
              appointmentId={activeCall.appointmentId}
              professionalName={activeCall.professionalName}
              startTime={activeCall.startTime}
              endTime={activeCall.endTime}
              onLeave={() => {
                if (activeCall) {
                  markPendingReviewMutation.mutate({ appointmentId: activeCall.appointmentId });
                }
                setActiveCall(null);
              }}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
