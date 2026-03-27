import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Calendar, Clock, CheckCircle2, User, Video,
  ExternalLink, Plus, Star, BarChart3, ArrowLeft, AlertCircle, XCircle,
  Camera, Trash2, MessageSquare, CalendarX,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  confirmed: "bg-green-100 text-green-700 border-green-200",
  completed: "bg-gray-100 text-gray-600 border-gray-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  no_show: "bg-orange-100 text-orange-700 border-orange-200",
};

const statusLabels: Record<string, string> = {
  scheduled: "Agendada",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No se presentó",
};

export default function ProfessionalDashboard() {
  const { user, isAuthenticated, loading, refresh, logout } = useAuth();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<"citas" | "disponibilidad" | "dias-libres" | "resenas" | "perfil">("citas");
  const [newSlot, setNewSlot] = useState({ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" });
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "", bio: "", education: "", certifications: "",
    yearsOfExperience: "", hourlyRate: "", languages: "Español",
  });
  const [newBlockedDate, setNewBlockedDate] = useState("");
  const [newBlockedReason, setNewBlockedReason] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading: loadingProfile, refetch: refetchProfile, error: profileError } = trpc.professional.getProfile.useQuery(
    undefined,
    {
      enabled: isAuthenticated,
      retry: false,
    }
  );

  // Polling cada 10s cuando está pending para detectar aprobación automáticamente
  useEffect(() => {
    if (profile?.status !== "pending") return;
    const interval = setInterval(() => refetchProfile(), 10000);
    return () => clearInterval(interval);
  }, [profile?.status]);

  // Cuando el perfil pasa de pending a approved, refrescar auth.me para actualizar el rol en toda la app
  useEffect(() => {
    if (profile?.status === "approved") {
      utils.auth.me.invalidate();
      refresh();
    }
  }, [profile?.status]);

  const { data: appointments, isLoading: loadingAppointments, refetch: refetchAppointments } = trpc.professional.getAppointments.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: availability, refetch: refetchAvailability } = trpc.professional.getAvailability.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: blockedDays, refetch: refetchBlockedDays } = trpc.professional.getBlockedDays.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: myReviews } = trpc.professional.getMyReviews.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const reviews = myReviews;

  const { data: wallet } = trpc.professional.getWallet.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const addAvailabilityMutation = trpc.professional.setAvailability.useMutation({
    onSuccess: () => {
      refetchAvailability();
      toast.success("Disponibilidad actualizada");
    },
    onError: () => toast.error("Error al actualizar disponibilidad"),
  });

  const removeAvailabilityMutation = trpc.professional.removeAvailability.useMutation({
    onSuccess: () => {
      refetchAvailability();
      toast.success("Horario eliminado");
    },
    onError: () => toast.error("Error al eliminar el horario"),
  });

  const updateProfileMutation = trpc.professional.updateProfile.useMutation({
    onSuccess: async () => {
      toast.success("Perfil actualizado correctamente");
      setEditingProfile(false);
      refetchProfile();
      await utils.auth.me.invalidate(); // refresca nombre en todo el dashboard
      refresh();
    },
    onError: (err) => toast.error(err.message ?? "Error al actualizar perfil"),
  });

  const updatePhotoMutation = trpc.professional.updatePhoto.useMutation({
    onSuccess: () => {
      toast.success("Foto de perfil actualizada");
      refetchProfile();
    },
    onError: () => toast.error("Error al actualizar la foto"),
  });

  const addBlockedDayMutation = trpc.professional.addBlockedDay.useMutation({
    onSuccess: () => {
      toast.success("Día bloqueado correctamente");
      setNewBlockedDate("");
      setNewBlockedReason("");
      refetchBlockedDays();
    },
    onError: () => toast.error("Error al bloquear el día"),
  });

  const removeBlockedDayMutation = trpc.professional.removeBlockedDay.useMutation({
    onSuccess: () => {
      toast.success("Día desbloqueado");
      refetchBlockedDays();
    },
    onError: () => toast.error("Error al desbloquear el día"),
  });

  const cancelMutation = trpc.appointment.cancelAppointment.useMutation({
    onSuccess: () => {
      toast.success("Cita cancelada");
      refetchAppointments();
    },
    onError: () => toast.error("Error al cancelar la cita"),
  });

  const completeMutation = trpc.appointment.completeAppointment.useMutation({
    onSuccess: () => {
      toast.success("Cita marcada como completada");
      refetchAppointments();
    },
    onError: () => toast.error("Error al actualizar la cita"),
  });

  // Si hay error FORBIDDEN significa que el rol en la sesión aún no está actualizado.
  // Hacer logout automático y redirigir al login para refrescar la sesión.
  const isForbidden = (profileError as any)?.data?.code === "FORBIDDEN";
  useEffect(() => {
    if (!isForbidden) return;
    const timer = setTimeout(async () => {
      await logout();
      window.location.href = "/login?returnTo=/panel-profesional";
    }, 2000);
    return () => clearTimeout(timer);
  }, [isForbidden]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar 5 MB");
      return;
    }
    setUploadingPhoto(true);
    try {
      // Convert to base64 for the upload endpoint
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Strip the data URL prefix (e.g. "data:image/jpeg;base64,")
          resolve(result.split(",")[1] ?? "");
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/upload/professional-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mimeType: file.type, fileName: file.name }),
      });
      if (!res.ok) throw new Error("Error al subir la foto");
      const data = await res.json();
      await updatePhotoMutation.mutateAsync({ photoUrl: data.url });
    } catch {
      toast.error("Error al subir la foto de perfil");
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading || loadingProfile) {
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

  if (isForbidden) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-base font-medium text-foreground">Actualizando tu sesión...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center space-y-4">
            <User className="w-12 h-12 text-primary mx-auto" />
            <h2 className="text-xl font-bold">No tienes perfil de profesional</h2>
            <p className="text-muted-foreground text-sm">Regístrate como profesional para acceder a este panel.</p>
            <a href="/registro-profesional">
              <Button className="w-full gradient-brand text-white border-0">Registrarme como profesional</Button>
            </a>
            <a href="/dashboard">
              <Button variant="outline" className="w-full">Ir al dashboard</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mostrar pantalla de estado si no está aprobado
  if (profile.status === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Solicitud en revisión</h2>
            <p className="text-muted-foreground text-sm">
              Tu solicitud para ser profesional en Inteira está siendo revisada por nuestro equipo.
              Recibirás un correo electrónico cuando sea aprobada.
            </p>
            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-sm px-4 py-1">
              Pendiente de aprobación
            </Badge>
            <a href="/dashboard">
              <Button variant="outline" className="w-full mt-2">Ir al dashboard</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (profile.status === "rejected") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Solicitud rechazada</h2>
            <p className="text-muted-foreground text-sm">
              Tu solicitud no fue aprobada en esta ocasión.
              {(profile as any).rejectionReason && (
                <span className="block mt-2 font-medium text-foreground">
                  Motivo: {(profile as any).rejectionReason}
                </span>
              )}
            </p>
            <p className="text-muted-foreground text-xs">
              Si tienes preguntas, contáctanos a soporte@inteira.mx
            </p>
            <a href="/dashboard">
              <Button variant="outline" className="w-full">Ir al dashboard</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  const upcomingAppointments = appointments?.filter((a) => a.status === "scheduled") ?? [];
  const pastAppointments = appointments?.filter((a) => a.status !== "scheduled") ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-hero text-white relative overflow-hidden rounded-b-2xl">
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full pointer-events-none" style={{background:"rgba(255,255,255,0.05)",transform:"translate(30%,-30%)"}} />
        <div className="absolute bottom-0 right-24 w-36 h-36 rounded-full pointer-events-none" style={{background:"rgba(255,255,255,0.04)",transform:"translateY(50%)"}} />
        <div className="container py-6 relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-white/30">
                  {profile.profilePhoto || (user as any)?.avatarUrl || (user as any)?.profileImage ? (
                    <img
                      src={profile.profilePhoto ?? (user as any)?.avatarUrl ?? (user as any)?.profileImage}
                      alt={user?.name ?? "Profesional"}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full bg-white/20 flex items-center justify-center text-xl font-medium">
                      {user?.name?.charAt(0) ?? "P"}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                >
                  {uploadingPhoto ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Camera className="w-4 h-4 text-white" />
                  )}
                </button>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>
              <div>
                <p className="text-white/60 text-xs mb-0.5">Panel del profesional</p>
                <h1 className="text-xl font-medium text-white">{user?.name ?? "Profesional"}</h1>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[11px] text-white/70">
                    {profile.status === "approved" ? "Aprobado" : profile.status === "pending" ? "Pendiente de aprobación" : "Rechazado"}
                    {profile.tier ? ` · Tier ${profile.tier === "pro" ? "Pro" : "Básico"}` : ""}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-0 border-t border-white/10 pt-4">
            <div className="text-center px-2">
              <p className="text-lg font-medium text-emerald-300">${wallet?.wallet?.balance ? parseFloat(String(wallet.wallet.balance)).toFixed(0) : "0"}</p>
              <p className="text-[11px] text-white/50 mt-0.5">Balance</p>
            </div>
            <div className="text-center px-2 border-l border-white/10">
              <p className="text-lg font-medium text-white">{appointments?.filter((a:any) => a.status === "completed").length ?? 0}</p>
              <p className="text-[11px] text-white/50 mt-0.5">Completadas</p>
            </div>
            <div className="text-center px-2 border-l border-white/10">
              <p className="text-lg font-medium text-emerald-300">{reviews && reviews.length > 0 ? (reviews.reduce((s:number,r:any) => s + r.rating, 0) / reviews.length).toFixed(1) : "—"}</p>
              <p className="text-[11px] text-white/50 mt-0.5">Calificación</p>
            </div>
            <div className="text-center px-2 border-l border-white/10">
              <p className="text-lg font-medium text-white">{appointments?.filter((a:any) => a.status === "scheduled").length ?? 0}</p>
              <p className="text-[11px] text-white/50 mt-0.5">Próximas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-background sticky top-0 z-10 overflow-x-auto">
        <div className="container">
          <div className="flex gap-1 min-w-max">
            {[
              { key: "citas", label: "Mis citas", icon: <Calendar className="w-4 h-4" /> },
              { key: "disponibilidad", label: "Disponibilidad", icon: <Clock className="w-4 h-4" /> },
              { key: "dias-libres", label: "Días libres", icon: <CalendarX className="w-4 h-4" /> },
              { key: "resenas", label: "Reseñas", icon: <Star className="w-4 h-4" />, badge: myReviews?.length },
              { key: "perfil", label: "Mi perfil", icon: <User className="w-4 h-4" /> },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-1 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Banner: próxima cita con videollamada */}
      {(() => {
        const nextWithVideo = upcomingAppointments.find((a) => (a as any).videoCallLink && a.status === "scheduled");
        if (!nextWithVideo) return null;
        const msUntil = new Date(nextWithVideo.appointmentDate).getTime() - Date.now();
        const isToday = new Date(nextWithVideo.appointmentDate).toDateString() === new Date().toDateString();
        const isSoon = msUntil > 0 && msUntil < 60 * 60 * 1000;
        if (!isToday && !isSoon) return null;
        return (
          <div className="container pt-5">
            <div className="rounded-2xl overflow-hidden border border-primary/30 bg-gradient-to-r from-primary/10 to-emerald-50">
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center flex-shrink-0">
                  <Video className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-primary">
                    {isSoon ? "¡Tu próxima cita comienza pronto!" : "Tienes una cita hoy"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(nextWithVideo.appointmentDate), "HH:mm", { locale: es })} · {nextWithVideo.durationMinutes} min
                  </p>
                </div>
                <a href={(nextWithVideo as any).videoCallLink} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="gradient-brand text-white border-0 text-xs h-8 px-3 flex-shrink-0 font-semibold">
                    <Video className="w-3 h-3 mr-1" />
                    Iniciar sesión
                  </Button>
                </a>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="container py-8">

        {/* Tab: Citas */}
        {activeTab === "citas" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-border">
                <CardContent className="p-5">
                  <p className="text-2xl font-bold text-primary">{upcomingAppointments.length}</p>
                  <p className="text-xs text-muted-foreground">Próximas citas</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-5">
                  <p className="text-2xl font-bold text-emerald-600">
                    {appointments?.filter((a) => a.status === "completed").length ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Completadas</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-5">
                  <p className="text-2xl font-bold text-accent">{profile.averageRating ?? "5.0"}</p>
                  <p className="text-xs text-muted-foreground">Calificación</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-5">
                  <p className="text-2xl font-bold text-blue-600">{profile.totalReviews ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Reseñas</p>
                </CardContent>
              </Card>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "Poppins, sans-serif" }}>
                Próximas citas
              </h2>
              {loadingAppointments ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Card key={i} className="animate-pulse border-border">
                      <CardContent className="p-5 h-20" />
                    </Card>
                  ))}
                </div>
              ) : upcomingAppointments.length === 0 ? (
                <Card className="border-border border-dashed">
                  <CardContent className="p-8 text-center">
                    <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No tienes citas próximas</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {upcomingAppointments.map((apt) => (
                    <Card key={apt.id} className="border-border hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                              {(apt as any).userName?.charAt(0) ?? "U"}
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{(apt as any).userName ?? `Usuario #${apt.userId}`}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(apt.appointmentDate), "d MMM yyyy 'a las' HH:mm", { locale: es })}
                                </span>
                                <span className="text-xs text-muted-foreground">· {apt.durationMinutes} min</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {apt.videoCallLink && (
                              <a href={apt.videoCallLink} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" className="gradient-brand text-white border-0 h-8 text-xs">
                                  <Video className="w-3 h-3 mr-1" />
                                  Unirse
                                  <ExternalLink className="w-3 h-3 ml-1" />
                                </Button>
                              </a>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => completeMutation.mutate({ appointmentId: apt.id })}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Completar
                            </Button>
                          </div>
                        </div>
                        {apt.notes && (
                          <p className="text-xs text-muted-foreground mt-3 p-2 bg-muted rounded-lg">
                            <strong>Notas:</strong> {apt.notes}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {pastAppointments.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "Poppins, sans-serif" }}>
                  Historial
                </h2>
                <div className="space-y-2">
                  {pastAppointments.slice(0, 5).map((apt) => (
                    <Card key={apt.id} className="border-border opacity-80">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-sm font-bold">
                              {(apt as any).userName?.charAt(0) ?? "U"}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{(apt as any).userName ?? `Usuario #${apt.userId}`}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(apt.appointmentDate), "d MMM yyyy", { locale: es })}
                              </p>
                            </div>
                          </div>
                          <Badge className={statusColors[apt.status] + " border-0 text-xs"}>
                            {statusLabels[apt.status]}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Disponibilidad */}
        {activeTab === "disponibilidad" && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "Poppins, sans-serif" }}>
                Configurar disponibilidad
              </h2>
              <p className="text-muted-foreground text-sm">
                Define los días y horarios semanales en que estás disponible para atender consultas.
              </p>
            </div>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Horarios actuales</CardTitle>
              </CardHeader>
              <CardContent>
                {!availability || availability.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    No has configurado horarios aún
                  </p>
                ) : (
                  <div className="space-y-2">
                    {availability.map((slot) => (
                      <div key={slot.id} className="flex items-center justify-between p-3 bg-primary/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center text-white text-xs font-bold">
                            {DAYS[slot.dayOfWeek]?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{DAYS[slot.dayOfWeek]}</p>
                            <p className="text-xs text-muted-foreground">{slot.startTime} - {slot.endTime}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
                          onClick={() => removeAvailabilityMutation.mutate({ id: slot.id })}
                          disabled={removeAvailabilityMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" />
                  Agregar horario
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Día</label>
                    <select
                      value={newSlot.dayOfWeek}
                      onChange={(e) => setNewSlot({ ...newSlot, dayOfWeek: parseInt(e.target.value) })}
                      className="w-full rounded-lg border border-border p-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {DAYS.map((day, i) => (
                        <option key={i} value={i}>{day}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Hora inicio</label>
                    <input
                      type="time"
                      value={newSlot.startTime}
                      onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                      className="w-full rounded-lg border border-border p-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Hora fin</label>
                    <input
                      type="time"
                      value={newSlot.endTime}
                      onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                      className="w-full rounded-lg border border-border p-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => addAvailabilityMutation.mutate(newSlot)}
                  disabled={addAvailabilityMutation.isPending}
                  className="gradient-brand text-white border-0"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar horario
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab: Días libres */}
        {activeTab === "dias-libres" && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "Poppins, sans-serif" }}>
                Días libres y vacaciones
              </h2>
              <p className="text-muted-foreground text-sm">
                Bloquea fechas específicas en las que no estarás disponible. Los pacientes no podrán agendar citas en estos días.
              </p>
            </div>

            {/* Agregar día bloqueado */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarX className="w-4 h-4 text-primary" />
                  Bloquear fecha
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium mb-1 block">Fecha</Label>
                    <input
                      type="date"
                      value={newBlockedDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setNewBlockedDate(e.target.value)}
                      className="w-full rounded-lg border border-border p-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1 block">Motivo (opcional)</Label>
                    <Input
                      placeholder="Ej: Vacaciones, cita médica..."
                      value={newBlockedReason}
                      onChange={(e) => setNewBlockedReason(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  onClick={() => {
                    if (!newBlockedDate) {
                      toast.error("Selecciona una fecha");
                      return;
                    }
                    addBlockedDayMutation.mutate({ blockedDate: newBlockedDate, reason: newBlockedReason || undefined });
                  }}
                  disabled={addBlockedDayMutation.isPending}
                  className="gradient-brand text-white border-0"
                >
                  <CalendarX className="w-4 h-4 mr-2" />
                  Bloquear día
                </Button>
              </CardContent>
            </Card>

            {/* Lista de días bloqueados */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Fechas bloqueadas</CardTitle>
              </CardHeader>
              <CardContent>
                {!blockedDays || blockedDays.length === 0 ? (
                  <div className="text-center py-6">
                    <CalendarX className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No tienes fechas bloqueadas</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {blockedDays
                      .sort((a, b) => a.blockedDate.localeCompare(b.blockedDate))
                      .map((day) => (
                        <div key={day.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                              <CalendarX className="w-4 h-4 text-red-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-red-700">
                                {format(new Date(day.blockedDate + "T12:00:00"), "EEEE d 'de' MMMM yyyy", { locale: es })}
                              </p>
                              {day.reason && (
                                <p className="text-xs text-red-500">{day.reason}</p>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-100"
                            onClick={() => removeBlockedDayMutation.mutate({ id: day.id })}
                            disabled={removeBlockedDayMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab: Reseñas */}
        {activeTab === "resenas" && (
          <div className="space-y-6 max-w-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "Poppins, sans-serif" }}>
                  Mis reseñas
                </h2>
                <p className="text-muted-foreground text-sm">
                  Opiniones de tus pacientes sobre tus sesiones.
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-primary">{profile.averageRating ?? "—"}</p>
                <div className="flex items-center gap-0.5 justify-end mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${star <= Math.round(Number(profile.averageRating ?? 0)) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{profile.totalReviews ?? 0} reseñas</p>
              </div>
            </div>

            {!myReviews || myReviews.length === 0 ? (
              <Card className="border-border border-dashed">
                <CardContent className="p-10 text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="font-medium text-muted-foreground">Aún no tienes reseñas</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Las reseñas aparecerán aquí cuando tus pacientes califiquen sus sesiones.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {myReviews.map((review) => (
                  <Card key={review.id} className="border-border">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {(review as any).userName?.charAt(0) ?? "U"}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{(review as any).userName ?? "Paciente"}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(review.createdAt), "d 'de' MMMM yyyy", { locale: es })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${star <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                          "{review.comment}"
                        </p>
                      )}
                      {review.isVerified && (
                        <div className="flex items-center gap-1 mt-2">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span className="text-xs text-emerald-600">Sesión verificada</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Perfil */}
        {activeTab === "perfil" && (
          <div className="max-w-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
                Mi perfil profesional
              </h2>
              {!editingProfile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setProfileForm({
                      name: user?.name ?? "",
                      bio: profile.bio ?? "",
                      education: profile.education ?? "",
                      certifications: profile.certifications ?? "",
                      yearsOfExperience: profile.yearsOfExperience?.toString() ?? "",
                      hourlyRate: profile.hourlyRate?.toString() ?? "",
                      languages: (profile as any).languages ?? "Español",
                    });
                    setEditingProfile(true);
                  }}
                >
                  Editar perfil
                </Button>
              )}
            </div>

            {editingProfile ? (
              <Card className="border-border">
                <CardContent className="p-6 space-y-4">
                  <div>
                    <Label className="text-xs">Nombre completo</Label>
                    <Input
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      placeholder="Tu nombre completo"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Años de experiencia</Label>
                      <Input
                        type="number"
                        value={profileForm.yearsOfExperience}
                        onChange={(e) => setProfileForm({ ...profileForm, yearsOfExperience: e.target.value })}
                        placeholder="5"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Tarifa por hora (MXN)</Label>
                      <Input
                        type="number"
                        value={profileForm.hourlyRate}
                        onChange={(e) => setProfileForm({ ...profileForm, hourlyRate: e.target.value })}
                        placeholder="800"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Idiomas</Label>
                    <Input
                      value={profileForm.languages}
                      onChange={(e) => setProfileForm({ ...profileForm, languages: e.target.value })}
                      placeholder="Español, Inglés"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Biografía</Label>
                    <Textarea
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                      placeholder="Cuéntanos sobre ti y tu experiencia..."
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Educación</Label>
                    <Textarea
                      value={profileForm.education}
                      onChange={(e) => setProfileForm({ ...profileForm, education: e.target.value })}
                      placeholder="Universidad, carrera, año de graduación..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Certificaciones</Label>
                    <Textarea
                      value={profileForm.certifications}
                      onChange={(e) => setProfileForm({ ...profileForm, certifications: e.target.value })}
                      placeholder="Certificaciones y cursos relevantes..."
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={() => updateProfileMutation.mutate({
                        ...profileForm,
                        yearsOfExperience: profileForm.yearsOfExperience ? parseInt(profileForm.yearsOfExperience) : undefined,
                      })}
                      disabled={updateProfileMutation.isPending}
                      className="gradient-brand text-white border-0"
                    >
                      {updateProfileMutation.isPending ? "Guardando..." : "Guardar cambios"}
                    </Button>
                    <Button variant="outline" onClick={() => setEditingProfile(false)}>
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border">
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Cédula profesional</p>
                      <p className="font-medium">{profile.licenseNumber}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Años de experiencia</p>
                      <p className="font-medium">{profile.yearsOfExperience ?? "No especificado"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Tarifa por hora</p>
                      <p className="font-medium">{profile.hourlyRate ? `$${profile.hourlyRate} MXN` : "No especificada"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Estado</p>
                      <Badge className={`border-0 text-xs ${profile.status === "approved" ? "bg-emerald-100 text-emerald-700" : profile.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                        {profile.status === "approved" ? "Aprobado" : profile.status === "pending" ? "Pendiente" : "Rechazado"}
                      </Badge>
                    </div>
                  </div>
                  {profile.bio && (
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Biografía</p>
                      <p className="text-sm">{profile.bio}</p>
                    </div>
                  )}
                  {profile.education && (
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Educación</p>
                      <p className="text-sm">{profile.education}</p>
                    </div>
                  )}
                  {profile.certifications && (
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Certificaciones</p>
                      <p className="text-sm">{profile.certifications}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
