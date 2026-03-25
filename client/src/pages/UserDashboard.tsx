import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getLoginUrl } from "@/const";
import DashboardLayout from "../components/DashboardLayout";

const specialtyIcon: Record<string, React.ReactNode> = {
  "Psicología": <Brain className="w-6 h-6 text-white" />,
  "Legal": <Scale className="w-6 h-6 text-white" />,
  "Emprendimiento": <TrendingUp className="w-6 h-6 text-white" />,
  "Finanzas": <DollarSign className="w-6 h-6 text-white" />,
  "Idiomas": <Mic2 className="w-6 h-6 text-white" />,
  "Imagen Personal": <Sparkles className="w-6 h-6 text-white" />,
  "Vocación": <Compass className="w-6 h-6 text-white" />,
  "Coaching de vida": <Sun className="w-6 h-6 text-white" />,
  "Mindfulness y meditación": <Leaf className="w-6 h-6 text-white" />,
  "Nutrición": <Apple className="w-6 h-6 text-white" />,
  "Orientación vocacional": <GraduationCap className="w-6 h-6 text-white" />,
  "Terapia de pareja": <HeartHandshake className="w-6 h-6 text-white" />,
  "Trabajo social": <HandHeart className="w-6 h-6 text-white" />,
  "Salud mental": <Brain className="w-6 h-6 text-white" />,
  "Desarrollo personal": <Smile className="w-6 h-6 text-white" />,
  "Educación": <BookOpen className="w-6 h-6 text-white" />,
  "Negocios": <Briefcase className="w-6 h-6 text-white" />,
  "Idiomas y cultura": <Globe className="w-6 h-6 text-white" />,
  "Bienestar": <Activity className="w-6 h-6 text-white" />,
  "Familia": <Heart className="w-6 h-6 text-white" />,
  "Recursos Humanos": <Users className="w-6 h-6 text-white" />,
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
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [ratingId, setRatingId] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState("");

  const { data: appointments, isLoading: loadingAppointments } = trpc.user.getAppointments.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: subscription } = trpc.user.getSubscription.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: walletData } = trpc.user.getWallet.useQuery(undefined, { enabled: isAuthenticated });
  const { data: specialties } = trpc.specialty.getAll.useQuery(undefined, { staleTime: 300_000 });

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
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">

        {/* HERO */}
        <div className="rounded-2xl gradient-hero text-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-white/70 text-sm mb-1">Bienvenido de vuelta</p>
              <h1 className="text-2xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
                {user?.name?.split(" ")[0] ?? "Hola"} 👋
              </h1>
            </div>
            <Button
              onClick={() => navigate("/especialidades")}
              className="bg-white/20 hover:bg-white/30 text-white border-0 flex-shrink-0"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Nueva cita
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-2xl font-bold">{upcomingAppointments.length}</p>
              <p className="text-white/70 text-xs">Próximas</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-2xl font-bold">{completedCount}</p>
              <p className="text-white/70 text-xs">Completadas</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-2xl font-bold">{(walletData?.balance ?? 0).toLocaleString("es-MX")}</p>
              <p className="text-white/70 text-xs">Créditos</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-sm font-bold truncate">{(subscription as any)?.planName ?? "Sin plan"}</p>
              <p className="text-white/70 text-xs">Plan activo</p>
            </div>
          </div>
        </div>

        {/* PRÓXIMAS CITAS */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>Próximas citas</h2>
            <Button variant="ghost" size="sm" className="text-primary text-xs" onClick={() => navigate("/dashboard")}>
              Ver todas <ChevronRight className="w-3.5 h-3.5 ml-1" />
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
                <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-medium text-muted-foreground">No tienes citas próximas</p>
                <p className="text-sm text-muted-foreground mt-1">Agenda tu primera consulta con un especialista</p>
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
              {upcomingAppointments.slice(0, 3).map((apt) => (
                <Card key={apt.id} className="border-border hover:border-primary/30 hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white font-bold flex-shrink-0">
                          {((apt as any).professionalName ?? "P").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{(apt as any).professionalName ?? `Especialista #${apt.professionalId}`}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(apt.appointmentDate), "d MMM 'a las' HH:mm", { locale: es })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {apt.videoCallLink && (
                          <a href={apt.videoCallLink} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" className="gradient-brand text-white border-0 h-7 text-xs px-3">
                              <Video className="w-3 h-3 mr-1" />
                              Unirse
                            </Button>
                          </a>
                        )}
                        <Badge className={statusColors[apt.status] + " border-0 text-xs"}>
                          {statusLabels[apt.status]}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2 border-red-200 text-red-500 hover:bg-red-50"
                          disabled={cancelingId === apt.id}
                          onClick={() => handleCancel(apt.id)}
                        >
                          {cancelingId === apt.id ? (
                            <span className="animate-spin w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full" />
                          ) : (
                            <X className="w-3 h-3" />
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

        {/* HISTORIAL (si hay citas pasadas) */}
        {pastAppointments.length > 0 && (
          <div>
            <h2 className="text-base font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>Historial</h2>
            <div className="space-y-2">
              {pastAppointments.slice(0, 3).map((apt) => (
                <Card key={apt.id} className="border-border opacity-90">
                  <CardContent className="p-3.5">
                    {ratingId === apt.id ? (
                      <div className="space-y-3">
                        <p className="text-sm font-semibold">Califica tu sesión</p>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button key={s} onClick={() => setRating(s)} className="focus:outline-none">
                              <Star className={`w-6 h-6 transition-colors ${s <= rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`} />
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
                          <Button size="sm" className="gradient-brand text-white border-0 text-xs" disabled={reviewMutation.isPending} onClick={() => handleSubmitReview(apt)}>
                            <ThumbsUp className="w-3 h-3 mr-1" />
                            Enviar
                          </Button>
                          <Button size="sm" variant="ghost" className="text-xs" onClick={() => setRatingId(null)}>Cancelar</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground font-bold text-sm flex-shrink-0">
                            {((apt as any).professionalName ?? "P").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{(apt as any).professionalName ?? `Especialista #${apt.professionalId}`}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(apt.appointmentDate), "d MMM yyyy", { locale: es })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge className={statusColors[apt.status] + " border-0 text-xs"}>{statusLabels[apt.status]}</Badge>
                          {apt.status === "completed" && (
                            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 border-yellow-200 text-yellow-600 hover:bg-yellow-50" onClick={() => setRatingId(apt.id)}>
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
          </div>
        )}

        {/* ESPECIALIDADES */}
        <div>
          <h2 className="text-base font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>Explorar especialidades</h2>
          <div
            className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
          >
            {(specialties ?? [
              { id: 1, name: "Psicología" },
              { id: 2, name: "Emprendimiento" },
              { id: 3, name: "Finanzas" },
              { id: 4, name: "Legal" },
            ]).map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/especialidades/${s.id}`)}
                className="flex-shrink-0 flex items-center gap-3 bg-white rounded-2xl p-4 border border-border/60 shadow-sm hover:shadow-md hover:border-primary/30 active:scale-[0.98] transition-all w-[200px] text-left"
              >
                <div className={`w-10 h-10 rounded-xl ${specialtyBg[s.name] ?? "bg-[#607562]"} flex items-center justify-center flex-shrink-0`}>
                  {specialtyIcon[s.name] ?? <Compass className="w-5 h-5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground">Ver profesionales</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* PROMO BANNER */}
        <div className="rounded-2xl gradient-hero text-white p-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-lg font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>Mejora tu experiencia</p>
            <p className="text-white/70 text-sm mt-1">Accede a más citas y beneficios exclusivos con un plan premium.</p>
          </div>
          <Button
            onClick={() => navigate("/planes")}
            className="bg-white text-primary hover:bg-white/90 border-0 flex-shrink-0"
            size="sm"
          >
            Ver planes
          </Button>
        </div>

      </div>
    </DashboardLayout>
  );
}
