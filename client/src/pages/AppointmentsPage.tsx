import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { format, isToday, isTomorrow } from "date-fns";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import DashboardLayout from "../components/DashboardLayout";
import { useLocation } from "wouter";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  canceled: "bg-red-100 text-red-700",
  "no-show": "bg-gray-100 text-gray-600",
};

const statusLabels: Record<string, string> = {
  scheduled: "Confirmada",
  completed: "Completada",
  canceled: "Cancelada",
  "no-show": "No asistió",
};

function getDateLabel(date: Date): string {
  if (isToday(date)) return "Hoy";
  if (isTomorrow(date)) return "Mañana";
  return format(date, "EEEE d MMM", { locale: es });
}

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
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

export default function AppointmentsPage() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();

  const [tab, setTab] = useState<"upcoming" | "history">("upcoming");
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [ratingId, setRatingId] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState("");

  const { data: appointments, isLoading } = trpc.user.getAppointments.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

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

  type Apt = NonNullable<typeof appointments>[number];

  const upcomingAppointments: Apt[] =
    appointments?.filter((a) => a.status === "scheduled") ?? [];
  const pastAppointments: Apt[] =
    appointments?.filter((a) => a.status !== "scheduled") ?? [];

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

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1
              className="text-xl font-bold"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Mis citas
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gestiona tus sesiones agendadas
            </p>
          </div>
          <Button
            size="sm"
            className="gradient-brand text-white border-0 h-8 text-xs"
            onClick={() => navigate("/especialidades")}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Nueva cita
          </Button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-5 bg-muted/50 rounded-xl p-1">
          {(["upcoming", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab === t
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "upcoming"
                ? `Próximas${upcomingAppointments.length ? ` (${upcomingAppointments.length})` : ""}`
                : `Historial${pastAppointments.length ? ` (${pastAppointments.length})` : ""}`}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border animate-pulse">
                <CardContent className="p-4 h-20" />
              </Card>
            ))}
          </div>
        ) : tab === "upcoming" ? (
          upcomingAppointments.length === 0 ? (
            <Card className="border-border border-dashed">
              <CardContent className="p-10 text-center">
                <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-semibold text-muted-foreground text-sm">
                  No tienes citas próximas
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Agenda una sesión con un especialista
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
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white font-bold flex-shrink-0">
                        {((apt as any).professionalName ?? "P")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {(apt as any).professionalName ??
                            `Especialista #${apt.professionalId}`}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-primary font-medium capitalize">
                            <Calendar className="w-3 h-3" />
                            {getDateLabel(new Date(apt.appointmentDate))}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {format(new Date(apt.appointmentDate), "HH:mm", {
                              locale: es,
                            })}
                            {apt.durationMinutes
                              ? ` · ${apt.durationMinutes} min`
                              : ""}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px]">
                          Confirmada
                        </Badge>
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
          )
        ) : pastAppointments.length === 0 ? (
          <Card className="border-border border-dashed">
            <CardContent className="p-10 text-center">
              <Star className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-semibold text-muted-foreground text-sm">
                Sin historial de citas
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Tus sesiones completadas aparecerán aquí
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {pastAppointments.map((apt) => (
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
                            {format(
                              new Date(apt.appointmentDate),
                              "d 'de' MMMM",
                              { locale: es }
                            )}
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
                          {format(
                            new Date(apt.appointmentDate),
                            "d MMM yyyy",
                            { locale: es }
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Badge
                          className={`${statusColors[apt.status]} border-0 text-[10px]`}
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
        )}

        {/* Spacer for mobile nav */}
        <div className="h-6 md:h-0" />
      </div>
    </DashboardLayout>
  );
}
