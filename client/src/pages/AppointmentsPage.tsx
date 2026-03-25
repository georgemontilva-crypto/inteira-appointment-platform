import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Clock, Video, X, Star, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import DashboardLayout from "../components/DashboardLayout";

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

export default function AppointmentsPage() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

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

  const reviewMutation = trpc.review.create.useMutation({
    onSuccess: () => {
      toast.success("¡Gracias por tu reseña!");
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

  const upcomingAppointments: Apt[] = appointments?.filter((a) => a.status === "scheduled") ?? [];
  const pastAppointments: Apt[] = appointments?.filter((a) => a.status !== "scheduled") ?? [];

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
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-2xl">
        <h1 className="text-xl font-medium text-[#333333] mb-1">Mis citas</h1>
        <p className="text-sm text-[#93A295] mb-6">Gestiona tus sesiones agendadas</p>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[rgba(96,117,98,0.07)] rounded-xl p-1 w-fit">
          {(["upcoming", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-[13px] font-medium transition-all ${
                tab === t
                  ? "bg-white text-[#3d4e3f] shadow-sm"
                  : "text-[#93A295] hover:text-[#607562]"
              }`}
            >
              {t === "upcoming"
                ? `Próximas${upcomingAppointments.length ? ` (${upcomingAppointments.length})` : ""}`
                : "Historial"}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border animate-pulse">
                <CardContent className="p-4 h-20" />
              </Card>
            ))}
          </div>
        ) : tab === "upcoming" ? (
          upcomingAppointments.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[rgba(96,117,98,0.15)]">
              <Calendar className="w-10 h-10 text-[#93A295]/40 mx-auto mb-3" />
              <p className="text-[14px] font-medium text-[#333333]">No tienes citas próximas</p>
              <p className="text-[12px] text-[#93A295] mt-1">Agenda una sesión con un especialista</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((apt) => (
                <div key={apt.id} className="bg-white border border-[rgba(96,117,98,0.15)] rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-[#607562] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {((apt as any).professionalName ?? "P").charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#333333] truncate">
                        {(apt as any).professionalName ?? `Especialista #${apt.professionalId}`}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-[11px] text-[#93A295]">
                          <Clock className="w-3 h-3" />
                          {format(new Date(apt.appointmentDate), "d MMM · HH:mm", { locale: es })}
                        </span>
                        {apt.durationMinutes && (
                          <span className="text-[11px] text-[#93A295]">{apt.durationMinutes} min</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px]">Confirmada</Badge>
                      {apt.videoCallLink && (
                        <a href={apt.videoCallLink} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="h-7 px-2.5 text-[11px] bg-[#607562] hover:bg-[#4a5c4c] text-white border-0">
                            <Video className="w-3 h-3 mr-1" />
                            Unirse
                          </Button>
                        </a>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-[11px] border-red-200 text-red-500 hover:bg-red-50"
                        disabled={cancelingId === apt.id}
                        onClick={() => handleCancel(apt.id)}
                      >
                        {cancelingId === apt.id ? (
                          <span className="animate-spin w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full" />
                        ) : (
                          <><X className="w-3 h-3 mr-1" />Cancelar</>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          pastAppointments.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[rgba(96,117,98,0.15)]">
              <Star className="w-10 h-10 text-[#93A295]/40 mx-auto mb-3" />
              <p className="text-[14px] font-medium text-[#333333]">Sin historial de citas</p>
              <p className="text-[12px] text-[#93A295] mt-1">Tus sesiones completadas aparecerán aquí</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pastAppointments.map((apt) => (
                <div key={apt.id} className="bg-white border border-[rgba(96,117,98,0.12)] rounded-2xl p-4 opacity-90">
                  {ratingId === apt.id ? (
                    <div className="space-y-3">
                      <p className="text-[13px] font-medium text-[#333333]">Califica tu sesión</p>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button key={s} onClick={() => setRating(s)}>
                            <Star className={`w-6 h-6 transition-colors ${s <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={ratingComment}
                        onChange={(e) => setRatingComment(e.target.value)}
                        placeholder="Comentario opcional..."
                        rows={2}
                        className="w-full text-[12px] border border-[rgba(96,117,98,0.2)] rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#607562]/20 bg-background"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-[#607562] hover:bg-[#4a5c4c] text-white border-0 text-xs" disabled={reviewMutation.isPending} onClick={() => handleSubmitReview(apt)}>
                          <ThumbsUp className="w-3 h-3 mr-1" />
                          Enviar
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs" onClick={() => setRatingId(null)}>Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#93A295]/20 flex items-center justify-center text-[#607562] font-semibold text-sm flex-shrink-0">
                        {((apt as any).professionalName ?? "P").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#333333] truncate">
                          {(apt as any).professionalName ?? `Especialista #${apt.professionalId}`}
                        </p>
                        <p className="text-[11px] text-[#93A295] mt-0.5">
                          {format(new Date(apt.appointmentDate), "d MMM yyyy", { locale: es })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={`${statusColors[apt.status]} border-0 text-[10px]`}>
                          {statusLabels[apt.status]}
                        </Badge>
                        {apt.status === "completed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-[11px] border-yellow-200 text-yellow-600 hover:bg-yellow-50"
                            onClick={() => setRatingId(apt.id)}
                          >
                            <Star className="w-3 h-3 mr-1" />
                            Calificar
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </DashboardLayout>
  );
}
