import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Users, CheckCircle2, XCircle, Clock, Shield, Plus,
  Settings, BarChart3, Award,
} from "lucide-react";

export default function AdminDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<"profesionales" | "especialidades" | "planes">("profesionales");
  const [rejectReason, setRejectReason] = useState<Record<number, string>>({});
  const [newSpecialty, setNewSpecialty] = useState({ name: "", description: "" });
  const [newPlan, setNewPlan] = useState({
    name: "", price: "", billingPeriod: "monthly" as "monthly" | "yearly",
    maxAppointmentsPerMonth: "", maxMinutesPerAppointment: "",
    description: "",
  });

  const { data: pendingProfessionals, refetch: refetchPending, isLoading: loadingPending } =
    trpc.admin.getPendingProfessionals.useQuery(undefined, { enabled: isAuthenticated });

  const { data: specialties, refetch: refetchSpecialties } = trpc.specialty.getAll.useQuery();
  const { data: plans, refetch: refetchPlans } = trpc.subscriptionPlan.getAll.useQuery();

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

      {/* Stats */}
      <div className="border-b border-border bg-background">
        <div className="container py-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-yellow-600">{pendingProfessionals?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Pendientes de aprobación</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Award className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold text-primary">{specialties?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Especialidades</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-emerald-600">{plans?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Planes activos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-background sticky top-0 z-10">
        <div className="container">
          <div className="flex gap-1">
            {[
              { key: "profesionales", label: "Profesionales", icon: <Users className="w-4 h-4" /> },
              { key: "especialidades", label: "Especialidades", icon: <Award className="w-4 h-4" /> },
              { key: "planes", label: "Planes", icon: <Settings className="w-4 h-4" /> },
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
                {tab.key === "profesionales" && (pendingProfessionals?.length ?? 0) > 0 && (
                  <Badge className="gradient-brand text-white border-0 text-xs px-1.5 py-0 h-5">
                    {pendingProfessionals?.length}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Tab: Profesionales */}
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
                {pendingProfessionals?.map((pro) => (
                  <Card key={pro.id} className="border-border hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                            P
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold">Profesional #{pro.id}</h3>
                              <Badge className="bg-yellow-100 text-yellow-700 border-0 text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                Pendiente
                              </Badge>
                            </div>
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
                            {pro.bio && (
                              <p className="text-sm text-muted-foreground line-clamp-2 max-w-lg">
                                {pro.bio}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                            onClick={() => approveMutation.mutate({ professionalId: pro.id })}
                            disabled={approveMutation.isPending}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Aprobar
                          </Button>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Motivo de rechazo..."
                              value={rejectReason[pro.id] ?? ""}
                              onChange={(e) => setRejectReason({ ...rejectReason, [pro.id]: e.target.value })}
                              className="text-xs rounded-lg border border-border p-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 w-36"
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
                    </CardContent>
                  </Card>
                ))}
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
