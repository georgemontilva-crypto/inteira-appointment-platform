import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import {
  Users, CheckCircle2, XCircle, Clock, Shield, Plus,
  Settings, BarChart3, Award, TrendingUp, Calendar,
  Star, Activity, CreditCard, UserCheck, RefreshCw, Wrench,
  ChevronDown, ChevronUp, FileText, ExternalLink, User,
  Trash2, Pencil, Stethoscope, Tag, Percent, ToggleLeft, ToggleRight,
  FolderOpen, X,
  // specialty icons
  Brain, Apple, Target, Leaf, Heart, Compass, Scale, DollarSign,
  Mic2, Sparkles, Sun, GraduationCap, Briefcase, Globe,
  HandHeart, Smile, BookOpen, HeartHandshake,
  // expanded icon set
  Pill, HeartPulse, Baby, PersonStanding, Dumbbell, Salad,
  Moon, Music, Palette, Microscope, FlaskConical, Bone,
  Eye, Ear, Hand, Frown, Laugh, MessageCircle, ShieldCheck,
  Sprout, TreePine, Waves, Wind, Flame, Snowflake, Coffee,
  Trophy, Lightbulb, Puzzle, BrainCircuit, Syringe, Zap,
  Sunset, HeartCrack, Bandage, Droplets, ShieldPlus,
  Footprints, Bike, Wheat, Carrot, Grape, Citrus,
  Feather, Flower, Flower2, TestTube,
} from "lucide-react";
import type React from "react";

// Icon registry — key is stored in DB, value is the React element
const SPECIALTY_ICON_MAP: Record<string, React.ReactNode> = {
  // Core wellness & mental health
  Brain:          <Brain className="w-5 h-5" />,
  BrainCircuit:   <BrainCircuit className="w-5 h-5" />,
  HeartPulse:     <HeartPulse className="w-5 h-5" />,
  Heart:          <Heart className="w-5 h-5" />,
  HeartHandshake: <HeartHandshake className="w-5 h-5" />,
  HeartCrack:     <HeartCrack className="w-5 h-5" />,
  Smile:          <Smile className="w-5 h-5" />,
  Frown:          <Frown className="w-5 h-5" />,
  Laugh:          <Laugh className="w-5 h-5" />,
  MessageCircle:  <MessageCircle className="w-5 h-5" />,
  // Medical & clinical
  Stethoscope:    <Stethoscope className="w-5 h-5" />,
  Pill:           <Pill className="w-5 h-5" />,
  Syringe:        <Syringe className="w-5 h-5" />,
  Microscope:     <Microscope className="w-5 h-5" />,
  FlaskConical:   <FlaskConical className="w-5 h-5" />,
  TestTube:       <TestTube className="w-5 h-5" />,
  Bone:           <Bone className="w-5 h-5" />,
  Eye:            <Eye className="w-5 h-5" />,
  Ear:            <Ear className="w-5 h-5" />,
  Hand:           <Hand className="w-5 h-5" />,
  Bandage:        <Bandage className="w-5 h-5" />,
  ShieldPlus:     <ShieldPlus className="w-5 h-5" />,
  ShieldCheck:    <ShieldCheck className="w-5 h-5" />,
  // Fitness & body
  Dumbbell:       <Dumbbell className="w-5 h-5" />,
  PersonStanding: <PersonStanding className="w-5 h-5" />,
  Bike:           <Bike className="w-5 h-5" />,
  Footprints:     <Footprints className="w-5 h-5" />,
  Activity:       <Activity className="w-5 h-5" />,
  Zap:            <Zap className="w-5 h-5" />,
  // Nutrition & food
  Apple:          <Apple className="w-5 h-5" />,
  Salad:          <Salad className="w-5 h-5" />,
  Wheat:          <Wheat className="w-5 h-5" />,
  Carrot:         <Carrot className="w-5 h-5" />,
  Grape:          <Grape className="w-5 h-5" />,
  Citrus:         <Citrus className="w-5 h-5" />,
  Coffee:         <Coffee className="w-5 h-5" />,
  Droplets:       <Droplets className="w-5 h-5" />,
  // Nature & mindfulness
  Leaf:           <Leaf className="w-5 h-5" />,
  Flower:         <Flower className="w-5 h-5" />,
  Flower2:        <Flower2 className="w-5 h-5" />,
  Sprout:         <Sprout className="w-5 h-5" />,
  TreePine:       <TreePine className="w-5 h-5" />,
  Feather:        <Feather className="w-5 h-5" />,
  Waves:          <Waves className="w-5 h-5" />,
  Wind:           <Wind className="w-5 h-5" />,
  Flame:          <Flame className="w-5 h-5" />,
  Snowflake:      <Snowflake className="w-5 h-5" />,
  Sun:            <Sun className="w-5 h-5" />,
  Moon:           <Moon className="w-5 h-5" />,
  Sunset:         <Sunset className="w-5 h-5" />,
  Baby:           <Baby className="w-5 h-5" />,
  // Education & professional
  GraduationCap:  <GraduationCap className="w-5 h-5" />,
  BookOpen:       <BookOpen className="w-5 h-5" />,
  Lightbulb:      <Lightbulb className="w-5 h-5" />,
  Puzzle:         <Puzzle className="w-5 h-5" />,
  Target:         <Target className="w-5 h-5" />,
  Trophy:         <Trophy className="w-5 h-5" />,
  Award:          <Award className="w-5 h-5" />,
  Star:           <Star className="w-5 h-5" />,
  // Business & life skills
  Briefcase:      <Briefcase className="w-5 h-5" />,
  TrendingUp:     <TrendingUp className="w-5 h-5" />,
  DollarSign:     <DollarSign className="w-5 h-5" />,
  Scale:          <Scale className="w-5 h-5" />,
  Globe:          <Globe className="w-5 h-5" />,
  Compass:        <Compass className="w-5 h-5" />,
  Users:          <Users className="w-5 h-5" />,
  HandHeart:      <HandHeart className="w-5 h-5" />,
  // Arts & expression
  Music:          <Music className="w-5 h-5" />,
  Palette:        <Palette className="w-5 h-5" />,
  Mic2:           <Mic2 className="w-5 h-5" />,
  Sparkles:       <Sparkles className="w-5 h-5" />,
};

function SpecialtyIconPicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 p-2 bg-muted/40 rounded-lg">
      {Object.entries(SPECIALTY_ICON_MAP).map(([key, icon]) => (
        <button
          key={key}
          type="button"
          title={key}
          onClick={() => onChange(value === key ? "" : key)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
            value === key
              ? "bg-primary text-white shadow"
              : "bg-background text-muted-foreground hover:bg-primary/10 hover:text-primary"
          }`}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}

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
  const [activeTab, setActiveTab] = useState<"overview" | "profesionales" | "activos" | "especialidades" | "planes" | "herramientas" | "retiros">("overview");
  const [rejectReason, setRejectReason] = useState<Record<number, string>>({});
  const [proofFile, setProofFile] = useState<Record<number, { base64: string; name: string; mimeType: string } | null>>({});
  const [tierSelect, setTierSelect] = useState<Record<number, "basic" | "pro">>({});
  const [expandedBio, setExpandedBio] = useState<Record<number, boolean>>({});
  const [newSpecialty, setNewSpecialty] = useState({ name: "", description: "", icon: "" });
  const [editingIconId, setEditingIconId] = useState<number | null>(null);
  const [editingDesc, setEditingDesc] = useState<Record<number, string>>({});
  const [newPlan, setNewPlan] = useState({
    name: "", price: "", billingPeriod: "monthly" as "monthly" | "yearly",
    maxAppointmentsPerMonth: "", maxMinutesPerAppointment: "",
    description: "",
  });
  const [discountForm, setDiscountForm] = useState({
    code: "", type: "percentage" as "percentage" | "fixed",
    value: "", maxUses: "", expiresAt: "",
  });
  const [docsModal, setDocsModal] = useState<{ professionalId: number; name: string } | null>(null);
  const [tierConfirm, setTierConfirm] = useState<{ professionalId: number; name: string; newTier: "basic" | "pro" } | null>(null);

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
  const { data: profsBySpecialty } = trpc.admin.getProfessionalsBySpecialty.useQuery(undefined, { enabled: isAuthenticated });
  const { data: activeProfessionals, refetch: refetchActiveProfessionals } = trpc.admin.getActiveProfessionals.useQuery(undefined, { enabled: isAuthenticated });
  const { data: allWithdrawals, refetch: refetchWithdrawals } = trpc.admin.getPendingWithdrawals.useQuery(undefined, { enabled: isAuthenticated });

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
      setNewSpecialty({ name: "", description: "", icon: "" });
      toast.success("Especialidad creada");
    },
    onError: () => toast.error("Error al crear la especialidad"),
  });

  const deleteSpecialtyMutation = trpc.specialty.delete.useMutation({
    onSuccess: () => { refetchSpecialties(); toast.success("Especialidad eliminada"); },
    onError: (err) => toast.error(err.message ?? "Error al eliminar la especialidad"),
  });

  const updateSpecialtyIconMutation = trpc.specialty.updateIcon.useMutation({
    onSuccess: () => { refetchSpecialties(); toast.success("Ícono actualizado"); },
    onError: () => toast.error("Error al actualizar el ícono"),
  });

  const updateSpecialtyDescMutation = trpc.specialty.updateDescription.useMutation({
    onSuccess: () => { refetchSpecialties(); setEditingIconId(null); toast.success("Descripción actualizada"); },
    onError: () => toast.error("Error al actualizar la descripción"),
  });

  const cronMutation = trpc.admin.runCronJobs.useMutation({
    onSuccess: (data) => toast.success(data.message),
    onError: () => toast.error("Error al ejecutar cron jobs"),
  });

  const syncRolesMutation = trpc.admin.syncProfessionalRoles.useMutation({
    onSuccess: () => toast.success("Roles de profesionales sincronizados correctamente"),
    onError: () => toast.error("Error al sincronizar roles"),
  });

  const approveWithdrawalMutation = trpc.admin.approveWithdrawal.useMutation({
    onSuccess: () => {
      refetchWithdrawals();
      toast.success("Retiro marcado como pagado");
    },
    onError: (err) => toast.error(err.message ?? "Error al procesar el retiro"),
  });

  const createPlanMutation = trpc.subscriptionPlan.create.useMutation({
    onSuccess: () => {
      refetchPlans();
      setNewPlan({ name: "", price: "", billingPeriod: "monthly", maxAppointmentsPerMonth: "", maxMinutesPerAppointment: "", description: "" });
      toast.success("Plan creado");
    },
    onError: () => toast.error("Error al crear el plan"),
  });

  // ── Discount codes ─────────────────────────────────────────────────────────
  const { data: discountCodes, refetch: refetchDiscountCodes } = trpc.admin.listDiscountCodes.useQuery(undefined, { enabled: isAuthenticated });

  const createDiscountMutation = trpc.admin.createDiscountCode.useMutation({
    onSuccess: () => {
      refetchDiscountCodes();
      setDiscountForm({ code: "", type: "percentage", value: "", maxUses: "", expiresAt: "" });
      toast.success("Código creado");
    },
    onError: (err: any) => toast.error(err?.message ?? "Error al crear el código"),
  });

  const toggleDiscountMutation = trpc.admin.toggleDiscountCode.useMutation({
    onSuccess: () => { refetchDiscountCodes(); },
    onError: () => toast.error("Error al actualizar"),
  });

  const deleteDiscountMutation = trpc.admin.deleteDiscountCode.useMutation({
    onSuccess: () => { refetchDiscountCodes(); toast.success("Código eliminado"); },
    onError: () => toast.error("Error al eliminar"),
  });

  // ── Professional tier + documents ─────────────────────────────────────────
  const { data: proDocuments, isLoading: loadingDocs } = trpc.admin.getProfessionalDocuments.useQuery(
    { professionalId: docsModal?.professionalId ?? 0 },
    { enabled: docsModal !== null }
  );

  const updateTierMutation = trpc.admin.updateProfessionalTier.useMutation({
    onSuccess: () => {
      refetchActiveProfessionals();
      toast.success("Tier actualizado");
      setTierConfirm(null);
    },
    onError: () => toast.error("Error al actualizar el tier"),
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
    <DashboardLayout>
      {/* KPI strip */}
      <div className="border-b border-border bg-card">
        <div className="container py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: <Users className="w-4 h-4 text-blue-600" />, bg: "bg-blue-100", value: metrics?.totalUsers ?? "—", label: "Usuarios totales" },
              { icon: <UserCheck className="w-4 h-4 text-primary" />, bg: "bg-primary/10", value: metrics?.activeProfessionals ?? "—", label: "Profesionales activos", onClick: () => setActiveTab("profesionales") },
              { icon: <Calendar className="w-4 h-4 text-emerald-600" />, bg: "bg-emerald-100", value: metrics?.appointmentsToday ?? "—", label: "Citas hoy" },
              { icon: <CreditCard className="w-4 h-4 text-purple-600" />, bg: "bg-purple-100", value: metrics?.activeSubscriptions ?? "—", label: "Suscripciones activas" },
            ].map((kpi, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 ${kpi.onClick ? "cursor-pointer hover:bg-muted/50 rounded-xl px-2 -mx-2 transition-colors" : ""}`}
                onClick={kpi.onClick}
              >
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
          <div className="flex gap-1 overflow-x-auto scrollbar-none" style={{ WebkitOverflowScrolling: "touch" }}>
            {([
              { key: "overview",        label: "Resumen",        icon: <BarChart3 className="w-4 h-4" /> },
              { key: "profesionales",   label: "Solicitudes",          icon: <Users className="w-4 h-4" /> },
              { key: "activos",         label: "Profesionales activos", icon: <UserCheck className="w-4 h-4" /> },
              { key: "especialidades",  label: "Especialidades", icon: <Award className="w-4 h-4" /> },
              { key: "planes",          label: "Planes",         icon: <Settings className="w-4 h-4" /> },
      { key: "herramientas",    label: "Herramientas",   icon: <Wrench className="w-4 h-4" /> },
              { key: "retiros",         label: "Retiros",        icon: <CreditCard className="w-4 h-4" /> },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
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
                {tab.key === "retiros" && ((allWithdrawals ?? []).filter((w: any) => w.status === "pending").length > 0) && (
                  <Badge className="bg-red-500 text-white border-0 text-[10px] h-4 px-1 ml-0.5">
                    {(allWithdrawals ?? []).filter((w: any) => w.status === "pending").length}
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
                              Cita #{apt.id} · {apt.userName ?? `Usuario #${apt.userId}`} → {apt.professionalName ?? `Profesional #${apt.professionalId}`}
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

            {/* Profesionales por especialidad */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                Profesionales por especialidad
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {(profsBySpecialty ?? []).map((s) => (
                  <Card key={s.name} className="border-border">
                    <CardContent className="p-4">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-2xl font-bold text-primary mt-1" style={{ fontFamily: "Poppins" }}>{s.count}</p>
                      <p className="text-[11px] text-muted-foreground">aprobados</p>
                    </CardContent>
                  </Card>
                ))}
                {(profsBySpecialty ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-full py-4">Sin datos de especialidades</p>
                )}
              </div>
            </div>
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
                  const name = (pro as any).userName || (pro as any).userEmail?.split('@')[0] || `Profesional #${pro.id}`;
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

        {/* ══ TAB: ACTIVOS ═══════════════════════════════════════════════════ */}
        {activeTab === "activos" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
              Profesionales activos
            </h2>
            {(activeProfessionals ?? []).length === 0 ? (
              <Card className="border-border border-dashed">
                <CardContent className="p-10 text-center">
                  <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No hay profesionales aprobados aún</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(activeProfessionals ?? []).map((pro: any) => {
                  const name = pro.userName || pro.userEmail?.split("@")[0] || `Profesional #${pro.id}`;
                  const avatar = pro.profilePhoto;
                  return (
                    <Card key={pro.id} className="border-border">
                      <CardContent className="p-4 space-y-3">
                        {/* Header row */}
                        <div className="flex items-start gap-3">
                          {avatar ? (
                            <img src={avatar} alt={name} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-11 h-11 rounded-xl gradient-brand flex items-center justify-center text-white font-bold flex-shrink-0">
                              {name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm truncate">{name}</p>
                            {pro.specialtyName && (
                              <p className="text-[11px] text-muted-foreground mt-0.5">{pro.specialtyName}</p>
                            )}
                            {pro.userEmail && (
                              <p className="text-[11px] text-muted-foreground truncate">{pro.userEmail}</p>
                            )}
                          </div>
                        </div>

                        {/* Tier selector + docs button */}
                        <div className="flex items-center gap-2 pt-1 border-t border-border">
                          <div className="flex items-center gap-1.5 flex-1">
                            <span className="text-[11px] text-muted-foreground">Tier:</span>
                            <button
                              onClick={() => setTierConfirm({ professionalId: pro.id, name, newTier: "basic" })}
                              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                                pro.tier !== "pro"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-muted text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700"
                              }`}
                            >Básico</button>
                            <button
                              onClick={() => setTierConfirm({ professionalId: pro.id, name, newTier: "pro" })}
                              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                                pro.tier === "pro"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-muted text-muted-foreground hover:bg-purple-50 hover:text-purple-700"
                              }`}
                            >Pro</button>
                          </div>
                          <button
                            onClick={() => setDocsModal({ professionalId: pro.id, name })}
                            className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors"
                            title="Ver documentos"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            Documentos
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* ── Documents modal ── */}
            {docsModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDocsModal(null)}>
                <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-5 border-b border-border">
                    <div>
                      <h3 className="font-bold text-base" style={{ fontFamily: "Poppins, sans-serif" }}>Documentos del profesional</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{docsModal.name}</p>
                    </div>
                    <button onClick={() => setDocsModal(null)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-5 space-y-5">
                    {loadingDocs ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : !proDocuments ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No se encontraron documentos</p>
                    ) : (
                      <>
                        {/* Cédula */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Número de cédula</p>
                          {proDocuments.licenseNumber ? (
                            <p className="text-sm font-mono bg-muted px-3 py-2 rounded-lg">{proDocuments.licenseNumber}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">No proporcionado</p>
                          )}
                        </div>

                        {/* Documento de identidad */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Documento de identidad</p>
                          {proDocuments.licenseDocument ? (
                            /\.(jpg|jpeg|png|gif|webp)$/i.test(proDocuments.licenseDocument) ? (
                              <img src={proDocuments.licenseDocument} alt="Documento de identidad" className="w-full rounded-xl border border-border object-contain max-h-64" />
                            ) : (
                              <a href={proDocuments.licenseDocument} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-primary hover:underline bg-primary/5 px-3 py-2.5 rounded-lg">
                                <FileText className="w-4 h-4 flex-shrink-0" />
                                Abrir documento (PDF)
                                <ExternalLink className="w-3.5 h-3.5 ml-auto flex-shrink-0" />
                              </a>
                            )
                          ) : (
                            <p className="text-xs text-muted-foreground italic">No proporcionado</p>
                          )}
                        </div>

                        {/* Certificaciones */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Certificaciones</p>
                          {proDocuments.certifications ? (
                            /\.(jpg|jpeg|png|gif|webp)$/i.test(proDocuments.certifications) ? (
                              <img src={proDocuments.certifications} alt="Certificaciones" className="w-full rounded-xl border border-border object-contain max-h-64" />
                            ) : (
                              <a href={proDocuments.certifications} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-primary hover:underline bg-primary/5 px-3 py-2.5 rounded-lg">
                                <FileText className="w-4 h-4 flex-shrink-0" />
                                Abrir certificaciones (PDF)
                                <ExternalLink className="w-3.5 h-3.5 ml-auto flex-shrink-0" />
                              </a>
                            )
                          ) : (
                            <p className="text-xs text-muted-foreground italic">No proporcionado</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Tier confirm dialog ── */}
            <AlertDialog open={tierConfirm !== null} onOpenChange={(open) => { if (!open) setTierConfirm(null); }}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Cambiar tier?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Estás a punto de cambiar el tier de <strong>{tierConfirm?.name}</strong> de{" "}
                    <strong>{tierConfirm?.newTier === "pro" ? "Básico" : "Pro"}</strong> a{" "}
                    <strong className={tierConfirm?.newTier === "pro" ? "text-purple-700" : "text-emerald-700"}>
                      {tierConfirm?.newTier === "pro" ? "Pro" : "Básico"}
                    </strong>. Esta acción afecta sus comisiones inmediatamente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={updateTierMutation.isPending}
                    onClick={() => {
                      if (tierConfirm) {
                        updateTierMutation.mutate({ professionalId: tierConfirm.professionalId, tier: tierConfirm.newTier });
                      }
                    }}
                  >
                    {updateTierMutation.isPending ? "Guardando..." : "Confirmar cambio"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Tab: Especialidades */}
        {activeTab === "especialidades" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
              Gestionar especialidades
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Columna izquierda — lista actual */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base">Especialidades actuales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                    {(specialties ?? []).map((s: any) => (
                      <div key={s.id} className="rounded-xl border border-border overflow-hidden">
                        <div className="flex items-center justify-between p-3 bg-primary/5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                              {s.icon && SPECIALTY_ICON_MAP[s.icon]
                                ? SPECIALTY_ICON_MAP[s.icon]
                                : <Stethoscope className="w-5 h-5" />}
                            </div>
                            <span className="font-medium text-sm">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Activa</Badge>
                            <button
                              title="Editar especialidad"
                              onClick={() => {
                                const isOpening = editingIconId !== s.id;
                                setEditingIconId(isOpening ? s.id : null);
                                if (isOpening) {
                                  setEditingDesc((prev) => ({ ...prev, [s.id]: s.description ?? "" }));
                                }
                              }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Eliminar especialidad"
                              disabled={deleteSpecialtyMutation.isPending}
                              onClick={() => {
                                if (window.confirm(`¿Eliminar la especialidad "${s.name}"? Esta acción no se puede deshacer.`)) {
                                  deleteSpecialtyMutation.mutate({ id: s.id });
                                }
                              }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {editingIconId === s.id && (
                          <div className="p-3 border-t border-border bg-background space-y-3">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1.5">Ícono:</p>
                              <SpecialtyIconPicker
                                value={s.icon ?? ""}
                                onChange={(key) => updateSpecialtyIconMutation.mutate({ id: s.id, icon: key })}
                              />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1.5">Descripción:</p>
                              <textarea
                                value={editingDesc[s.id] ?? ""}
                                onChange={(e) => setEditingDesc((prev) => ({ ...prev, [s.id]: e.target.value }))}
                                placeholder="Descripción de la especialidad..."
                                className="w-full rounded-lg border border-border p-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[72px] resize-none"
                              />
                              <Button
                                size="sm"
                                className="mt-2 gradient-brand text-white border-0"
                                disabled={updateSpecialtyDescMutation.isPending}
                                onClick={() => updateSpecialtyDescMutation.mutate({ id: s.id, description: editingDesc[s.id] ?? "" })}
                              >
                                Guardar descripción
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Columna derecha — nueva especialidad */}
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
                  <div>
                    <label className="text-xs font-medium mb-1 block">Ícono</label>
                    <SpecialtyIconPicker
                      value={newSpecialty.icon}
                      onChange={(key) => setNewSpecialty({ ...newSpecialty, icon: key })}
                    />
                    {newSpecialty.icon && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          {SPECIALTY_ICON_MAP[newSpecialty.icon]}
                        </div>
                        <span>Preview: {newSpecialty.icon}</span>
                      </div>
                    )}
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
          </div>
        )}

        {/* Tab: Herramientas */}
        {activeTab === "herramientas" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
              Herramientas del sistema
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna izquierda — herramientas del sistema */}
            <div className="space-y-6">

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

            {/* Sincronizar roles de profesionales */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Sincronizar roles de profesionales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-muted/40 rounded-xl">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Sincronizar roles</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Actualiza el rol de todos los profesionales aprobados que aún aparecen como usuarios normales.
                      Ejecuta esto si un profesional aprobado no puede acceder a su panel.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="gradient-brand text-white border-0 flex-shrink-0"
                    onClick={() => syncRolesMutation.mutate()}
                    disabled={syncRolesMutation.isPending}
                  >
                    {syncRolesMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Sincronizar
                      </>
                    )}
                  </Button>
                </div>
                {syncRolesMutation.isSuccess && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>Roles sincronizados correctamente. Los profesionales afectados deben cerrar sesión y volver a entrar.</span>
                  </div>
                )}
              </CardContent>
            </Card>

            </div>{/* /columna izquierda */}

            {/* Columna derecha — Códigos de descuento */}
            <div>
              <h3 className="text-base font-bold flex items-center gap-2 mb-4" style={{ fontFamily: "Poppins, sans-serif" }}>
                <Tag className="w-4 h-4 text-primary" />
                Códigos de descuento
              </h3>
              <div className="grid grid-cols-1 gap-6">
                {/* Columna izquierda — lista de códigos existentes */}
                <Card className="border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Códigos existentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                      {(!discountCodes || discountCodes.length === 0) ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No hay códigos creados</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-muted-foreground border-b">
                                <th className="text-left pb-2 font-medium">Código</th>
                                <th className="text-left pb-2 font-medium">Descuento</th>
                                <th className="text-left pb-2 font-medium">Usos</th>
                                <th className="text-left pb-2 font-medium">Vence</th>
                                <th className="text-left pb-2 font-medium">Estado</th>
                                <th className="pb-2" />
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {(discountCodes as any[]).map((dc) => {
                                const isExpired = dc.expiresAt && new Date(dc.expiresAt) < new Date();
                                const isExhausted = dc.maxUses !== null && dc.usedCount >= dc.maxUses;
                                return (
                                  <tr key={dc.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="py-2 font-mono font-semibold">{dc.code}</td>
                                    <td className="py-2">
                                      <span className="flex items-center gap-0.5">
                                        {dc.type === "percentage"
                                          ? <><Percent className="w-3 h-3" />{Number(dc.value)}%</>
                                          : <>${Number(dc.value)} MXN</>
                                        }
                                      </span>
                                    </td>
                                    <td className="py-2 text-muted-foreground">
                                      {dc.usedCount}{dc.maxUses !== null ? `/${dc.maxUses}` : ""}
                                    </td>
                                    <td className="py-2 text-muted-foreground">
                                      {dc.expiresAt ? format(new Date(dc.expiresAt), "dd/MM/yy") : "—"}
                                    </td>
                                    <td className="py-2">
                                      {isExpired || isExhausted ? (
                                        <Badge className="bg-gray-100 text-gray-600 border-0 text-[10px]">
                                          {isExpired ? "Expirado" : "Agotado"}
                                        </Badge>
                                      ) : dc.isActive ? (
                                        <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">Activo</Badge>
                                      ) : (
                                        <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">Inactivo</Badge>
                                      )}
                                    </td>
                                    <td className="py-2">
                                      <div className="flex items-center gap-1 justify-end">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                          title={dc.isActive ? "Desactivar" : "Activar"}
                                          onClick={() => toggleDiscountMutation.mutate({ id: dc.id, isActive: !dc.isActive })}
                                        >
                                          {dc.isActive
                                            ? <ToggleRight className="w-4 h-4 text-emerald-600" />
                                            : <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                                          }
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600"
                                          title="Eliminar"
                                          onClick={() => deleteDiscountMutation.mutate({ id: dc.id })}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Columna derecha — formulario nuevo código */}
                <Card className="border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Nuevo código</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      placeholder="CÓDIGO (ej. BIENVENIDA20)"
                      value={discountForm.code}
                      onChange={(e) => setDiscountForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                      className="text-xs h-8 font-mono"
                      maxLength={50}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={discountForm.type}
                        onChange={(e) => setDiscountForm((f) => ({ ...f, type: e.target.value as "percentage" | "fixed" }))}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        <option value="percentage">Porcentaje (%)</option>
                        <option value="fixed">Monto fijo ($)</option>
                      </select>
                      <Input
                        type="number"
                        placeholder={discountForm.type === "percentage" ? "Valor (ej. 20)" : "Valor MXN (ej. 100)"}
                        value={discountForm.value}
                        onChange={(e) => setDiscountForm((f) => ({ ...f, value: e.target.value }))}
                        className="text-xs h-8"
                        min={0}
                      />
                    </div>
                    <Input
                      type="number"
                      placeholder="Usos máximos (opcional)"
                      value={discountForm.maxUses}
                      onChange={(e) => setDiscountForm((f) => ({ ...f, maxUses: e.target.value }))}
                      className="text-xs h-8"
                      min={1}
                    />
                    <Input
                      type="date"
                      placeholder="Fecha de vencimiento (opcional)"
                      value={discountForm.expiresAt}
                      onChange={(e) => setDiscountForm((f) => ({ ...f, expiresAt: e.target.value }))}
                      className="text-xs h-8"
                    />
                    <Button
                      size="sm"
                      className="gradient-brand text-white border-0 w-full"
                      disabled={!discountForm.code.trim() || !discountForm.value || createDiscountMutation.isPending}
                      onClick={() => createDiscountMutation.mutate({
                        code: discountForm.code.trim(),
                        type: discountForm.type,
                        value: parseFloat(discountForm.value),
                        maxUses: discountForm.maxUses ? parseInt(discountForm.maxUses) : null,
                        expiresAt: discountForm.expiresAt ? new Date(discountForm.expiresAt).toISOString() : null,
                      })}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      {createDiscountMutation.isPending ? "Creando..." : "Crear código"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>{/* /columna derecha */}
            </div>{/* /grid */}
          </div>
        )}

        {/* ══ TAB: RETIROS ══════════════════════════════════════════════════ */}
        {activeTab === "retiros" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
              Solicitudes de retiro
            </h2>

            {/* Pending */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pendientes</p>
              {(allWithdrawals ?? []).filter((w: any) => w.status === "pending").length === 0 ? (
                <Card className="border-border border-dashed">
                  <CardContent className="p-8 text-center">
                    <CheckCircle2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No hay solicitudes pendientes</p>
                  </CardContent>
                </Card>
              ) : (
                (allWithdrawals ?? []).filter((w: any) => w.status === "pending").map((w: any) => (
                  <Card key={w.id} className="border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm">{w.professionalName}</p>
                            <Badge className="bg-yellow-100 text-yellow-700 border-0 text-[10px]">Pendiente</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{w.professionalEmail}</p>
                          <p className="text-lg font-bold text-primary">${parseFloat(w.amount).toLocaleString("es-MX")} MXN</p>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <p><span className="font-medium">Método:</span> {w.paymentMethod ?? "CLABE"}</p>
                            <p><span className="font-medium">Detalles:</span> {w.paymentDetails ?? w.clabe ?? "—"}</p>
                            {w.notes && <p><span className="font-medium">Nota:</span> {w.notes}</p>}
                            <p><span className="font-medium">Solicitado:</span> {format(new Date(w.createdAt), "d MMM yyyy 'a las' HH:mm", { locale: es })}</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0 w-52">
                          <label className="text-[10px] text-muted-foreground font-medium">Comprobante (opcional)</label>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="text-xs text-muted-foreground file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-muted file:text-muted-foreground hover:file:bg-muted/80 cursor-pointer"
                            onChange={async (e) => {
                              const file = e.target.files?.[0] ?? null;
                              if (!file) {
                                setProofFile((prev) => ({ ...prev, [w.id]: null }));
                                return;
                              }
                              const base64 = await new Promise<string>((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = () => resolve((reader.result as string).split(",")[1]);
                                reader.onerror = reject;
                                reader.readAsDataURL(file);
                              });
                              setProofFile((prev) => ({ ...prev, [w.id]: { base64, name: file.name, mimeType: file.type } }));
                            }}
                          />
                          {proofFile[w.id] && (
                            <p className="text-[10px] text-emerald-600 truncate">{proofFile[w.id]!.name}</p>
                          )}
                          <Button
                            size="sm"
                            className="gradient-brand text-white border-0"
                            disabled={approveWithdrawalMutation.isPending}
                            onClick={() => {
                              if (window.confirm(`¿Confirmar pago de $${parseFloat(w.amount).toLocaleString("es-MX")} MXN a ${w.professionalName}?`)) {
                                const proof = proofFile[w.id];
                                approveWithdrawalMutation.mutate({
                                  withdrawalId: w.id,
                                  attachmentBase64: proof?.base64,
                                  attachmentName: proof?.name,
                                  attachmentMimeType: proof?.mimeType,
                                });
                              }
                            }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Marcar pagado
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* History */}
            {(allWithdrawals ?? []).filter((w: any) => w.status !== "pending").length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Historial procesados</p>
                <Card className="border-border">
                  <CardContent className="p-0 divide-y divide-border">
                    {(allWithdrawals ?? []).filter((w: any) => w.status !== "pending").map((w: any) => (
                      <div key={w.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">{w.professionalName}</p>
                          <p className="text-xs text-muted-foreground">{w.paymentMethod ?? "CLABE"} · {format(new Date(w.createdAt), "d MMM yyyy", { locale: es })}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">${parseFloat(w.amount).toLocaleString("es-MX")} MXN</p>
                          <Badge className={`text-[10px] border-0 ${w.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                            {w.status === "paid" ? "Pagado" : w.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
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
    </DashboardLayout>
  );
}
