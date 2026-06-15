import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { parseLocalDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Users, CheckCircle2, XCircle, Clock, Shield, Plus,
  Settings, BarChart3, Award, TrendingUp, Calendar,
  Star, Activity, CreditCard, UserCheck, RefreshCw, Wrench,
  ChevronDown, ChevronUp, FileText, ExternalLink, User,
  Trash2, Pencil, Stethoscope, Tag, Percent, ToggleLeft, ToggleRight,
  FolderOpen, X, Search, Image, Link2, Upload,
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
  Feather, Flower, Flower2, TestTube, Copy, CreditCard as CardIcon,
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
  const [activeTab, setActiveTab] = useState<"overview" | "usuarios" | "profesionales" | "activos" | "citas" | "contenido" | "planes" | "codigos" | "retiros" | "herramientas">("overview");
  const [bannerForm, setBannerForm] = useState({ imageUrl: "", title: "", linkUrl: "" });
  const [bannerUploading, setBannerUploading] = useState(false);
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
  const [rejectingWithdrawalId, setRejectingWithdrawalId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [editPlanForm, setEditPlanForm] = useState({ name: "", price: "", description: "", maxAppointmentsPerMonth: "", maxMinutesPerAppointment: "" });
  const [docsModal, setDocsModal] = useState<{ professionalId: number; name: string } | null>(null);
  const [tierConfirm, setTierConfirm] = useState<{ professionalId: number; name: string; newTier: "basic" | "pro" } | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState<{ professionalId: number; name: string } | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [activosSearch, setActivosSearch] = useState("");
  const [activosSpecialty, setActivosSpecialty] = useState("");
  const [usersSearch, setUsersSearch] = useState("");
  const [usersRolFilter, setUsersRolFilter] = useState("Todos");
  const [usersPlanFilter, setUsersPlanFilter] = useState("all");
  const [usersCreditFilter, setUsersCreditFilter] = useState("all");

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
  const { data: banners, refetch: refetchBanners } = trpc.admin.listBanners.useQuery(undefined, { enabled: isAuthenticated });
  const { data: homeCarousel, refetch: refetchHomeCarousel } = trpc.admin.listHomeCarousel.useQuery(undefined, { enabled: isAuthenticated });

  const createBannerMutation = trpc.admin.createBanner.useMutation({
    onSuccess: () => { refetchBanners(); setBannerForm({ imageUrl: "", title: "", linkUrl: "" }); toast.success("Banner agregado"); },
    onError: () => toast.error("Error al agregar banner"),
  });
  const deleteBannerMutation = trpc.admin.deleteBanner.useMutation({
    onSuccess: () => { refetchBanners(); toast.success("Banner eliminado"); },
    onError: () => toast.error("Error al eliminar banner"),
  });
  const toggleBannerMutation = trpc.admin.toggleBanner.useMutation({
    onSuccess: () => refetchBanners(),
    onError: () => toast.error("Error al actualizar banner"),
  });
  const createHomeCarouselItemMutation = trpc.admin.createHomeCarouselItem.useMutation({
    onSuccess: () => { refetchHomeCarousel(); setCarouselForm({ title: "", imageUrl: "", link: "/especialidades" }); toast.success("Item agregado al carrusel"); },
    onError: () => toast.error("Error al agregar item"),
  });
  const deleteHomeCarouselItemMutation = trpc.admin.deleteHomeCarouselItem.useMutation({
    onSuccess: () => { refetchHomeCarousel(); toast.success("Item eliminado"); },
    onError: () => toast.error("Error al eliminar"),
  });
  const toggleHomeCarouselItemMutation = trpc.admin.toggleHomeCarouselItem.useMutation({
    onSuccess: () => refetchHomeCarousel(),
    onError: () => toast.error("Error al actualizar"),
  });

  const [citasSearch, setCitasSearch] = useState("");
  const [citasStatus, setCitasStatus] = useState("");
  const [citasDateFrom, setCitasDateFrom] = useState("");
  const [citasDateTo, setCitasDateTo] = useState("");

  const { data: appointmentResults, refetch: refetchAppointments, isLoading: loadingAppointments } = trpc.admin.searchAppointments.useQuery(
    { search: citasSearch || undefined, status: citasStatus || undefined, dateFrom: citasDateFrom || undefined, dateTo: citasDateTo || undefined },
    { enabled: activeTab === "citas" }
  );
  const cancelAppointmentMutation = trpc.appointment.cancelAppointment.useMutation({
    onSuccess: () => { refetchAppointments(); toast.success("Cita cancelada"); },
    onError: (e) => toast.error(e.message ?? "Error al cancelar"),
  });
  const reactivateAppointmentMutation = trpc.admin.reactivateAppointment.useMutation({
    onSuccess: () => { refetchAppointments(); toast.success("Cita reactivada"); },
    onError: () => toast.error("Error al reactivar"),
  });

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

  const revokeMutation = trpc.admin.revokeProfessional.useMutation({
    onSuccess: () => {
      refetchActiveProfessionals();
      setRevokeConfirm(null);
      setRevokeReason("");
      toast.success("Acceso revocado correctamente");
    },
    onError: () => toast.error("Error al revocar el acceso"),
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

  // ─── siteConfig state ────────────────────────────────────────────────────
  const { data: siteConfigData, refetch: refetchSiteConfig } = trpc.public.getSiteConfig.useQuery(
    { keys: ["professionals_video_url", "professionals_banner_url", "home_hero_banner_url", "professionals_video_bg_url"] },
    { enabled: activeTab === "contenido" }
  );
  const [videoUrl, setVideoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [videoBgUrl, setVideoBgUrl] = useState("");
  const [heroVideoUploading, setHeroVideoUploading] = useState(false);
  const [heroBannerUploading, setHeroBannerUploading] = useState(false);
  const [videoBgUploading, setVideoBgUploading] = useState(false);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const heroBannerFileRef = useRef<HTMLInputElement>(null);
  const videoBgFileRef = useRef<HTMLInputElement>(null);
  const [homeHeroBannerUrl, setHomeHeroBannerUrl] = useState("");
  const [homeHeroBannerUploading, setHomeHeroBannerUploading] = useState(false);
  const homeHeroBannerFileRef = useRef<HTMLInputElement>(null);
  const [carouselForm, setCarouselForm] = useState({ title: "", imageUrl: "", link: "/especialidades" });
  const [carouselUploading, setCarouselUploading] = useState(false);

  useEffect(() => {
    if (siteConfigData) {
      setVideoUrl(siteConfigData.professionals_video_url ?? "");
      setBannerUrl(siteConfigData.professionals_banner_url ?? "");
      setHomeHeroBannerUrl(siteConfigData.home_hero_banner_url ?? "");
      setVideoBgUrl(siteConfigData.professionals_video_bg_url ?? "");
    }
  }, [siteConfigData]);

  const setSiteConfigMutation = trpc.admin.setSiteConfig.useMutation({
    onSuccess: () => { refetchSiteConfig(); toast.success("Configuración guardada"); },
    onError: () => toast.error("Error al guardar la configuración"),
  });

  async function uploadSiteAsset(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(",")[1];
          const res = await fetch("/api/upload/site-asset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ base64, mimeType: file.type, fileName: file.name }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Upload failed");
          resolve(data.url);
        } catch (err: any) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Error al leer el archivo"));
      reader.readAsDataURL(file);
    });
  }

  const approveWithdrawalMutation = trpc.admin.approveWithdrawal.useMutation({
    onSuccess: () => {
      refetchWithdrawals();
      toast.success("Retiro marcado como pagado");
    },
    onError: (err) => toast.error(err.message ?? "Error al procesar el retiro"),
  });
  const rejectWithdrawalMutation = trpc.admin.rejectWithdrawal.useMutation({
    onSuccess: () => {
      refetchWithdrawals();
      setRejectingWithdrawalId(null);
      setRejectNote("");
      toast.success("Retiro rechazado");
    },
    onError: (err) => toast.error(err.message ?? "Error al rechazar"),
  });
  const updatePlanMutation = trpc.subscriptionPlan.update.useMutation({
    onSuccess: () => { refetchPlans(); setEditingPlanId(null); toast.success("Plan actualizado"); },
    onError: () => toast.error("Error al actualizar plan"),
  });
  const deletePlanMutation = trpc.subscriptionPlan.delete.useMutation({
    onSuccess: () => { refetchPlans(); toast.success("Plan desactivado"); },
    onError: () => toast.error("Error al desactivar plan"),
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
  const { data: allUsers, refetch: refetchUsers } = trpc.admin.getUsers.useQuery(undefined, { enabled: isAuthenticated });
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

  const deleteUserMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => { refetchUsers(); toast.success("Usuario eliminado"); },
    onError: (err: any) => toast.error(err?.message ?? "Error al eliminar usuario"),
  });

  const [roleChanges, setRoleChanges] = useState<Record<number, string>>({});
  const changeUserRoleMutation = trpc.admin.changeUserRole.useMutation({
    onSuccess: () => { refetchUsers(); setRoleChanges({}); toast.success("Rol actualizado"); },
    onError: (err: any) => toast.error(err?.message ?? "Error al cambiar rol"),
  });

  // ── Prepaid cards ─────────────────────────────────────────────────────────
  const [prepaidProductType, setPrepaidProductType] = useState<"individual_basic" | "individual_premium" | "plan_basic" | "plan_pro">("individual_basic");
  const { data: prepaidCards, refetch: refetchPrepaidCards } = trpc.admin.listPrepaidCards.useQuery(undefined, { enabled: isAuthenticated });
  const createPrepaidMutation = trpc.admin.createPrepaidCard.useMutation({
    onSuccess: (data: any) => {
      refetchPrepaidCards();
      toast.success(`Tarjeta creada: ${data.code}`);
    },
    onError: (err: any) => toast.error(err.message ?? "Error al crear tarjeta"),
  });
  const deletePrepaidMutation = trpc.admin.deletePrepaidCard.useMutation({
    onSuccess: () => { refetchPrepaidCards(); toast.success("Tarjeta eliminada"); },
    onError: (err: any) => toast.error(err.message ?? "Error al eliminar"),
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
              { key: "overview",      label: "Resumen",               icon: <BarChart3 className="w-4 h-4" /> },
              { key: "usuarios",      label: "Usuarios",              icon: <User className="w-4 h-4" /> },
              { key: "profesionales", label: "Solicitudes",           icon: <Users className="w-4 h-4" /> },
              { key: "activos",       label: "Profesionales activos", icon: <UserCheck className="w-4 h-4" /> },
              { key: "citas",         label: "Citas",                 icon: <Calendar className="w-4 h-4" /> },
              { key: "contenido",     label: "Contenido",             icon: <Image className="w-4 h-4" /> },
              { key: "planes",        label: "Planes",                icon: <Settings className="w-4 h-4" /> },
              { key: "codigos",       label: "Códigos",               icon: <Tag className="w-4 h-4" /> },
              { key: "retiros",       label: "Retiros",               icon: <CreditCard className="w-4 h-4" /> },
              { key: "herramientas",  label: "Herramientas",          icon: <Wrench className="w-4 h-4" /> },
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

        {/* ══ TAB: USUARIOS ═════════════════════════════════════════════════ */}
        {activeTab === "usuarios" && (() => {
          const q = usersSearch.toLowerCase().trim();
          const filtered = (allUsers ?? []).filter(u => {
            if (q && !u.name?.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q)) return false;
            if (usersRolFilter === "Usuarios"       && u.role !== "user")         return false;
            if (usersRolFilter === "Profesionales"  && u.role !== "professional") return false;
            if (usersRolFilter === "Admins"         && u.role !== "admin")        return false;
            if (usersPlanFilter === "plan_basic" && u.activePlan !== "plan_basic") return false;
            if (usersPlanFilter === "plan_pro"   && u.activePlan !== "plan_pro")   return false;
            if (usersPlanFilter === "none"       && u.activePlan != null)          return false;
            if (usersCreditFilter === "with"    && Number(u.creditBalance) <= 0) return false;
            if (usersCreditFilter === "without" && Number(u.creditBalance) >  0) return false;
            return true;
          });
          return (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    value={usersSearch}
                    onChange={e => setUsersSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex gap-1">
                  {(["Todos", "Usuarios", "Profesionales", "Admins"] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setUsersRolFilter(r)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${usersRolFilter === r ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <Select value={usersPlanFilter} onValueChange={setUsersPlanFilter}>
                  <SelectTrigger className="w-[150px] h-8 text-xs">
                    <SelectValue placeholder="Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los planes</SelectItem>
                    <SelectItem value="plan_basic">Plan Básico</SelectItem>
                    <SelectItem value="plan_pro">Plan Pro</SelectItem>
                    <SelectItem value="none">Sin plan</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={usersCreditFilter} onValueChange={setUsersCreditFilter}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="Saldo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Cualquier saldo</SelectItem>
                    <SelectItem value="with">Con créditos</SelectItem>
                    <SelectItem value="without">Sin créditos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground font-medium -mt-2">
                {filtered.length} {filtered.length === 1 ? "usuario encontrado" : "usuarios encontrados"}
              </p>
              <Card>
                <CardContent className="p-0">
                  <div className="max-h-[600px] overflow-y-auto scrollbar-hide">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white border-b border-border z-10">
                        <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                          <th className="px-4 py-3 font-medium">Usuario</th>
                          <th className="px-4 py-3 font-medium">Rol</th>
                          <th className="px-4 py-3 font-medium">Plan</th>
                          <th className="px-4 py-3 font-medium text-right">Créditos</th>
                          <th className="px-4 py-3 font-medium text-right">Citas</th>
                          <th className="px-4 py-3 font-medium">Registro</th>
                          <th className="px-4 py-3 font-medium">Login</th>
                          <th className="px-4 py-3 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filtered.map(u => {
                          const initials = u.name
                            ? u.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
                            : u.email?.[0]?.toUpperCase() ?? "?";
                          const roleBadge =
                            u.role === "admin"        ? "bg-red-100 text-red-700" :
                            u.role === "professional" ? "bg-blue-100 text-blue-700" :
                                                        "bg-gray-100 text-gray-600";
                          const roleLabel =
                            u.role === "admin"        ? "Admin" :
                            u.role === "professional" ? "Profesional" : "Usuario";
                          const planLabel =
                            u.activePlan === "plan_pro"   ? "Plan Pro" :
                            u.activePlan === "plan_basic" ? "Plan Básico" : null;
                          return (
                            <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  {u.profileImage ? (
                                    <img src={u.profileImage} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                      {initials}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-medium text-[13px] text-gray-900 truncate">{u.name ?? "—"}</p>
                                    <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {u.role === "admin" ? (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${roleBadge}`}>
                                    {roleLabel}
                                  </span>
                                ) : (
                                  <select
                                    value={roleChanges[u.id] ?? u.role}
                                    onChange={(e) => setRoleChanges(prev => ({ ...prev, [u.id]: e.target.value }))}
                                    className="text-xs border border-border rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                  >
                                    <option value="user">Usuario</option>
                                    <option value="professional">Profesional</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {planLabel ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700">
                                    {planLabel}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500">
                                    Sin plan
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-[13px]">
                                {Number(u.creditBalance).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right text-[13px] text-muted-foreground">
                                {Number(u.totalAppointments)}
                              </td>
                              <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">
                                {u.createdAt ? format(new Date(u.createdAt), "d MMM yyyy", { locale: es }) : "—"}
                              </td>
                              <td className="px-4 py-3 text-[12px] text-muted-foreground capitalize">
                                {u.loginMethod ?? "—"}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex flex-col items-end gap-1">
                                  {roleChanges[u.id] && roleChanges[u.id] !== u.role && (
                                    <button
                                      onClick={() => changeUserRoleMutation.mutate({ userId: u.id, role: roleChanges[u.id] as any })}
                                      className="text-xs text-primary hover:text-primary/80 font-medium px-2 py-1 rounded hover:bg-primary/10 transition-colors"
                                    >
                                      Guardar rol
                                    </button>
                                  )}
                                  {u.role !== "admin" && (
                                    <button
                                      onClick={() => {
                                        if (window.confirm(`¿Eliminar a ${u.name ?? u.email}? Esta acción no se puede deshacer.`)) {
                                          deleteUserMutation.mutate({ userId: u.id });
                                        }
                                      }}
                                      className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                    >
                                      Eliminar
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {filtered.length === 0 && (
                          <tr>
                            <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                              No se encontraron usuarios
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })()}

        {/* ══ TAB: CONTENIDO ════════════════════════════════════════════════ */}
        {activeTab === "contenido" && (
          <div className="space-y-8">
            <h2 className="text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>Contenido del sitio</h2>

            {/* ── Página de inicio ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Página de inicio</p>
              </div>

              {/* Banner hero del home */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Image className="w-4 h-4 text-primary" />
                    Banner hero del home
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">Imagen de fondo del hero en la página principal. Pega una URL o sube a R2.</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={homeHeroBannerUrl}
                      onChange={(e) => setHomeHeroBannerUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <Button
                      size="sm"
                      className="gradient-brand text-white border-0 flex-shrink-0"
                      disabled={setSiteConfigMutation.isPending}
                      onClick={() => setSiteConfigMutation.mutate({ key: "home_hero_banner_url", value: homeHeroBannerUrl })}
                    >
                      Guardar
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={homeHeroBannerFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setHomeHeroBannerUploading(true);
                        try {
                          const url = await uploadSiteAsset(file);
                          setHomeHeroBannerUrl(url);
                          setSiteConfigMutation.mutate({ key: "home_hero_banner_url", value: url });
                        } catch (err: any) {
                          toast.error(err?.message ?? "Error al subir la imagen");
                        } finally {
                          setHomeHeroBannerUploading(false);
                          if (homeHeroBannerFileRef.current) homeHeroBannerFileRef.current.value = "";
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1.5"
                      disabled={homeHeroBannerUploading}
                      onClick={() => homeHeroBannerFileRef.current?.click()}
                    >
                      {homeHeroBannerUploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {homeHeroBannerUploading ? "Subiendo…" : "Subir imagen a R2"}
                    </Button>
                    <span className="text-xs text-muted-foreground">JPEG, PNG o WebP</span>
                  </div>
                  {homeHeroBannerUrl && (
                    <div className="rounded-xl overflow-hidden border border-border" style={{ maxHeight: 120 }}>
                      <img src={homeHeroBannerUrl} alt="Hero preview" className="w-full object-cover" style={{ maxHeight: 120 }} />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Carrusel de eventos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Image className="w-5 h-5 text-primary" />
                    Carrusel de eventos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(banners ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Sin banners. Agrega uno abajo.</p>
                  ) : (
                    <div className="space-y-3">
                      {(banners ?? []).map((banner) => (
                        <div key={banner.id} className="flex items-center gap-3 p-3 border rounded-xl">
                          <img src={banner.imageUrl} alt={banner.title ?? "Banner"} className="w-20 h-12 object-cover rounded-lg flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{banner.title ?? <span className="text-muted-foreground italic">Sin título</span>}</p>
                            {banner.linkUrl && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                <Link2 className="w-3 h-3" /> {banner.linkUrl}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => toggleBannerMutation.mutate({ id: banner.id, isActive: !banner.isActive })}
                              title={banner.isActive ? "Desactivar" : "Activar"}
                              className="text-muted-foreground hover:text-primary transition-colors"
                            >
                              {banner.isActive ? <ToggleRight className="w-6 h-6 text-primary" /> : <ToggleLeft className="w-6 h-6" />}
                            </button>
                            <button
                              onClick={() => { if (confirm("¿Eliminar este banner?")) deleteBannerMutation.mutate({ id: banner.id }); }}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="border-t pt-4 space-y-3">
                    <p className="text-sm font-semibold">Agregar banner</p>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">URL de imagen *</label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://..."
                          value={bannerForm.imageUrl}
                          onChange={(e) => setBannerForm((f) => ({ ...f, imageUrl: e.target.value }))}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-shrink-0"
                          onClick={() => {
                            const inp = document.createElement("input");
                            inp.type = "file";
                            inp.accept = "image/*";
                            inp.onchange = async () => {
                              const file = inp.files?.[0];
                              if (!file) return;
                              setBannerUploading(true);
                              try {
                                const reader = new FileReader();
                                reader.onload = async () => {
                                  const base64 = (reader.result as string).split(",")[1];
                                  const resp = await fetch("/api/upload/professional-photo", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    credentials: "include",
                                    body: JSON.stringify({ base64, mimeType: file.type, fileName: file.name }),
                                  });
                                  const data = await resp.json();
                                  if (data.url) setBannerForm((f) => ({ ...f, imageUrl: data.url }));
                                  else toast.error("Error al subir imagen");
                                };
                                reader.readAsDataURL(file);
                              } catch { toast.error("Error al subir imagen"); }
                              finally { setBannerUploading(false); }
                            };
                            inp.click();
                          }}
                          disabled={bannerUploading}
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          {bannerUploading ? "Subiendo..." : "Subir"}
                        </Button>
                      </div>
                      {bannerForm.imageUrl && (
                        <img src={bannerForm.imageUrl} alt="Preview" className="w-full max-h-32 object-cover rounded-lg" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Título (opcional)</label>
                      <Input
                        placeholder="Ej: Webinar gratuito de mindfulness"
                        value={bannerForm.title}
                        onChange={(e) => setBannerForm((f) => ({ ...f, title: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Link al hacer clic (opcional)</label>
                      <Input
                        placeholder="https://..."
                        value={bannerForm.linkUrl}
                        onChange={(e) => setBannerForm((f) => ({ ...f, linkUrl: e.target.value }))}
                      />
                    </div>
                    <Button
                      onClick={() => {
                        if (!bannerForm.imageUrl) { toast.error("La URL de imagen es requerida"); return; }
                        createBannerMutation.mutate({ imageUrl: bannerForm.imageUrl, title: bannerForm.title || undefined, linkUrl: bannerForm.linkUrl || undefined });
                      }}
                      disabled={createBannerMutation.isPending || !bannerForm.imageUrl}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {createBannerMutation.isPending ? "Agregando..." : "Agregar banner"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Carrusel de especialidades */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary" />
                    Carrusel de especialidades
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(homeCarousel ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin items. Los 6 items iniciales se cargarán automáticamente desde el servidor.</p>
                  ) : (
                    <div className="space-y-2">
                      {(homeCarousel ?? []).map((item: any) => (
                        <div key={item.id} className="flex items-center gap-3 p-2.5 border rounded-xl">
                          <img src={item.imageUrl} alt={item.title} className="w-16 h-10 object-cover rounded-lg flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{item.link}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => toggleHomeCarouselItemMutation.mutate({ id: item.id, isActive: !item.isActive })}
                              className="text-muted-foreground hover:text-primary transition-colors"
                            >
                              {item.isActive ? <ToggleRight className="w-6 h-6 text-primary" /> : <ToggleLeft className="w-6 h-6" />}
                            </button>
                            <button
                              onClick={() => { if (confirm(`¿Eliminar "${item.title}"?`)) deleteHomeCarouselItemMutation.mutate({ id: item.id }); }}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="border-t pt-4 space-y-3">
                    <p className="text-sm font-semibold">Agregar item</p>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Título *</label>
                      <Input
                        placeholder="Ej: Psicología"
                        value={carouselForm.title}
                        onChange={(e) => setCarouselForm((f) => ({ ...f, title: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">URL de imagen *</label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://..."
                          value={carouselForm.imageUrl}
                          onChange={(e) => setCarouselForm((f) => ({ ...f, imageUrl: e.target.value }))}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-shrink-0"
                          disabled={carouselUploading}
                          onClick={() => {
                            const inp = document.createElement("input");
                            inp.type = "file";
                            inp.accept = "image/*";
                            inp.onchange = async () => {
                              const file = inp.files?.[0];
                              if (!file) return;
                              setCarouselUploading(true);
                              try {
                                const url = await uploadSiteAsset(file);
                                setCarouselForm((f) => ({ ...f, imageUrl: url }));
                              } catch (err: any) {
                                toast.error(err?.message ?? "Error al subir imagen");
                              } finally { setCarouselUploading(false); }
                            };
                            inp.click();
                          }}
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          {carouselUploading ? "Subiendo..." : "Subir"}
                        </Button>
                      </div>
                      {carouselForm.imageUrl && (
                        <img src={carouselForm.imageUrl} alt="Preview" className="w-full max-h-24 object-cover rounded-lg mt-1" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Link</label>
                      <Input
                        placeholder="/especialidades"
                        value={carouselForm.link}
                        onChange={(e) => setCarouselForm((f) => ({ ...f, link: e.target.value }))}
                      />
                    </div>
                    <Button
                      onClick={() => {
                        if (!carouselForm.title || !carouselForm.imageUrl) { toast.error("Título e imagen son requeridos"); return; }
                        createHomeCarouselItemMutation.mutate(carouselForm);
                      }}
                      disabled={createHomeCarouselItemMutation.isPending || !carouselForm.title || !carouselForm.imageUrl}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {createHomeCarouselItemMutation.isPending ? "Agregando..." : "Agregar item"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Landing de profesionales ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Landing de profesionales</p>
              </div>

              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Upload className="w-4 h-4 text-primary" />
                    Video de landing profesionales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    URL del video que se mostrará en el modal de bienvenida de <code>/profesionales</code>. Pega un embed de YouTube o sube un archivo de video a R2.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://www.youtube.com/embed/..."
                      className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <Button
                      size="sm"
                      className="gradient-brand text-white border-0 flex-shrink-0"
                      disabled={setSiteConfigMutation.isPending}
                      onClick={() => setSiteConfigMutation.mutate({ key: "professionals_video_url", value: videoUrl })}
                    >
                      Guardar
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={videoFileRef}
                      type="file"
                      accept="video/mp4,video/webm"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setHeroVideoUploading(true);
                        try {
                          const url = await uploadSiteAsset(file);
                          setVideoUrl(url);
                          setSiteConfigMutation.mutate({ key: "professionals_video_url", value: url });
                        } catch (err: any) {
                          toast.error(err?.message ?? "Error al subir el video");
                        } finally {
                          setHeroVideoUploading(false);
                          if (videoFileRef.current) videoFileRef.current.value = "";
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1.5"
                      disabled={heroVideoUploading}
                      onClick={() => videoFileRef.current?.click()}
                    >
                      {heroVideoUploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {heroVideoUploading ? "Subiendo…" : "Subir archivo a R2"}
                    </Button>
                    <span className="text-xs text-muted-foreground">MP4 o WebM, máx 50 MB</span>
                  </div>
                  {videoUrl && (
                    <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl p-3 truncate">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{videoUrl}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Image className="w-4 h-4 text-primary" />
                    Banner hero profesionales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Imagen de fondo del hero en <code>/profesionales</code>. Pega una URL o sube una imagen a R2.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={bannerUrl}
                      onChange={(e) => setBannerUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <Button
                      size="sm"
                      className="gradient-brand text-white border-0 flex-shrink-0"
                      disabled={setSiteConfigMutation.isPending}
                      onClick={() => setSiteConfigMutation.mutate({ key: "professionals_banner_url", value: bannerUrl })}
                    >
                      Guardar
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={heroBannerFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setHeroBannerUploading(true);
                        try {
                          const url = await uploadSiteAsset(file);
                          setBannerUrl(url);
                          setSiteConfigMutation.mutate({ key: "professionals_banner_url", value: url });
                        } catch (err: any) {
                          toast.error(err?.message ?? "Error al subir la imagen");
                        } finally {
                          setHeroBannerUploading(false);
                          if (heroBannerFileRef.current) heroBannerFileRef.current.value = "";
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1.5"
                      disabled={heroBannerUploading}
                      onClick={() => heroBannerFileRef.current?.click()}
                    >
                      {heroBannerUploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {heroBannerUploading ? "Subiendo…" : "Subir imagen a R2"}
                    </Button>
                    <span className="text-xs text-muted-foreground">JPEG, PNG o WebP, máx 50 MB</span>
                  </div>
                  {bannerUrl && (
                    <div className="rounded-xl overflow-hidden border border-border" style={{ maxHeight: 140 }}>
                      <img src={bannerUrl} alt="Banner preview" className="w-full object-cover" style={{ maxHeight: 140 }} />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Image className="w-4 h-4 text-primary" />
                    Imagen de fondo del video
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Imagen de fondo del overlay del modal de bienvenida en <code>/profesionales</code>. Si no hay imagen, el fondo será crema (#F2F0ED).
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={videoBgUrl}
                      onChange={(e) => setVideoBgUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <Button
                      size="sm"
                      className="gradient-brand text-white border-0 flex-shrink-0"
                      disabled={setSiteConfigMutation.isPending}
                      onClick={() => setSiteConfigMutation.mutate({ key: "professionals_video_bg_url", value: videoBgUrl })}
                    >
                      Guardar
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={videoBgFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setVideoBgUploading(true);
                        try {
                          const url = await uploadSiteAsset(file);
                          setVideoBgUrl(url);
                          setSiteConfigMutation.mutate({ key: "professionals_video_bg_url", value: url });
                        } catch (err: any) {
                          toast.error(err?.message ?? "Error al subir la imagen");
                        } finally {
                          setVideoBgUploading(false);
                          if (videoBgFileRef.current) videoBgFileRef.current.value = "";
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1.5"
                      disabled={videoBgUploading}
                      onClick={() => videoBgFileRef.current?.click()}
                    >
                      {videoBgUploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {videoBgUploading ? "Subiendo…" : "Subir imagen a R2"}
                    </Button>
                    <span className="text-xs text-muted-foreground">JPEG, PNG o WebP</span>
                  </div>
                  {videoBgUrl && (
                    <div className="rounded-xl overflow-hidden border border-border" style={{ maxHeight: 140 }}>
                      <img src={videoBgUrl} alt="Fondo video preview" className="w-full object-cover" style={{ maxHeight: 140 }} />
                    </div>
                  )}
                  {videoBgUrl && (
                    <button
                      className="text-xs text-red-500 hover:text-red-700 underline"
                      onClick={() => { setVideoBgUrl(""); setSiteConfigMutation.mutate({ key: "professionals_video_bg_url", value: "" }); }}
                    >
                      Quitar imagen (volver a fondo crema)
                    </button>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Especialidades ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Especialidades</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                                {s.icon && SPECIALTY_ICON_MAP[s.icon] ? SPECIALTY_ICON_MAP[s.icon] : <Stethoscope className="w-5 h-5" />}
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
                                  if (isOpening) setEditingDesc((prev) => ({ ...prev, [s.id]: s.description ?? "" }));
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
          </div>
        )}

        {/* ══ TAB: CITAS ════════════════════════════════════════════════════ */}
        {activeTab === "citas" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>Citas</h2>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar usuario o profesional..."
                  value={citasSearch}
                  onChange={(e) => setCitasSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <Select value={citasStatus || "all"} onValueChange={(v) => setCitasStatus(v === "all" ? "" : v)}>
                <SelectTrigger className="w-36 h-9 text-sm">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="scheduled">Confirmadas</SelectItem>
                  <SelectItem value="pending_review">Pendiente revisión</SelectItem>
                  <SelectItem value="completed">Completadas</SelectItem>
                  <SelectItem value="canceled">Canceladas</SelectItem>
                  <SelectItem value="no-show">No asistió</SelectItem>
                </SelectContent>
              </Select>
              <input
                type="date"
                value={citasDateFrom}
                onChange={(e) => setCitasDateFrom(e.target.value)}
                className="h-9 px-3 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Desde"
              />
              <input
                type="date"
                value={citasDateTo}
                onChange={(e) => setCitasDateTo(e.target.value)}
                className="h-9 px-3 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Hasta"
              />
              <Button size="sm" variant="outline" onClick={() => refetchAppointments()} className="h-9">
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Buscar
              </Button>
            </div>

            {/* Results table */}
            <Card>
              <CardContent className="p-0">
                {loadingAppointments ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">Cargando citas…</div>
                ) : (appointmentResults ?? []).length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">Sin resultados.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-xs text-muted-foreground">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium">Usuario</th>
                          <th className="text-left px-4 py-3 font-medium">Profesional</th>
                          <th className="text-left px-4 py-3 font-medium">Especialidad</th>
                          <th className="text-left px-4 py-3 font-medium">Fecha</th>
                          <th className="text-left px-4 py-3 font-medium">Estado</th>
                          <th className="text-left px-4 py-3 font-medium">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(appointmentResults ?? []).map((apt: any) => {
                          const dateStr = apt.appointmentDate
                            ? format(new Date(apt.appointmentDate), "dd MMM yyyy HH:mm", { locale: es })
                            : "—";
                          const statusColors: Record<string, string> = {
                            scheduled: "bg-emerald-100 text-emerald-700",
                            pending_review: "bg-yellow-100 text-yellow-700",
                            completed: "bg-blue-100 text-blue-700",
                            canceled: "bg-red-100 text-red-700",
                            "no-show": "bg-gray-100 text-gray-600",
                          };
                          const statusLabels: Record<string, string> = {
                            scheduled: "Confirmada",
                            pending_review: "Pend. revisión",
                            completed: "Completada",
                            canceled: "Cancelada",
                            "no-show": "No asistió",
                          };
                          const canCancel = !["canceled", "completed", "no-show"].includes(apt.status);
                          const canReactivate = apt.status === "canceled";
                          return (
                            <tr key={apt.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3">
                                <div className="font-medium truncate max-w-[140px]">{apt.userName}</div>
                                <div className="text-xs text-muted-foreground truncate max-w-[140px]">{apt.userEmail}</div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="truncate max-w-[120px] block">{apt.professionalName}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-xs text-muted-foreground">{apt.specialtyName ?? "—"}</span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs">{dateStr}</td>
                              <td className="px-4 py-3">
                                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusColors[apt.status] ?? "bg-gray-100 text-gray-600"}`}>
                                  {statusLabels[apt.status] ?? apt.status}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  {apt.videoCallLink && (
                                    <a
                                      href={apt.videoCallLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                      title="Enlace de videollamada"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      Video
                                    </a>
                                  )}
                                  {canCancel && (
                                    <button
                                      onClick={() => {
                                        if (confirm(`¿Cancelar la cita #${apt.id}?`)) {
                                          cancelAppointmentMutation.mutate({ appointmentId: apt.id, reason: "Cancelada por admin" });
                                        }
                                      }}
                                      disabled={cancelAppointmentMutation.isPending}
                                      className="text-xs text-red-500 hover:text-red-700 transition-colors"
                                    >
                                      Cancelar
                                    </button>
                                  )}
                                  {canReactivate && (
                                    <button
                                      onClick={() => {
                                        if (confirm(`¿Reactivar la cita #${apt.id}?`)) {
                                          reactivateAppointmentMutation.mutate({ appointmentId: apt.id });
                                        }
                                      }}
                                      disabled={reactivateAppointmentMutation.isPending}
                                      className="text-xs text-emerald-600 hover:text-emerald-800 transition-colors"
                                    >
                                      Reactivar
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

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
                              {format(parseLocalDate(apt.appointmentDate), "d MMM yyyy, HH:mm", { locale: es })}
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
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
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
                          <div className="flex flex-col gap-2 sm:flex-shrink-0 sm:min-w-[160px]">
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
                              className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 w-full sm:w-auto"
                              onClick={() => approveMutation.mutate({ professionalId: pro.id, tier: selectedTier })}
                              disabled={approveMutation.isPending}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Aprobar como {selectedTier === "pro" ? "Pro" : "Básico"}
                            </Button>

                            {/* Rechazar */}
                            <div className="flex flex-row gap-2">
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
                        {(pro.licenseDocument || pro.identityDocUrl || pro.certifications) && (
                          <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
                            {pro.documentNationality && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-lg px-2 py-1">
                                {pro.documentNationality}
                              </span>
                            )}
                            {pro.licenseDocument && pro.licenseDocument.startsWith("http") && (
                              <a href={pro.licenseDocument} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-primary border border-primary/30 rounded-lg px-2 py-1 hover:bg-primary/5">
                                <FileText className="w-3 h-3" />
                                Cédula profesional
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            {pro.identityDocUrl && pro.identityDocUrl.startsWith("http") && (
                              <a href={pro.identityDocUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-primary border border-primary/30 rounded-lg px-2 py-1 hover:bg-primary/5">
                                <FileText className="w-3 h-3" />
                                Identificación oficial
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            {pro.certifications && pro.certifications.startsWith("http") && (
                              <a href={pro.certifications} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-primary border border-primary/30 rounded-lg px-2 py-1 hover:bg-primary/5">
                                <FileText className="w-3 h-3" />
                                Certificaciones
                                <ExternalLink className="w-3 h-3" />
                              </a>
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
        {activeTab === "activos" && (() => {
          const allActivos = activeProfessionals ?? [];
          const uniqueSpecialties = Array.from(
            new Set(allActivos.map((p: any) => p.specialtyName).filter(Boolean))
          ).sort() as string[];

          const filtered = allActivos.filter((p: any) => {
            const name = p.userName || p.userEmail?.split("@")[0] || "";
            const q = activosSearch.toLowerCase();
            const matchesSearch = !q ||
              name.toLowerCase().includes(q) ||
              (p.userEmail ?? "").toLowerCase().includes(q) ||
              (p.specialtyName ?? "").toLowerCase().includes(q);
            const matchesSpecialty = !activosSpecialty || p.specialtyName === activosSpecialty;
            return matchesSearch && matchesSpecialty;
          });

          const groupedBySpecialty = filtered.reduce((acc: Record<string, any[]>, p: any) => {
            const key = p.specialtyName || "Sin especialidad";
            if (!acc[key]) acc[key] = [];
            acc[key].push(p);
            return acc;
          }, {});

          const renderCard = (pro: any) => {
            const name = pro.userName || pro.userEmail?.split("@")[0] || `Profesional #${pro.id}`;
            const avatar = pro.profilePhoto;
            return (
              <Card key={pro.id} className="border-border">
                <CardContent className="p-4 space-y-3">
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
                    <button
                      onClick={() => { setRevokeConfirm({ professionalId: pro.id, name }); setRevokeReason(""); }}
                      className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-700 transition-colors"
                      title="Revocar acceso"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Revocar
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          };

          return (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
                  Profesionales activos
                </h2>
                <span className="text-sm text-muted-foreground">{filtered.length} de {allActivos.length}</span>
              </div>

              {/* Filtros */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, email o especialidad..."
                    value={activosSearch}
                    onChange={(e) => setActivosSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors placeholder:text-muted-foreground"
                  />
                </div>
                <Select value={activosSpecialty || "all"} onValueChange={(v) => setActivosSpecialty(v === "all" ? "" : v)}>
                  <SelectTrigger className="sm:w-52">
                    <SelectValue placeholder="Todas las especialidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las especialidades</SelectItem>
                    {uniqueSpecialties.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filtered.length === 0 ? (
                <Card className="border-border border-dashed">
                  <CardContent className="p-10 text-center">
                    <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">
                      {allActivos.length === 0 ? "No hay profesionales aprobados aún" : "Ningún profesional coincide con la búsqueda"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-8">
                  {Object.entries(groupedBySpecialty).sort(([a], [b]) => a.localeCompare(b)).map(([specialty, pros]) => (
                    <div key={specialty} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold" style={{ fontFamily: "Poppins, sans-serif" }}>{specialty}</h3>
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">{pros.length}</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pros.map((pro: any) => renderCard(pro))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Revocar AlertDialog ── */}
              <AlertDialog open={revokeConfirm !== null} onOpenChange={(open) => { if (!open) { setRevokeConfirm(null); setRevokeReason(""); } }}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Revocar acceso a {revokeConfirm?.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción suspenderá su cuenta. El profesional recibirá un email con el motivo.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-2">
                  <textarea
                    placeholder="Motivo de revocación (obligatorio)..."
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-border p-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 resize-none"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={!revokeReason.trim() || revokeMutation.isPending}
                    className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 disabled:opacity-50"
                    onClick={() => {
                      if (revokeConfirm && revokeReason.trim()) {
                        revokeMutation.mutate({ professionalId: revokeConfirm.professionalId, reason: revokeReason.trim() });
                      }
                    }}
                  >
                    {revokeMutation.isPending ? "Revocando..." : "Revocar acceso"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
              </AlertDialog>

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

                        {/* Nacionalidad del documento */}
                        {proDocuments.documentNationality && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Nacionalidad del documento</p>
                            <p className="text-sm font-medium">{proDocuments.documentNationality}</p>
                          </div>
                        )}

                        {/* Cédula profesional */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Cédula profesional</p>
                          {proDocuments.licenseDocument ? (
                            /\.(jpg|jpeg|png|gif|webp)$/i.test(proDocuments.licenseDocument) ? (
                              <img src={proDocuments.licenseDocument} alt="Cédula profesional" className="w-full rounded-xl border border-border object-contain max-h-64" />
                            ) : (
                              <a href={proDocuments.licenseDocument} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-primary hover:underline bg-primary/5 px-3 py-2.5 rounded-lg">
                                <FileText className="w-4 h-4 flex-shrink-0" />
                                Abrir cédula profesional (PDF)
                                <ExternalLink className="w-3.5 h-3.5 ml-auto flex-shrink-0" />
                              </a>
                            )
                          ) : (
                            <p className="text-xs text-muted-foreground italic">No proporcionada</p>
                          )}
                        </div>

                        {/* Identificación oficial */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Identificación oficial</p>
                          {proDocuments.identityDocUrl ? (
                            /\.(jpg|jpeg|png|gif|webp)$/i.test(proDocuments.identityDocUrl) ? (
                              <img src={proDocuments.identityDocUrl} alt="Identificación oficial" className="w-full rounded-xl border border-border object-contain max-h-64" />
                            ) : (
                              <a href={proDocuments.identityDocUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-primary hover:underline bg-primary/5 px-3 py-2.5 rounded-lg">
                                <FileText className="w-4 h-4 flex-shrink-0" />
                                Abrir identificación oficial (PDF)
                                <ExternalLink className="w-3.5 h-3.5 ml-auto flex-shrink-0" />
                              </a>
                            )
                          ) : (
                            <p className="text-xs text-muted-foreground italic">No proporcionada</p>
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
          );
        })()}


        {/* Tab: Herramientas */}
        {activeTab === "herramientas" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
              Herramientas del sistema
            </h2>
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

            </div>
          </div>
        )}

        {/* ══ TAB: CÓDIGOS ═════════════════════════════════════════════════ */}
        {activeTab === "codigos" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>Códigos</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              {/* ── Columna izquierda: Códigos de descuento ── */}
              <div className="flex flex-col gap-4 min-h-[500px]">
                {/* Formulario nuevo código — arriba */}
                <Card className="border-border">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Tag className="w-4 h-4 text-primary" />
                      Nuevo código
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="CÓDIGO (ej. BIENVENIDA20)"
                        value={discountForm.code}
                        onChange={(e) => setDiscountForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                        className="text-xs h-8 font-mono col-span-2"
                        maxLength={50}
                      />
                      <Select
                        value={discountForm.type}
                        onValueChange={(v) => setDiscountForm((f) => ({ ...f, type: v as "percentage" | "fixed" }))}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                          <SelectItem value="fixed">Monto fijo ($)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder={discountForm.type === "percentage" ? "Valor (ej. 20)" : "Valor MXN"}
                        value={discountForm.value}
                        onChange={(e) => setDiscountForm((f) => ({ ...f, value: e.target.value }))}
                        className="text-xs h-8"
                        min={0}
                      />
                      <Input
                        type="number"
                        placeholder="Usos máx. (opcional)"
                        value={discountForm.maxUses}
                        onChange={(e) => setDiscountForm((f) => ({ ...f, maxUses: e.target.value }))}
                        className="text-xs h-8"
                        min={1}
                      />
                      <Input
                        type="date"
                        value={discountForm.expiresAt}
                        onChange={(e) => setDiscountForm((f) => ({ ...f, expiresAt: e.target.value }))}
                        className="text-xs h-8"
                      />
                    </div>
                    <Button
                      size="sm"
                      className="gradient-brand text-white border-0 w-full h-8"
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

                {/* Tabla — abajo, crece para igualar altura */}
                <Card className="border-border flex-1 flex flex-col">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm text-muted-foreground">Códigos de descuento</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {(!discountCodes || discountCodes.length === 0) ? (
                      <p className="text-xs text-muted-foreground text-center py-6">No hay códigos creados</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-muted-foreground border-b border-border">
                              <th className="text-left py-1.5 font-medium pr-3">Código</th>
                              <th className="text-left py-1.5 font-medium pr-3">Desc.</th>
                              <th className="text-left py-1.5 font-medium pr-3">Usos</th>
                              <th className="text-left py-1.5 font-medium pr-3">Vence</th>
                              <th className="text-left py-1.5 font-medium pr-3">Estado</th>
                              <th className="py-1.5" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {(discountCodes as any[]).map((dc) => {
                              const isExpired = dc.expiresAt && new Date(dc.expiresAt) < new Date();
                              const isExhausted = dc.maxUses !== null && dc.usedCount >= dc.maxUses;
                              return (
                                <tr key={dc.id} className="hover:bg-muted/30 transition-colors">
                                  <td className="py-2 font-mono font-semibold pr-3">{dc.code}</td>
                                  <td className="py-2 pr-3">
                                    <span className="flex items-center gap-0.5">
                                      {dc.type === "percentage"
                                        ? <><Percent className="w-3 h-3" />{Number(dc.value)}%</>
                                        : <>${Number(dc.value)}</>}
                                    </span>
                                  </td>
                                  <td className="py-2 text-muted-foreground pr-3">
                                    {dc.usedCount}{dc.maxUses !== null ? `/${dc.maxUses}` : ""}
                                  </td>
                                  <td className="py-2 text-muted-foreground pr-3">
                                    {dc.expiresAt ? format(new Date(dc.expiresAt), "dd/MM/yy") : "—"}
                                  </td>
                                  <td className="py-2 pr-3">
                                    {isExpired || isExhausted ? (
                                      <Badge className="bg-gray-100 text-gray-500 border-0 text-[10px] px-1.5 py-0">
                                        {isExpired ? "Expirado" : "Agotado"}
                                      </Badge>
                                    ) : dc.isActive ? (
                                      <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] px-1.5 py-0">Activo</Badge>
                                    ) : (
                                      <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] px-1.5 py-0">Inactivo</Badge>
                                    )}
                                  </td>
                                  <td className="py-2">
                                    <div className="flex items-center gap-0.5 justify-end">
                                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                                        title={dc.isActive ? "Desactivar" : "Activar"}
                                        onClick={() => toggleDiscountMutation.mutate({ id: dc.id, isActive: !dc.isActive })}>
                                        {dc.isActive
                                          ? <ToggleRight className="w-4 h-4 text-emerald-600" />
                                          : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                                      </Button>
                                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600"
                                        title="Eliminar"
                                        onClick={() => deleteDiscountMutation.mutate({ id: dc.id })}>
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
                  </CardContent>
                </Card>
              </div>

              {/* ── Columna derecha: Tarjetas prepago ── */}
              <div className="flex flex-col gap-4 min-h-[500px]">
                {/* Formulario generar tarjeta — arriba */}
                <Card className="border-border">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CardIcon className="w-4 h-4 text-primary" />
                      Generar tarjeta
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2.5">
                    <Select
                      value={prepaidProductType}
                      onValueChange={(v) => setPrepaidProductType(v as typeof prepaidProductType)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual_basic">Sesión Básica — 350 créditos</SelectItem>
                        <SelectItem value="individual_premium">Sesión Premium — 1,500 créditos</SelectItem>
                        <SelectItem value="plan_basic">Plan Básico — 980 créditos</SelectItem>
                        <SelectItem value="plan_pro">Plan Pro — 2,500 créditos</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      className="gradient-brand text-white border-0 w-full"
                      disabled={createPrepaidMutation.isPending}
                      onClick={() => createPrepaidMutation.mutate({ productType: prepaidProductType })}
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      {createPrepaidMutation.isPending ? "Generando..." : "Generar tarjeta"}
                    </Button>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Código único XXXX-XXXX-XXXX-XXXX que el usuario canjea en su wallet para acreditar créditos.
                    </p>
                  </CardContent>
                </Card>

                {/* Lista tarjetas — abajo, crece para igualar altura */}
                <Card className="border-border flex-1 flex flex-col">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm text-muted-foreground">Tarjetas generadas</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {(!prepaidCards || prepaidCards.length === 0) ? (
                      <p className="text-xs text-muted-foreground text-center py-6">No hay tarjetas generadas</p>
                    ) : (
                      <div className="max-h-[320px] overflow-y-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                        <div className="space-y-1.5">
                          {(prepaidCards as any[]).map((card) => (
                            <div
                              key={card.id}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-border transition-colors ${card.isUsed ? "opacity-50 bg-muted/30" : "bg-background hover:bg-muted/20"}`}
                            >
                              <span className="font-mono text-[11px] font-semibold tracking-wider flex-1 min-w-0 truncate">{card.code}</span>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {card.productType === "individual_basic" ? "Básica" :
                                 card.productType === "individual_premium" ? "Premium" :
                                 card.productType === "plan_basic" ? "Plan B" : "Plan Pro"}
                              </span>
                              <span className="text-[10px] text-muted-foreground shrink-0">{card.credits} cr</span>
                              {card.isUsed ? (
                                <div className="shrink-0 text-right">
                                  <Badge className="bg-gray-100 text-gray-500 border-0 text-[10px] px-1.5 py-0 block">Usada</Badge>
                                  {card.usedByEmail && (
                                    <p className="text-[9px] text-muted-foreground truncate max-w-[80px]">{card.usedByEmail}</p>
                                  )}
                                </div>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] px-1.5 py-0 shrink-0">Disponible</Badge>
                              )}
                              <div className="flex items-center gap-0.5 shrink-0">
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                  title="Copiar" onClick={() => { navigator.clipboard.writeText(card.code); toast.success("Código copiado"); }}>
                                  <Copy className="w-3.5 h-3.5" />
                                </Button>
                                {!card.isUsed && (
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600"
                                    title="Eliminar" onClick={() => deletePrepaidMutation.mutate({ id: card.id })}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
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
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-destructive/30 text-destructive hover:bg-destructive/5"
                            onClick={() => {
                              if (rejectingWithdrawalId === w.id) {
                                setRejectingWithdrawalId(null);
                                setRejectNote("");
                              } else {
                                setRejectingWithdrawalId(w.id);
                                setRejectNote("");
                              }
                            }}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Rechazar
                          </Button>
                          {rejectingWithdrawalId === w.id && (
                            <div className="space-y-2">
                              <textarea
                                value={rejectNote}
                                onChange={(e) => setRejectNote(e.target.value)}
                                placeholder="Motivo (opcional)..."
                                className="w-full rounded-lg border border-border p-2 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-destructive/40 min-h-[56px] resize-none"
                              />
                              <Button
                                size="sm"
                                className="w-full bg-destructive hover:bg-destructive/90 text-white border-0"
                                disabled={rejectWithdrawalMutation.isPending}
                                onClick={() => rejectWithdrawalMutation.mutate({ withdrawalId: w.id, adminNote: rejectNote || undefined })}
                              >
                                Confirmar rechazo
                              </Button>
                            </div>
                          )}
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
                <Card key={plan.id} className="border-border overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold">{plan.name}</h3>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          title="Editar plan"
                          onClick={() => {
                            if (editingPlanId === plan.id) {
                              setEditingPlanId(null);
                            } else {
                              setEditingPlanId(plan.id);
                              setEditPlanForm({
                                name: plan.name ?? "",
                                price: String(plan.price ?? ""),
                                description: plan.description ?? "",
                                maxAppointmentsPerMonth: plan.maxAppointmentsPerMonth != null ? String(plan.maxAppointmentsPerMonth) : "",
                                maxMinutesPerAppointment: plan.maxMinutesPerAppointment != null ? String(plan.maxMinutesPerAppointment) : "",
                              });
                            }
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Desactivar plan"
                          onClick={() => { if (confirm(`¿Desactivar el plan "${plan.name}"?`)) deletePlanMutation.mutate({ id: plan.id }); }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-primary mb-2">${plan.price} <span className="text-sm font-normal text-muted-foreground">MXN/mes</span></p>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>Citas/mes: {plan.maxAppointmentsPerMonth ?? "Ilimitadas"}</p>
                      <p>Min/cita: {plan.maxMinutesPerAppointment ?? "Sin límite"}</p>
                    </div>
                    {editingPlanId === plan.id && (
                      <div className="mt-4 pt-4 border-t border-border space-y-2">
                        <input
                          type="text"
                          value={editPlanForm.name}
                          onChange={(e) => setEditPlanForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="Nombre"
                          className="w-full rounded-lg border border-border p-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                        <input
                          type="number"
                          value={editPlanForm.price}
                          onChange={(e) => setEditPlanForm((f) => ({ ...f, price: e.target.value }))}
                          placeholder="Precio MXN"
                          className="w-full rounded-lg border border-border p-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                        <input
                          type="number"
                          value={editPlanForm.maxAppointmentsPerMonth}
                          onChange={(e) => setEditPlanForm((f) => ({ ...f, maxAppointmentsPerMonth: e.target.value }))}
                          placeholder="Citas/mes (vacío = ilimitadas)"
                          className="w-full rounded-lg border border-border p-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                        <textarea
                          value={editPlanForm.description}
                          onChange={(e) => setEditPlanForm((f) => ({ ...f, description: e.target.value }))}
                          placeholder="Descripción"
                          className="w-full rounded-lg border border-border p-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 min-h-[48px] resize-none"
                        />
                        <Button
                          size="sm"
                          className="w-full gradient-brand text-white border-0 text-xs"
                          disabled={updatePlanMutation.isPending}
                          onClick={() => updatePlanMutation.mutate({
                            id: plan.id,
                            name: editPlanForm.name || undefined,
                            price: editPlanForm.price || undefined,
                            maxAppointmentsPerMonth: editPlanForm.maxAppointmentsPerMonth !== "" ? Number(editPlanForm.maxAppointmentsPerMonth) : null,
                            description: editPlanForm.description || undefined,
                          })}
                        >
                          {updatePlanMutation.isPending ? "Guardando..." : "Guardar cambios"}
                        </Button>
                      </div>
                    )}
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
