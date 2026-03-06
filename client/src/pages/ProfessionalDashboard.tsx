import { useState } from "react";
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
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "wouter";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

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
  const { user, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<"citas" | "disponibilidad" | "perfil">("citas");
  const [newSlot, setNewSlot] = useState({ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" });
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    bio: "", education: "", certifications: "",
    yearsOfExperience: "", hourlyRate: "", languages: "Español",
  });

  const { data: profile, isLoading: loadingProfile, refetch: refetchProfile } = trpc.professional.getProfile.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: appointments, isLoading: loadingAppointments, refetch: refetchAppointments } = trpc.professional.getAppointments.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: availability, refetch: refetchAvailability } = trpc.professional.getAvailability.useQuery(
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

  const updateProfileMutation = trpc.professional.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil actualizado correctamente");
      setEditingProfile(false);
      refetchProfile();
    },
    onError: (err) => toast.error(err.message ?? "Error al actualizar perfil"),
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
      <div className="gradient-hero text-white py-8">
        <div className="container">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0">
                {profile.profilePhoto ? (
                  <img src={profile.profilePhoto} alt={user?.name ?? "Profesional"} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                    {user?.name?.charAt(0) ?? "P"}
                  </div>
                )}
              </div>
              <div>
                <p className="text-white/70 text-sm">Panel del profesional</p>
                <h1 className="text-2xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
                  {user?.name ?? "Profesional"}
                </h1>
              </div>
            </div>
            <Badge className={`border-0 ${profile.status === "approved" ? "bg-emerald-500/20 text-emerald-200" : profile.status === "pending" ? "bg-yellow-500/20 text-yellow-200" : "bg-red-500/20 text-red-200"}`}>
              {profile.status === "approved" ? "✓ Aprobado" : profile.status === "pending" ? "⏳ Pendiente de aprobación" : "✗ Rechazado"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-background sticky top-0 z-10">
        <div className="container">
          <div className="flex gap-1">
            {[
              { key: "citas", label: "Mis citas", icon: <Calendar className="w-4 h-4" /> },
              { key: "disponibilidad", label: "Disponibilidad", icon: <Clock className="w-4 h-4" /> },
              { key: "perfil", label: "Mi perfil", icon: <User className="w-4 h-4" /> },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Tab: Citas */}
        {activeTab === "citas" && (
          <div className="space-y-6">
            {/* Stats */}
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

            {/* Upcoming */}
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
                              U
                            </div>
                            <div>
                              <p className="font-semibold text-sm">Usuario #{apt.userId}</p>
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

            {/* Past appointments */}
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
                              U
                            </div>
                            <div>
                              <p className="text-sm font-medium">Usuario #{apt.userId}</p>
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
                Define los días y horarios en que estás disponible para atender consultas.
              </p>
            </div>

            {/* Current availability */}
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
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add new slot */}
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

        {/* Tab: Perfil */}
        {activeTab === "perfil" && (
          <div className="max-w-2xl space-y-6">
            <h2 className="text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
              Mi perfil profesional
            </h2>
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
          </div>
        )}
      </div>
    </div>
  );
}
