import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  Calendar,
  Video,
  Star,
  Clock,
  ChevronRight,
  Plus,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getLoginUrl } from "@/const";

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
  const { user, isAuthenticated, loading, logout } = useAuth();
  const { data: appointments, isLoading: loadingAppointments } = trpc.user.getAppointments.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: subscription, isLoading: loadingSubscription } = trpc.user.getSubscription.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-hero text-white py-8">
        <div className="container">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">
                {user?.name?.charAt(0) ?? "U"}
              </div>
              <div>
                <p className="text-white/70 text-sm">Bienvenido de vuelta</p>
                <h1 className="text-2xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
                  {user?.name ?? "Usuario"}
                </h1>
              </div>
            </div>
            <Link href="/especialidades">
              <Button className="bg-white text-primary hover:bg-white/90 font-semibold">
                <Plus className="w-4 h-4 mr-2" />
                Nueva cita
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{upcomingAppointments.length}</p>
                  <p className="text-xs text-muted-foreground">Próximas citas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">
                    {(appointments as Apt[] | undefined)?.filter((a) => a.status === "completed").length ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Completadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-bold text-accent">
                    {subscription ? `Plan #${subscription.planId}` : "Sin plan"}
                  </p>
                  <p className="text-xs text-muted-foreground">Plan activo</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Star className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {subscription?.appointmentsUsedThisMonth ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Citas este mes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upcoming appointments */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
                Próximas citas
              </h2>
              <Link href="/mis-citas">
                <Button variant="ghost" size="sm" className="text-primary">
                  Ver todas <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>

            {loadingAppointments ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Card key={i} className="border-border animate-pulse">
                    <CardContent className="p-5 h-20" />
                  </Card>
                ))}
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <Card className="border-border border-dashed">
                <CardContent className="p-8 text-center">
                  <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">No tienes citas próximas</p>
                  <p className="text-sm text-muted-foreground mt-1">Agenda tu primera consulta con un especialista</p>
                  <Link href="/especialidades">
                    <Button className="mt-4 gradient-brand text-white border-0" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Agendar cita
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.slice(0, 3).map((apt) => (
                  <Card key={apt.id} className="border-border hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                            P
                          </div>
                          <div>
                            <p className="font-semibold text-sm">Especialista #{apt.professionalId}</p>
                            <p className="text-xs text-muted-foreground">Especialidad #{apt.specialtyId}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(apt.appointmentDate), "d MMM yyyy 'a las' HH:mm", { locale: es })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={statusColors[apt.status] + " border-0 text-xs"}>
                            {statusLabels[apt.status]}
                          </Badge>
                          {apt.videoCallLink && (
                            <a href={apt.videoCallLink} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" className="gradient-brand text-white border-0 h-7 text-xs px-3">
                                <Video className="w-3 h-3 mr-1" />
                                Unirse
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Past appointments */}
            {pastAppointments.length > 0 && (
              <>
                <h2 className="text-xl font-bold pt-4" style={{ fontFamily: "Poppins, sans-serif" }}>
                  Historial de citas
                </h2>
                <div className="space-y-3">
                  {pastAppointments.slice(0, 3).map((apt) => (
                    <Card key={apt.id} className="border-border opacity-80">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground font-bold text-sm flex-shrink-0">
                              P
                            </div>
                            <div>
                              <p className="font-medium text-sm">Especialista #{apt.professionalId}</p>
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
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Subscription card */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  Mi suscripción
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingSubscription ? (
                  <div className="animate-pulse h-20 bg-muted rounded-lg" />
                ) : subscription ? (
                  <>
                    <div className="p-4 rounded-xl gradient-brand text-white">
                      <p className="text-white/70 text-xs mb-1">Plan activo</p>
                      <p className="text-xl font-bold">Plan #{subscription.planId}</p>
                      <p className="text-white/70 text-xs mt-1">
                        Vence: {subscription.endDate
                          ? format(new Date(subscription.endDate), "d MMM yyyy", { locale: es })
                          : "Sin vencimiento"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Citas usadas este mes</span>
                        <span className="font-medium">{subscription.appointmentsUsedThisMonth ?? 0}</span>
                      </div>
                    </div>
                    <Link href="/suscripcion">
                      <Button variant="outline" size="sm" className="w-full border-primary/30 text-primary hover:bg-primary/5">
                        Gestionar plan
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="p-4 rounded-xl bg-muted text-center">
                      <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium">Sin plan activo</p>
                      <p className="text-xs text-muted-foreground mt-1">Elige un plan para agendar citas</p>
                    </div>
                    <Link href="/planes">
                      <Button className="w-full gradient-brand text-white border-0" size="sm">
                        Ver planes disponibles
                      </Button>
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quick actions */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Acciones rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/especialidades">
                  <Button variant="ghost" className="w-full justify-start text-sm h-9 hover:bg-primary/5 hover:text-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Agendar nueva cita
                  </Button>
                </Link>
                <Link href="/mis-citas">
                  <Button variant="ghost" className="w-full justify-start text-sm h-9 hover:bg-primary/5 hover:text-primary">
                    <Calendar className="w-4 h-4 mr-2" />
                    Ver mis citas
                  </Button>
                </Link>
                <Link href="/perfil">
                  <Button variant="ghost" className="w-full justify-start text-sm h-9 hover:bg-primary/5 hover:text-primary">
                    <User className="w-4 h-4 mr-2" />
                    Editar perfil
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
