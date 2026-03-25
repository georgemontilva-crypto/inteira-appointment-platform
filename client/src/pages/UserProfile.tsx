import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import DashboardLayout from "../components/DashboardLayout";
import { toast } from "sonner";
import {
  User, Phone, FileText, Save, Shield, Wallet,
  Calendar, Star,
} from "lucide-react";

export default function UserProfile() {
  const { isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();

  const { data: profile, isLoading: loadingProfile } = trpc.user.getProfile.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: subscription } = trpc.user.getSubscription.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: wallet } = trpc.user.getWallet.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: appointments } = trpc.user.getAppointments.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setPhone(profile.phone ?? "");
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  const updateMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil actualizado correctamente");
      utils.user.getProfile.invalidate();
      setIsDirty(false);
    },
    onError: () => toast.error("Error al actualizar el perfil"),
  });

  const handleSave = () => {
    updateMutation.mutate({ name, phone, bio });
  };

  const completedAppointments = appointments?.filter((a) => a.status === "completed").length ?? 0;
  const upcomingAppointments = appointments?.filter((a) => a.status === "scheduled").length ?? 0;

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
        <Card className="max-w-sm w-full mx-4">
          <CardContent className="p-8 text-center space-y-4">
            <User className="w-12 h-12 text-primary mx-auto" />
            <h2 className="text-xl font-bold">Inicia sesión para ver tu perfil</h2>
            <a href={getLoginUrl()}>
              <Button className="w-full gradient-brand text-white border-0">Iniciar sesión</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="container py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {profile?.name?.charAt(0)?.toUpperCase() ?? "U"}
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
              {profile?.name ?? "Mi perfil"}
            </h1>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
          </div>
        </div>
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Edit form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="w-5 h-5 text-primary" />
                  Información personal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Nombre completo</label>
                  <Input
                    value={name}
                    onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
                    placeholder="Tu nombre completo"
                    className="border-border focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); setIsDirty(true); }}
                      placeholder="+52 55 0000 0000"
                      className="pl-9 border-border focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Sobre mí (opcional)</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <textarea
                      value={bio}
                      onChange={(e) => { setBio(e.target.value); setIsDirty(true); }}
                      placeholder="Cuéntanos un poco sobre ti..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary min-h-[100px] bg-background"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    onClick={handleSave}
                    disabled={!isDirty || updateMutation.isPending}
                    className="gradient-brand text-white border-0 gap-2"
                  >
                    {updateMutation.isPending ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Guardar cambios
                  </Button>
                  {isDirty && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setName(profile?.name ?? "");
                        setPhone(profile?.phone ?? "");
                        setBio(profile?.bio ?? "");
                        setIsDirty(false);
                      }}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Account info (read-only) */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="w-5 h-5 text-primary" />
                  Información de cuenta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Correo electrónico</span>
                  <span className="text-sm font-medium">{profile?.email}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Rol</span>
                  <Badge className="bg-primary/10 text-primary border-0 capitalize">
                    {profile?.role ?? "usuario"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">Miembro desde</span>
                  <span className="text-sm font-medium">
                    {profile?.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString("es-MX", { year: "numeric", month: "long" })
                      : "—"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  El correo electrónico está vinculado a tu cuenta de Manus y no puede modificarse aquí.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar: stats */}
          <div className="space-y-4">
            {/* Wallet */}
            <Card className="border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Saldo disponible</p>
                    <p className="text-xl font-bold text-primary">
                      {(wallet?.balance ?? 0).toLocaleString("es-MX")}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Equivale a ${((wallet?.balance ?? 0)).toLocaleString("es-MX")} MXN
                </p>
                <Link href="/wallet">
                  <Button variant="outline" size="sm" className="w-full border-primary/30 text-primary text-xs">
                    Ver mi wallet
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Subscription */}
            <Card className="border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Star className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Plan activo</p>
                    <p className="text-sm font-bold">
                      {(subscription as any)?.planName ?? "Sin plan"}
                    </p>
                  </div>
                </div>
                <Link href="/suscripcion">
                  <Button variant="outline" size="sm" className="w-full border-primary/30 text-primary text-xs">
                    Gestionar suscripción
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className="border-border">
              <CardContent className="p-5 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actividad</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Próximas citas</span>
                  </div>
                  <span className="font-bold text-primary">{upcomingAppointments}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="w-4 h-4 text-accent" />
                    <span className="text-muted-foreground">Consultas completadas</span>
                  </div>
                  <span className="font-bold">{completedAppointments}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
