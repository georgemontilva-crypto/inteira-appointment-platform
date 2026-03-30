import { useState } from "react";
import { trpc } from "@/lib/trpc";
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
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
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
  if (h <= 2) return "text-red-600";
  if (h <= 24) return "text-orange-500";
  return "text-[#3d4e3f]";
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
  const [ratingId, setRatingId] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [prRating, setPrRating] = useState(5);
  const [prComment, setPrComment] = useState("");

  const { data: appointments, isLoading } = trpc.user.getAppointments.useQuery(undefined, {
    enabled: isAuthenticated,
  });

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
    a.status === "scheduled" && new Date(a.appointmentDate) > now
  ) ?? [];
  const pastAppointments: Apt[] = appointments?.filter((a) =>
    a.status !== "scheduled" || new Date(a.appointmentDate) <= now
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

  /* ─── Appointment Card ─── */
  const UpcomingCard = ({ apt }: { apt: Apt }) => {
    const date = new Date(apt.appointmentDate);
    const sc = statusColors["scheduled"];
    return (
      <div className="bg-white rounded-2xl border border-[rgba(96,117,98,0.15)] p-4 hover:border-[rgba(96,117,98,0.3)] hover:shadow-sm transition-all">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#3d4e3f,#607562)" }}
          >
            {((apt as any).professionalName ?? "P").charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-[#1a1a1a] text-sm truncate">
                  {(apt as any).professionalName ?? `Especialista #${apt.professionalId}`}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`flex items-center gap-1 text-xs font-medium capitalize ${getUrgencyColor(date)}`}>
                    <Calendar className="w-3 h-3" />
                    {getDateLabel(date)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-[#607562]">
                    <Clock className="w-3 h-3" />
                    {format(date, "HH:mm")}
                    {apt.durationMinutes ? ` · ${apt.durationMinutes} min` : ""}
                  </span>
                </div>
              </div>
              {/* Status badge */}
              <span className={`flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {statusLabels["scheduled"]}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              {apt.videoCallLink && (
                <a href={apt.videoCallLink} target="_blank" rel="noopener noreferrer" className="flex-1">
                  <button
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-white rounded-xl h-8 px-3 transition-opacity hover:opacity-90"
                    style={{ background: "linear-gradient(135deg,#3d4e3f,#607562)" }}
                  >
                    <Video className="w-3.5 h-3.5" />
                    Unirse a la sesión
                  </button>
                </a>
              )}
              <button
                className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl h-8 px-3 border border-red-100 transition-colors disabled:opacity-50"
                disabled={cancelingId === apt.id}
                onClick={() => handleCancel(apt.id)}
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

  const HistoryCard = ({ apt }: { apt: Apt }) => {
    const date = new Date(apt.appointmentDate);
    const sc = statusColors[apt.status] ?? statusColors["completed"];
    const isRating = ratingId === apt.id;

    return (
      <div className="bg-white rounded-2xl border border-[rgba(96,117,98,0.12)] p-4 transition-all hover:border-[rgba(96,117,98,0.25)]">
        {isRating ? (
          /* Review form */
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#3d4e3f,#607562)" }}
              >
                {((apt as any).professionalName ?? "P").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1a1a1a]">
                  Califica tu sesión con {(apt as any).professionalName ?? "el especialista"}
                </p>
                <p className="text-xs text-[#93A295]">
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
              className="w-full text-sm border border-[rgba(96,117,98,0.2)] rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[rgba(96,117,98,0.3)] bg-[#F7FAFC] text-[#333]"
            />
            <div className="flex gap-2">
              <button
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-white rounded-xl h-9 px-4 transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#3d4e3f,#607562)" }}
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
                className="text-xs font-medium text-[#607562] hover:bg-[#f0f4f0] rounded-xl h-9 px-4 border border-[rgba(96,117,98,0.2)] transition-colors"
                onClick={() => { setRatingId(null); setRating(5); setRatingComment(""); }}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          /* Normal row */
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F0F4F0] flex items-center justify-center text-[#607562] font-bold text-sm flex-shrink-0">
              {((apt as any).professionalName ?? "P").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-[#1a1a1a] truncate">
                {(apt as any).professionalName ?? `Especialista #${apt.professionalId}`}
              </p>
              <p className="text-xs text-[#93A295] mt-0.5">
                {format(date, "d MMM yyyy · HH:mm", { locale: es })}
                {apt.durationMinutes ? ` · ${apt.durationMinutes} min` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {statusLabels[apt.status]}
              </span>
              {apt.status === "completed" && !(apt as any).hasReview && (
                <button
                  className="flex items-center gap-1 text-[10px] font-semibold text-yellow-600 hover:bg-yellow-50 rounded-full h-6 px-2.5 border border-yellow-200 transition-colors"
                  onClick={() => setRatingId(apt.id)}
                >
                  <Star className="w-3 h-3" />
                  Calificar
                </button>
              )}
              {apt.status === "completed" && (apt as any).hasReview && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-full h-6 px-2.5 border border-emerald-100">
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
      <div className="p-4 md:p-6">
        {/* ── Page Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-[#1a1a1a]">Mis citas</h1>
            <p className="text-xs text-[#93A295] mt-0.5">Gestiona tus sesiones agendadas</p>
          </div>
          <button
            onClick={() => navigate("/especialidades")}
            className="flex items-center gap-1.5 text-xs font-semibold text-white rounded-xl h-9 px-4 transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#3d4e3f,#607562)" }}
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva cita
          </button>
        </div>

        {/* ── 2-column layout on desktop ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

          {/* ── COLUMNA PRINCIPAL (2/3) ── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 bg-[#F0F4F0] rounded-2xl p-1">
              {(["upcoming", "history"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    tab === t
                      ? "bg-white text-[#3d4e3f] shadow-sm"
                      : "text-[#93A295] hover:text-[#607562]"
                  }`}
                >
                  {t === "upcoming" ? (
                    <>
                      <CalendarCheck className="w-3.5 h-3.5" />
                      Próximas
                      {upcomingAppointments.length > 0 && (
                        <span className="ml-0.5 min-w-[18px] h-[18px] bg-[#607562] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                          {upcomingAppointments.length}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <History className="w-3.5 h-3.5" />
                      Historial
                      {pastAppointments.length > 0 && (
                        <span className="ml-0.5 min-w-[18px] h-[18px] bg-[#93A295] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
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
                  <div key={i} className="bg-white rounded-2xl border border-[rgba(96,117,98,0.12)] p-4 animate-pulse">
                    <div className="flex gap-3">
                      <div className="w-11 h-11 rounded-xl bg-[#F0F4F0]" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 bg-[#F0F4F0] rounded-full w-1/3" />
                        <div className="h-3 bg-[#F0F4F0] rounded-full w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : tab === "upcoming" ? (
              upcomingAppointments.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-[rgba(96,117,98,0.25)] p-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#F0F4F0] flex items-center justify-center mx-auto mb-4">
                    <CalendarX className="w-7 h-7 text-[#93A295]" />
                  </div>
                  <p className="font-semibold text-[#333] text-sm">No tienes citas próximas</p>
                  <p className="text-xs text-[#93A295] mt-1 mb-4">Agenda una sesión con un especialista</p>
                  <button
                    onClick={() => navigate("/especialidades")}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-white rounded-xl h-9 px-5 transition-opacity hover:opacity-90"
                    style={{ background: "linear-gradient(135deg,#3d4e3f,#607562)" }}
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
              <div className="bg-white rounded-2xl border border-dashed border-[rgba(96,117,98,0.25)] p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#F0F4F0] flex items-center justify-center mx-auto mb-4">
                  <History className="w-7 h-7 text-[#93A295]" />
                </div>
                <p className="font-semibold text-[#333] text-sm">Sin historial de citas</p>
                <p className="text-xs text-[#93A295] mt-1">Tus sesiones completadas aparecerán aquí</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pastAppointments.map((apt) => (
                  <HistoryCard key={apt.id} apt={apt} />
                ))}
              </div>
            )}
          </div>

          {/* ── COLUMNA LATERAL (1/3) ── */}
          <div className="space-y-4">
            {/* Stats card */}
            <div
              className="rounded-2xl p-5 text-white relative overflow-hidden"
              style={{ background: "linear-gradient(135deg,#3d4e3f,#607562)" }}
            >
              <div className="absolute top-0 right-0 w-28 h-28 rounded-full pointer-events-none" style={{ background: "rgba(255,255,255,0.06)", transform: "translate(35%,-35%)" }} />
              <p className="text-[10px] text-white/60 uppercase tracking-widest font-medium mb-3">Resumen</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-2xl font-bold text-white">{upcomingAppointments.length}</p>
                  <p className="text-[10px] text-white/60 mt-0.5">Próximas</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-2xl font-bold text-white">{completedCount}</p>
                  <p className="text-[10px] text-white/60 mt-0.5">Completadas</p>
                </div>
              </div>
              {pendingReviews > 0 && (
                <div className="mt-3 bg-yellow-400/20 border border-yellow-400/30 rounded-xl px-3 py-2 flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-yellow-300 flex-shrink-0" />
                  <p className="text-[11px] text-yellow-100">
                    Tienes <strong>{pendingReviews}</strong> sesión{pendingReviews > 1 ? "es" : ""} por calificar
                  </p>
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-2xl border border-[rgba(96,117,98,0.15)] p-4">
              <p className="text-[10px] text-[#93A295] uppercase tracking-widest font-semibold mb-3">Acciones rápidas</p>
              <div className="space-y-1.5">
                <button
                  onClick={() => navigate("/especialidades")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#F0F4F0] transition-colors text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#F0F4F0] group-hover:bg-white flex items-center justify-center flex-shrink-0 transition-colors">
                    <Plus className="w-4 h-4 text-[#607562]" />
                  </div>
                  <span className="text-[12px] font-medium text-[#333]">Agendar nueva cita</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#93A295] ml-auto" />
                </button>
                <button
                  onClick={() => { setTab("history"); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#F0F4F0] transition-colors text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#F0F4F0] group-hover:bg-white flex items-center justify-center flex-shrink-0 transition-colors">
                    <History className="w-4 h-4 text-[#607562]" />
                  </div>
                  <span className="text-[12px] font-medium text-[#333]">Ver historial</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#93A295] ml-auto" />
                </button>
                <button
                  onClick={() => navigate("/wallet")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#F0F4F0] transition-colors text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#F0F4F0] group-hover:bg-white flex items-center justify-center flex-shrink-0 transition-colors">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#607562]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                  </div>
                  <span className="text-[12px] font-medium text-[#333]">Mi wallet</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#93A295] ml-auto" />
                </button>
              </div>
            </div>

            {/* Tip card */}
            <div className="bg-[#F7FAFC] rounded-2xl border border-[rgba(96,117,98,0.12)] p-4">
              <p className="text-[10px] text-[#93A295] uppercase tracking-widest font-semibold mb-2">Consejo</p>
              <p className="text-[12px] text-[#607562] leading-relaxed">
                Cancela con al menos <strong>24 horas</strong> de anticipación para recibir el reembolso completo de tus créditos.
              </p>
            </div>
          </div>
        </div>

        {/* Spacer for mobile nav */}
        <div className="h-6 md:h-0" />
      </div>

      {/* ─── Modal obligatorio de reseña pendiente ─── */}
      {pendingReviewApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="text-center space-y-2">
              <div
                className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white font-bold text-xl"
                style={{ background: "linear-gradient(135deg,#3d4e3f,#607562)" }}
              >
                {((pendingReviewApt as any).professionalName ?? "P").charAt(0).toUpperCase()}
              </div>
              <h2 className="text-base font-bold text-[#1a1a1a]">Califica tu sesión</h2>
              <p className="text-xs text-[#93A295]">
                Con {(pendingReviewApt as any).professionalName ?? "el especialista"} ·{" "}
                {format(new Date(pendingReviewApt.appointmentDate), "d 'de' MMMM yyyy", { locale: es })}
              </p>
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-1.5">
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
              className="w-full text-sm border border-[rgba(96,117,98,0.2)] rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[rgba(96,117,98,0.3)] bg-[#F7FAFC] text-[#333]"
            />
            <button
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white rounded-xl h-10 px-4 transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#3d4e3f,#607562)" }}
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
    </DashboardLayout>
  );
}
