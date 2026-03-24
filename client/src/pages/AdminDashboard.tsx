import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Users, CheckCircle2, XCircle, Clock, Shield, Plus,
  Settings, BarChart3, Award, TrendingUp, Calendar,
  Star, Activity, CreditCard, UserCheck, RefreshCw, Wrench,
  ChevronDown, ChevronUp, FileText, ExternalLink,
} from "lucide-react";

// ─── Simple bar chart ────────────────────────────────────────────────────────
function MiniBarChart({ data }: { data: { day: string; total: number; completed: number; canceled: number }[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
        Sin datos en los últimos 30 días
      </div>
    );
  }
  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const visible = data.slice(-14);
  return (
    <div className="flex items-end gap-1 h-32 w-full">
      {visible.map((d) => {
        const heightPct = Math.round((d.total / maxVal) * 100);
        const completedPct = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0;
        return (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className="w-full rounded-t-sm bg-primary/20 overflow-hidden flex flex-col justify-end"
              style={{ height: `${Math.max(heightPct, 4)}%` }}
              title={`${d.day}: ${d.total} citas`}
            >
              <div className="w-full bg-primary rounded-t-sm" style={{ height: `${completedPct}%` }} />
            </div>
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] rounded px-1.5 py-0.5 shadow whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
              {format(new Date(d.day), "d MMM", { locale: es })}: {d.total}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  scheduled:  { label: "Agendada",   cls: "bg-blue-100 text-blue-700" },
  completed:  { label: "Completada", cls: "bg-emerald-100 text-emerald-700" },
  canceled:   { label: "Cancelada",  cls: "bg-red-100 text-red-700" },
  "no-show":  { label: "No asistió", cls: "bg-gray-100 text-gray-600" },
};

export default function AdminDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "profesionales" | "especialidades" | "planes" | "herramientas">("overview");
  const [rejectReason, setRejectReason] = useState<Record<number, string>>({});
  const [tierSelect, setTierSelect] = useState<Record<number, "basic" | "pro">>({});
  const [expandedBio, setExpandedBio] = useState<Record<number, boolean>>({});
  const [newSpecialty, setNewSpecialty] = useState({ name: "", description: "" });
  const [newPlan, setNewPlan] = useState({
    name: "", price: "", billingPeriod: "monthly" as "monthly" | "yearly",
    maxAppointmentsPerMonth: "", maxMinutesPerAppointment: "",
    description: "",
  });

  const { data: pendingProfessionals, refetch: refetchPending, isLoading: loadingPending } =
    trpc.admin.getPendingProfessionals.useQuery(undefined, {
      enabled: isAuthenticated,
      refetchInterval: 30000, // refresca cada 30 segundos
    });
  const { data: specialties, refetch: refetchSpecialties } = trpc.specialty.getAll.useQuery();
  const { data: plans, refetch: refetchPlans } = trpc.subscriptionPlan.getAll.useQuery();
  const { data: metrics } = trpc.admin.getMetrics.useQuery(undefined, { enabled: isAuthenticated });
  const { data: chartData } = trpc.admin.getAppointmentsByDay.useQuery({ days: 30 }, { enabled: isAuthenticated });
  const { data: recentAppointments } = trpc.admin.getRecentAppointments.useQuery({ limit: 8 }, { enabled: isAuthenticated });
  const { data: topProfessionals } = trpc.admin.getTopProfessionals.useQuery({ limit: 5 }, { enabled: isAuthenticated });

  const approveMutation = trpc.admin.approveProfessional.useMutation({
    onSuccess: () => {
      refetchPending();
      toast.success("Profesional aprobado exitosamente");
    },
    onError: () => toast.error("Error al aprobar el profesional"),
  });

  const rejectMutation = trpc.admin.rejectProfessional.useMutation({
    onSuccess: () => {
      refetchPending();
      toast.success("Profesional rechazado");
    },
    onError: () => toast.error("Error al rechazar el profesional"),
  });

  const createSpecialtyMutation = trpc.specialty.create.useMutation({
    onSuccess: () => {
      refetchSpecialties();
      setNewSpecialty({ name: "", description: "" });
      toast.success("Especialidad creada");
    },
    onError: () => toast.error("Error al crear la especialidad"),
  });

  const cronMutation = trpc.admin.runCronJobs.useMutation({
    onSuccess: (data) => toast.success(data.message),
    onError: () => toast.error("Error al ejecutar cron jobs"),
  });

  const createPlanMutation = trpc.subscriptionPlan.create.useMutation({
    onSuccess: () => {
      refetchPlans();
      setNewPlan({ name: "", price: "", billingPeriod: "monthly", maxAppointmentsPerMonth: "", maxMinutesPerAppointment: "", description: "" });
      toast.success("Plan creado");
    },
    onError: () => toast.error("Error al crear el plan"),
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

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-sm w-full mx-4">
          <CardContent className="p-8 text-center space-y-4">
            <Shield className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold">Acceso denegado</h2>
            <p className="text-muted-foreground text-sm">No tienes permisos de administrador.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-hero text-white py-8">
        <div className="container">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Panel de administración</p>
              <h1 className="text-2xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
                Inteira Admin
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="border-b border-border bg-card">
        <div className="container py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: <Users className="w-4 h-4 text-blue-600" />, bg: "bg-blue-100", value: metrics?.totalUsers ?? "—", label: "Usuarios totales" },
              { icon: <UserCheck className="w-4 h-4 text-primary" />, bg: "bg-primary/10", value: metrics?.activeProfessionals ?? "—", label: "Profesionales activos" },
              { icon: <Calendar className="w-4 h-4 text-emerald-600" />, bg: "bg-emerald-100", value: metrics?.appointmentsToday ?? "—", label: "Citas hoy" },
              { icon: <CreditCard className="w-4 h-4 text-purple-600" />, bg: "bg-purple-100", value: metrics?.activeSubscriptions ?? "—", label: "Suscripciones activas" },
            ].map((kpi, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center flex-shrink-0`}>
                  {kpi.icon}
                </div>
                <div>
                  <p className="text-lg font-bold leading-tight">{kpi.value}</p>
                  <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-background sticky top-0 z-10">
        <div className="container">
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {([
              { key: "overview",        label: "Resumen",        icon: <BarChart3 className="w-4 h-4" /> },
              { key: "profesionales",   label: "Profesionales",  icon: <Users className="w-4 h-4" /> },
              { key: "especialidades",  label: "Especialidades", icon: <Award className="w-4 h-4" /> },
              { key: "planes",          label: "Planes",         icon: <Settings className="w-4 h-4" /> },
      { key: "herramientas",    label: "Herramientas",   icon: <Wrench className="w-4 h-4" /> },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.key === "profesionales" && (pendingProfessionals?.length ?? 0) > 0 && (
                  <Badge className="bg-yellow-500 text-white border-0 text-[10px] h-4 px-1 ml-0.5">
                    {pendingProfessionals!.length}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-6 space-y-6">

        {/* ══ TAB: OVERVIEW ══════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="border-border">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Citas este mes</p>
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-3xl font-bold text-primary" style={{ fontFamily: "Poppins" }}>
                    {metrics?.appointmentsMonth ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{metrics?.completedMonth ?? 0} completadas</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Nuevos usuarios</p>
                    <Activity className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-3xl font-bold text-blue-600" style={{ fontFamily: "Poppins" }}>
                    {metrics?.newUsersMonth ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Este mes</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Pendientes aprobación</p>
                    <Clock className="w-4 h-4 text-yellow-500" />
                  </div>
                  <p className="text-3xl font-bold text-yellow-600" style={{ fontFamily: "Poppins" }}>
                    {pendingProfessionals?.length ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Profesionales en revisión</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Citas por día — últimos 30 días
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground">Verde oscuro = completadas · Verde claro = total</p>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <MiniBarChart data={chartData ?? []} />
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    Top profesionales por calificación
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pb-4">
                  {(topProfessionals ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin calificaciones aún</p>
                  ) : (
                    (topProfessionals ?? []).map((p, i) => (
                      <div key={p.professionalId} className="flex items-center gap-3">
                        <span className="w-5 text-xs text-muted-foreground font-mono text-right">{i + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name ?? `Profesional #${p.professionalId}`}</p>
                          <p className="text-[11px] text-muted-foreground">{p.totalReviews} reseñas</p>
                        </div>
                        <div className="flex items-center gap-1 text-yellow-500">
                          <Star className="w-3.5 h-3.5 fill-yellow-400" />
                          <span className="text-sm font-bold">{p.avgRating}</span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Citas recientes
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {(recentAppointments ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin citas registradas</p>
                ) : (
                  <div className="space-y-2">
                    {(recentAppointments ?? []).map((apt) => {
                      const s = STATUS_MAP[apt.status] ?? { label: apt.status, cls: "bg-muted text-muted-foreground" };
                      return (
                        <div key={apt.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              Cita #{apt.id} · Usuario #{apt.userId} → Profesional #{apt.professionalId}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {format(new Date(apt.appointmentDate), "d MMM yyyy, HH:mm", { locale: es })}
                            </p>
                          </div>
                          <Badge className={`${s.cls} border-0 text-[10px]`}>{s.label}</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ══ TAB: PROFESIONALES ═════════════════════════════════════════════ */}
        {activeTab === "profesionales" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
              Solicitudes de profesionales
            </h2>

            {loadingPending ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse border-border">
                    <CardContent className="p-6 h-28" />
                  </Card>
                ))}
              </div>
            ) : pendingProfessionals?.length === 0 ? (
              <Card className="border-border border-dashed">
                <CardContent className="p-10 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <p className="font-medium text-lg">Todo al día</p>
                  <p className="text-muted-foreground text-sm mt-1">No hay solicitudes pendientes de revisión</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingProfessionals?.map((pro) => {
                  const selectedTier = tierSelect[pro.id] ?? "basic";
                  const isBioExpanded = expandedBio[pro.id] ?? false;
                  const avatar = (pro as any).userProfileImage || pro.profilePhoto;
                  const name = (pro as any).userName ?? `Profesional #${pro.id}`;
                  const email = (pro as any).userEmail;
                  const specialtyName = (pro as any).specialtyName;

                  return (
                    <Card key={pro.id} className="border-border hover:shadow-md transition-shadow">
                      <CardContent className="p-6 space-y-4">
                        {/* ── Fila superior: avatar + info + acciones ── */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            {/* Avatar */}
                            {avatar ? (
                              <img
                                src={avatar}
                                alt={name}
                                className="w-14 h-14 rounded-2xl object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                                {name.charAt(0).toUpperCase()}
                              </div>
                            )}

                            {/* Info */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold">{name}</h3>
                                <Badge className="bg-yellow-100 text-yellow-700 border-0 text-xs">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Pendiente
                                </Badge>
                                {specialtyName && (
                                  <Badge variant="outline" className="text-xs">{specialtyName}</Badge>
                                )}
                              </div>
                              {email && (
                                <p className="text-sm text-muted-foreground">{email}</p>
                              )}
                              <p className="text-sm text-muted-foreground">
                                Cédula: <span className="font-medium text-foreground">{pro.licenseNumber}</span>
                              </p>
                              {pro.yearsOfExperience && (
                                <p className="text-sm text-muted-foreground">
                                  Experiencia: <span className="font-medium text-foreground">{pro.yearsOfExperience} años</span>
                                </p>
                              )}
                              {pro.education && (
                                <p className="text-sm text-muted-foreground">
                                  Educación: <span className="font-medium text-foreground">{pro.education}</span>
                                </p>
                              )}
                              {(pro as any).createdAt && (
                                <p className="text-xs text-muted-foreground">
                                  Solicitud: {format(new Date((pro as any).createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* ── Acciones ── */}
                          <div className="flex flex-col gap-2 flex-shrink-0 min-w-[160px]">
                            {/* Selector de tier */}
                            <div className="flex gap-1">
                              <button
                                onClick={() => setTierSelect({ ...tierSelect, [pro.id]: "basic" })}
                                className={`flex-1 text-xs py-1.5 px-2 rounded-lg border transition-colors ${
                                  selectedTier === "basic"
                                    ? "bg-primary text-white border-primary"
                                    : "border-border text-muted-foreground hover:border-primary/40"
                                }`}
                              >
                                Básico
                              </button>
                              <button
                                onClick={() => setTierSelect({ ...tierSelect, [pro.id]: "pro" })}
                                className={`flex-1 text-xs py-1.5 px-2 rounded-lg border transition-colors ${
                                  selectedTier === "pro"
                                    ? "bg-primary text-white border-primary"
                                    : "border-border text-muted-foreground hover:border-primary/40"
                                }`}
                              >
                                Pro
                              </button>
                            </div>

                            {/* Botón Aprobar */}
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                              onClick={() => approveMutation.mutate({ professionalId: pro.id, tier: selectedTier })}
                              disabled={approveMutation.isPending}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Aprobar como {selectedTier === "pro" ? "Pro" : "Básico"}
                            </Button>

                            {/* Rechazar */}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Motivo de rechazo..."
                                value={rejectReason[pro.id] ?? ""}
                                onChange={(e) => setRejectReason({ ...rejectReason, [pro.id]: e.target.value })}
                                className="text-xs rounded-lg border border-border p-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 w-full"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-300 text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  if (!rejectReason[pro.id]) {
                                    toast.error("Ingresa un motivo de rechazo");
                                    return;
                                  }
                                  rejectMutation.mutate({
                                    professionalId: pro.id,
                                    reason: rejectReason[pro.id],
                                  });
                                }}
                                disabled={rejectMutation.isPending}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* ── Bio expandible ── */}
                        {pro.bio && (
                          <div>
                            <p className={`text-sm text-muted-foreground ${isBioExpanded ? "" : "line-clamp-2"}`}>
                              {pro.bio}
                            </p>
                            {pro.bio.length > 120 && (
                              <button
                                onClick={() => setExpandedBio({ ...expandedBio, [pro.id]: !isBioExpanded })}
                                className="text-xs text-primary mt-1 flex items-center gap-0.5"
                              >
                                {isBioExpanded
                                  ? <><ChevronUp className="w-3 h-3" /> Ver menos</>
                                  : <><ChevronDown className="w-3 h-3" /> Ver más</>
                                }
                              </button>
                            )}
                          </div>
                        )}

                        {/* ── Documentos ── */}
                        {(pro.licenseDocument || pro.certifications) && (
                          <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
                            {pro.licenseDocument && (
                              pro.licenseDocument.startsWith("http") ? (
                                <a
                                  href={pro.licenseDocument}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-primary border border-primary/30 rounded-lg px-2 py-1 hover:bg-primary/5"
                                >
                                  <FileText className="w-3 h-3" />
                                  Cédula profesional
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-lg px-2 py-1">
                                  <FileText className="w-3 h-3" />
                                  {pro.licenseDocument}
                                </span>
                              )
                            )}
                            {pro.certifications && (
                              pro.certifications.startsWith("http") ? (
                                <a
                                  href={pro.certifications}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-primary border border-primary/30 rounded-lg px-2 py-1 hover:bg-primary/5"
                                >
                                  <FileText className="w-3 h-3" />
                                  Certificaciones
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-lg px-2 py-1">
                                  <FileText className="w-3 h-3" />
                                  {pro.certifications}
                                </span>
                              )
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Especialidades */}
        {activeTab === "especialidades" && (
          <div className="space-y-6 max-w-2xl">
            <h2 className="text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
              Gestionar especialidades
            </h2>

            {/* Current specialties */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Especialidades actuales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(specialties ?? []).map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-primary/5 rounded-xl">
                      <span className="font-medium text-sm">{s.name}</span>
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Activa</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Add specialty */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" />
                  Nueva especialidad
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Nombre</label>
                  <input
                    type="text"
                    value={newSpecialty.name}
                    onChange={(e) => setNewSpecialty({ ...newSpecialty, name: e.target.value })}
                    placeholder="Ej: Dermatología"
                    className="w-full rounded-lg border border-border p-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Descripción</label>
                  <textarea
                    value={newSpecialty.description}
                    onChange={(e) => setNewSpecialty({ ...newSpecialty, description: e.target.value })}
                    placeholder="Descripción de la especialidad..."
                    className="w-full rounded-lg border border-border p-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[80px] resize-none"
                  />
                </div>
                <Button
                  onClick={() => createSpecialtyMutation.mutate(newSpecialty)}
                  disabled={!newSpecialty.name || createSpecialtyMutation.isPending}
                  className="gradient-brand text-white border-0"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear especialidad
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab: Herramientas */}
        {activeTab === "herramientas" && (
          <div className="space-y-6 max-w-2xl">
            <h2 className="text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
              Herramientas del sistema
            </h2>

            {/* Cron Jobs */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-primary" />
                  Cron Jobs manuales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-muted/40 rounded-xl">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Expirar créditos vencidos</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ejecuta el proceso de expiración de lotes de créditos que han superado su vigencia de 60 días.
                      Este proceso corre automáticamente cada hora, pero puedes ejecutarlo manualmente si es necesario.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="gradient-brand text-white border-0 flex-shrink-0"
                    onClick={() => cronMutation.mutate()}
                    disabled={cronMutation.isPending}
                  >
                    {cronMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Ejecutar
                      </>
                    )}
                  </Button>
                </div>
                {cronMutation.data && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{cronMutation.data.message}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(cronMutation.data.executedAt).toLocaleTimeString("es-MX")}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab: Planes */}
        {activeTab === "planes" && (
          <div className="space-y-6 max-w-3xl">
            <h2 className="text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
              Gestionar planes de suscripción
            </h2>

            {/* Current plans */}
            <div className="grid md:grid-cols-3 gap-4">
              {(plans ?? []).map((plan) => (
                <Card key={plan.id} className="border-border">
                  <CardContent className="p-5">
                    <h3 className="font-bold mb-1">{plan.name}</h3>
                    <p className="text-2xl font-bold text-primary mb-2">${plan.price} <span className="text-sm font-normal text-muted-foreground">MXN/mes</span></p>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>Citas/mes: {plan.maxAppointmentsPerMonth ?? "Ilimitadas"}</p>
                      <p>Min/cita: {plan.maxMinutesPerAppointment ?? "Sin límite"}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Add plan */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" />
                  Nuevo plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Nombre del plan</label>
                    <input
                      type="text"
                      value={newPlan.name}
                      onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                      placeholder="Ej: Empresarial"
                      className="w-full rounded-lg border border-border p-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Precio (MXN)</label>
                    <input
                      type="number"
                      value={newPlan.price}
                      onChange={(e) => setNewPlan({ ...newPlan, price: e.target.value })}
                      placeholder="499"
                      className="w-full rounded-lg border border-border p-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Citas por mes (vacío = ilimitadas)</label>
                    <input
                      type="number"
                      value={newPlan.maxAppointmentsPerMonth}
                      onChange={(e) => setNewPlan({ ...newPlan, maxAppointmentsPerMonth: e.target.value })}
                      placeholder="10"
                      className="w-full rounded-lg border border-border p-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Minutos por cita (vacío = sin límite)</label>
                    <input
                      type="number"
                      value={newPlan.maxMinutesPerAppointment}
                      onChange={(e) => setNewPlan({ ...newPlan, maxMinutesPerAppointment: e.target.value })}
                      placeholder="60"
                      className="w-full rounded-lg border border-border p-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Descripción</label>
                  <textarea
                    value={newPlan.description}
                    onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                    placeholder="Descripción del plan..."
                    className="w-full rounded-lg border border-border p-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[60px] resize-none"
                  />
                </div>
                <Button
                  onClick={() => createPlanMutation.mutate({
                    name: newPlan.name,
                    price: newPlan.price,
                    billingPeriod: newPlan.billingPeriod,
                    maxAppointmentsPerMonth: newPlan.maxAppointmentsPerMonth ? parseInt(newPlan.maxAppointmentsPerMonth) : undefined,
                    maxMinutesPerAppointment: newPlan.maxMinutesPerAppointment ? parseInt(newPlan.maxMinutesPerAppointment) : undefined,
                    description: newPlan.description || undefined,
                  })}
                  disabled={!newPlan.name || !newPlan.price || createPlanMutation.isPending}
                  className="gradient-brand text-white border-0"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear plan
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
