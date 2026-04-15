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
  Plus, Star, BarChart3, ArrowLeft, AlertCircle, XCircle,
  Camera, Trash2, MessageSquare, CalendarX,
  ChevronLeft, ChevronRight, LayoutDashboard, DollarSign, Wallet,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import DashboardLayout from "../components/DashboardLayout";
import { VideoCallPanel } from "../components/VideoCallPanel";

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
  const [activeTab, setActiveTab] = useState<"resumen" | "agenda" | "disponibilidad" | "resenas" | "ganancias" | "perfil">(() => {
    if (typeof window === "undefined") return "resumen";
    const hash = window.location.hash.slice(1);
    const hashMap: Record<string, string> = { citas: "agenda", "dias-libres": "disponibilidad" };
    const mapped = hashMap[hash] ?? hash;
    const valid = ["resumen", "agenda", "disponibilidad", "resenas", "ganancias", "perfil"];
    return (valid.includes(mapped) ? mapped : "resumen") as "resumen" | "agenda" | "disponibilidad" | "resenas" | "ganancias" | "perfil";
  });
  const [availSubTab, setAvailSubTab] = useState<"horarios" | "dias-libres">("horarios");
  const [newSlot, setNewSlot] = useState({ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" });
  // Which day card has the inline add-form open (0-6 = day index, null = closed)
  const [addingSlotForDay, setAddingSlotForDay] = useState<number | null>(null);
  const [inlineSlot, setInlineSlot] = useState({ startTime: "09:00", endTime: "17:00" });
  // Blocked-days calendar state
  const [blockedCalMonth, setBlockedCalMonth] = useState(() => {
    const d = new Date(); d.setDate(1); return d;
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "", bio: "", education: "", certifications: "",
    yearsOfExperience: "", languages: "Español",
  });
  const [newBlockedDate, setNewBlockedDate] = useState("");
  const [newBlockedReason, setNewBlockedReason] = useState("");
  const [attendanceModal, setAttendanceModal] = useState<any | null>(null);
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: "",
    paymentMethod: "clabe" as "clabe" | "binance" | "paypal" | "other",
    paymentDetails: "",
    notes: "",
  });
  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const canJoin = (apt: { appointmentDate: string | Date }) =>
    nowMs >= new Date(apt.appointmentDate).getTime() - 5 * 60 * 1000;
  const joinCountdown = (apt: { appointmentDate: string | Date }) => {
    const ms = new Date(apt.appointmentDate).getTime() - 5 * 60 * 1000 - nowMs;
    if (ms <= 0) return "";
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };
  const [activeCall, setActiveCall] = useState<{
    url: string;
    appointmentId: number;
    professionalName: string;
    startTime: Date;
    endTime: Date;
  } | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCerts, setUploadingCerts] = useState(false);
  const certFileInputRef = useRef<HTMLInputElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollCarousel = (dir: "left" | "right") => {
    carouselRef.current?.scrollBy({ left: dir === "left" ? -220 : 220, behavior: "smooth" });
  };
  const [viewportW, setViewportW] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  useEffect(() => {
    const fn = () => setViewportW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

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

  const { data: earningsHistory, refetch: refetchEarningsHistory } = trpc.professional.getEarningsHistory.useQuery(
    undefined,
    { enabled: isAuthenticated && activeTab === "ganancias" }
  );

  const requestWithdrawalMutation = trpc.professional.requestWithdrawal.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setWithdrawalOpen(false);
      setWithdrawalForm({ amount: "", paymentMethod: "clabe", paymentDetails: "", notes: "" });
      refetchEarningsHistory();
    },
    onError: (err) => toast.error(err.message ?? "Error al solicitar el retiro"),
  });

  const addAvailabilityMutation = trpc.professional.setAvailability.useMutation({
    onSuccess: () => {
      refetchAvailability();
      toast.success("Disponibilidad actualizada");
    },
    onError: (err) => {
      console.error("[CLIENT setAvailability error]", err.message, err.data);
      toast.error("Error al actualizar disponibilidad");
    },
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
      toast.success("Sesión completada. El usuario debe calificar para liberar el pago.");
      refetchAppointments();
    },
    onError: () => toast.error("Error al actualizar la cita"),
  });

  const markNoShowMutation = trpc.appointment.markNoShow.useMutation({
    onSuccess: () => {
      toast.success("No-show registrado.");
      refetchAppointments();
    },
    onError: () => toast.error("Error al registrar no-show"),
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

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      const hashMap: Record<string, string> = { citas: "agenda", "dias-libres": "disponibilidad" };
      const mapped = hashMap[hash] ?? hash;
      const valid = ['resumen', 'agenda', 'disponibilidad', 'resenas', 'ganancias', 'perfil'];
      if (valid.includes(mapped)) setActiveTab(mapped as any);
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

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

  // Parse certifications: JSON array of URLs, or legacy plain string
  const parseCerts = (raw: string): string[] => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [raw];
    } catch {
      return [raw];
    }
  };

  const handleCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast.error("Solo se permiten PDF, JPG, PNG o WebP");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("El archivo no puede superar 10 MB");
      return;
    }
    setUploadingCerts(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/upload/professional-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mimeType: file.type, fileName: file.name }),
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      const existing = parseCerts(profileForm.certifications);
      setProfileForm((f) => ({ ...f, certifications: JSON.stringify([...existing, data.url]) }));
    } catch {
      toast.error("Error al subir el documento");
    } finally {
      setUploadingCerts(false);
      if (certFileInputRef.current) certFileInputRef.current.value = "";
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

  // Card width: 3 on desktop (≥1024), 2 on tablet (≥640), 1.2 on mobile
  const cardMinWidth: React.CSSProperties =
    viewportW >= 1024
      ? { minWidth: "calc((100% - 48px) / 3)" }   // 3 cards, 2 gaps × 24px
      : viewportW >= 640
      ? { minWidth: "calc((100% - 24px) / 2)" }    // 2 cards, 1 gap × 24px
      : { minWidth: "85%" };                        // 1.2 cards on mobile

  // Withdrawal modal derived values — must be at component level (used outside ganancias IIFE)
  const wAmount = parseFloat(withdrawalForm.amount || "0");
  const wBalance = parseFloat((wallet as any)?.wallet?.balance ?? "0");
  const wValid = wAmount >= 1000 && wAmount <= wBalance && withdrawalForm.paymentDetails.trim().length > 0;

  return (
    <DashboardLayout>
      <div className={activeCall ? "flex gap-4 p-4 md:p-6 items-start" : ""}>
      <div style={activeCall ? { flex: 1, minWidth: 0 } : {}} className={activeCall ? "p-0" : "p-4 md:p-6"}>
      {/* Header compacto */}
      <div className="bg-white rounded-2xl border border-[rgba(96,117,98,0.12)] shadow-sm p-4 mb-4">
        {/* Fila superior: avatar + nombre + tier + rating */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative group flex-shrink-0">
            <div className="w-12 h-12 overflow-hidden rounded-xl">
              {profile.profilePhoto || (user as any)?.profileImage ? (
                <img
                  src={profile.profilePhoto ?? (user as any)?.profileImage}
                  alt={user?.name ?? "Profesional"}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-base font-bold text-white gradient-brand">
                  {user?.name?.charAt(0) ?? "P"}
                </div>
              )}
            </div>
            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer rounded-xl"
            >
              {uploadingPhoto ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Camera className="w-4 h-4 text-white" />
              )}
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-foreground truncate">{user?.name ?? "Profesional"}</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium flex-shrink-0">
                Tier {profile.tier === "pro" ? "Pro" : "Básico"}
              </span>
              {reviews && reviews.length > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-amber-500 flex-shrink-0">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {(reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1)}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Panel del profesional</p>
          </div>
        </div>
        {/* 4 métricas en scroll horizontal */}
        <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
          {[
            { Icon: Wallet, label: "Balance", value: `$${wallet?.wallet?.balance ? parseFloat(String(wallet.wallet.balance)).toFixed(0) : "0"}`, color: "text-emerald-600", bg: "bg-emerald-50" },
            { Icon: CheckCircle2, label: "Completadas", value: String(appointments?.filter((a: any) => a.status === "completed" || a.status === "no-show" || a.status === "pending_review").length ?? 0), color: "text-blue-600", bg: "bg-blue-50" },
            { Icon: Star, label: "Calificación", value: reviews && reviews.length > 0 ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1) : "—", color: "text-amber-500", bg: "bg-amber-50" },
            { Icon: Calendar, label: "Próximas", value: String(appointments?.filter((a: any) => a.status === "scheduled").length ?? 0), color: "text-primary", bg: "bg-primary/10" },
          ].map(({ Icon, label, value, color, bg }) => (
            <div key={label} className={`flex-shrink-0 ${bg} rounded-xl px-3 py-2 min-w-[90px]`}>
              <Icon className={`w-3.5 h-3.5 ${color} mb-1`} />
              <p className={`text-base font-bold leading-none ${color}`}>{value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
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
          <div className="mb-5">
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
                <Button
                  size="sm"
                  disabled={!canJoin(nextWithVideo)}
                  className="gradient-brand text-white border-0 text-xs h-8 px-3 flex-shrink-0 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={() => canJoin(nextWithVideo) && setActiveCall({
                    url: (nextWithVideo as any).videoCallLink,
                    appointmentId: nextWithVideo.id,
                    professionalName: (nextWithVideo as any).userName ?? `Usuario #${nextWithVideo.userId}`,
                    startTime: new Date(nextWithVideo.appointmentDate),
                    endTime: new Date(new Date(nextWithVideo.appointmentDate).getTime() + (nextWithVideo.durationMinutes ?? 55) * 60 * 1000),
                  })}
                >
                  <Video className="w-3 h-3 mr-1" />
                  {canJoin(nextWithVideo) ? "Iniciar sesión" : `En ${joinCountdown(nextWithVideo)}`}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tab bar con scroll horizontal */}
      <div className="flex overflow-x-auto bg-white rounded-xl border border-[rgba(96,117,98,0.12)] mb-4 -mx-4 md:-mx-6 px-2" style={{ scrollbarWidth: "none" }}>
        {([
          { id: "resumen",        label: "Resumen",        Icon: LayoutDashboard },
          { id: "agenda",         label: "Agenda",         Icon: Calendar },
          { id: "disponibilidad", label: "Disponibilidad", Icon: Clock },
          { id: "resenas",        label: "Reseñas",        Icon: Star },
          { id: "ganancias",      label: "Ganancias",      Icon: DollarSign },
          { id: "perfil",         label: "Perfil",         Icon: User },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); window.location.hash = tab.id; }}
            className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium whitespace-nowrap flex-shrink-0 border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.Icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div>

        {/* Tab: Resumen */}
        {activeTab === "resumen" && (
          <div className="space-y-6">
            {/* Próximas citas — carrusel */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>Próximas citas</h2>
                {upcomingAppointments.length > 0 && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => scrollCarousel("left")} className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => scrollCarousel("right")} className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              {upcomingAppointments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-6 text-center space-y-3">
                  <Calendar className="w-10 h-10 text-primary/40 mx-auto" />
                  <p className="font-medium text-foreground">¡Comparte tu perfil y consigue más pacientes!</p>
                  <p className="text-sm text-muted-foreground">Aún no tienes citas próximas. Comparte tu enlace de perfil para que los pacientes puedan agendarte.</p>
                  <button
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
                    onClick={() => {
                      const url = `${window.location.origin}/profesional/${profile.id}`;
                      navigator.clipboard.writeText(url).then(() => toast.success("Enlace copiado al portapapeles"));
                    }}
                  >
                    Copiar enlace de perfil
                  </button>
                </div>
              ) : (
                <div ref={carouselRef} className="flex gap-3 overflow-x-auto scroll-smooth pb-1" style={{ scrollbarWidth: "none" }}>
                  {upcomingAppointments.map((apt) => (
                    <div key={apt.id} className="flex-shrink-0 rounded-xl border border-border bg-card hover:shadow-md transition-shadow" style={cardMinWidth}>
                      <div className="p-4">
                        <div className="flex items-center gap-2">
                          {(apt as any).userProfileImage ? (
                            <img src={(apt as any).userProfileImage} alt={(apt as any).userName ?? ""} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                              {(apt as any).userName?.charAt(0)?.toUpperCase() ?? "U"}
                            </div>
                          )}
                          <p className="font-semibold text-sm truncate flex-1">{(apt as any).userName ?? `Usuario #${apt.userId}`}</p>
                          <span className="text-[10px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5 flex-shrink-0 whitespace-nowrap">
                            {canJoin(apt) ? "¡Ahora!" : `En ${joinCountdown(apt)}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 ml-10">
                          <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">{format(new Date(apt.appointmentDate), "d MMM · HH:mm", { locale: es })}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">· {apt.durationMinutes}m</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Últimas 3 reseñas */}
            {myReviews && myReviews.length > 0 && (
              <div>
                <h3 className="text-base font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>Últimas reseñas</h3>
                <div className="space-y-2">
                  {myReviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="bg-white rounded-xl border border-[rgba(96,117,98,0.12)] p-3 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#eef2ee] flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0 overflow-hidden">
                        {(review as any).userImage
                          ? <img src={(review as any).userImage} className="w-full h-full object-cover" />
                          : ((review as any).userName?.[0] ?? "U").toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold truncate">{(review as any).userName ?? "Usuario"}</p>
                          <span className="text-amber-400 text-xs flex-shrink-0">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                        </div>
                        {review.comment && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{review.comment}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Acceso rápido */}
            <div>
              <h3 className="text-base font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>Acceso rápido</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setActiveTab("disponibilidad"); window.location.hash = "disponibilidad"; }}
                  className="flex flex-col items-start gap-2 p-4 bg-white rounded-2xl border border-[rgba(96,117,98,0.12)] hover:bg-[#f0f4f0] transition-colors text-left"
                >
                  <Clock className="w-5 h-5 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Configurar disponibilidad</span>
                  <span className="text-xs text-muted-foreground">Gestiona tus horarios</span>
                </button>
                <button
                  onClick={() => { setActiveTab("ganancias"); window.location.hash = "ganancias"; }}
                  className="flex flex-col items-start gap-2 p-4 bg-white rounded-2xl border border-[rgba(96,117,98,0.12)] hover:bg-[#f0f4f0] transition-colors text-left"
                >
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-semibold text-foreground">Ver ganancias</span>
                  <span className="text-xs text-muted-foreground">Balance y retiros</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Agenda (antes Citas) */}
        {activeTab === "agenda" && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
                  Próximas citas
                </h2>
                {upcomingAppointments.length > 0 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => scrollCarousel("left")}
                      className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => scrollCarousel("right")}
                      className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {loadingAppointments ? (
                <div className="flex gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="min-w-[200px] h-[72px] rounded-xl border border-border bg-muted/40 animate-pulse flex-shrink-0" />
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
                <div
                  ref={carouselRef}
                  className="flex gap-3 overflow-x-auto scroll-smooth pb-1"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {upcomingAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex-shrink-0 rounded-xl border border-border bg-card hover:shadow-md transition-shadow"
                      style={cardMinWidth}
                    >
                      <div className="p-4">
                        {/* Top row: avatar + name + countdown badge */}
                        <div className="flex items-center gap-2">
                          {(apt as any).userProfileImage ? (
                            <img
                              src={(apt as any).userProfileImage}
                              alt={(apt as any).userName ?? ""}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                              {(apt as any).userName?.charAt(0)?.toUpperCase() ?? "U"}
                            </div>
                          )}
                          <p className="font-semibold text-sm truncate flex-1">
                            {(apt as any).userName ?? `Usuario #${apt.userId}`}
                          </p>
                          <span className="text-[10px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5 flex-shrink-0 whitespace-nowrap">
                            {canJoin(apt) ? "¡Ahora!" : `En ${joinCountdown(apt)}`}
                          </span>
                        </div>

                        {/* Bottom row: date + duration */}
                        <div className="flex items-center gap-1.5 mt-1.5 ml-10">
                          <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">
                            {format(new Date(apt.appointmentDate), "d MMM · HH:mm", { locale: es })}
                          </span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">· {apt.durationMinutes}m</span>
                        </div>

                        {/* Action buttons */}
                        {(apt.videoCallLink || new Date(apt.appointmentDate).getTime() + 55 * 60 * 1000 < Date.now()) && (
                          <div className="flex gap-1.5 mt-2 ml-10">
                            {apt.videoCallLink && (
                              <Button
                                size="sm"
                                disabled={!canJoin(apt)}
                                className="gradient-brand text-white border-0 h-6 text-[11px] px-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                onClick={() => canJoin(apt) && setActiveCall({
                                  url: apt.videoCallLink!,
                                  appointmentId: apt.id,
                                  professionalName: (apt as any).userName ?? `Usuario #${apt.userId}`,
                                  startTime: new Date(apt.appointmentDate),
                                  endTime: new Date(new Date(apt.appointmentDate).getTime() + (apt.durationMinutes ?? 55) * 60 * 1000),
                                })}
                              >
                                <Video className="w-3 h-3 mr-1" />
                                {canJoin(apt) ? "Unirse" : "Unirse"}
                              </Button>
                            )}
                            {new Date(apt.appointmentDate).getTime() + 55 * 60 * 1000 < Date.now() && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[11px] px-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                onClick={() => setAttendanceModal(apt)}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Completar
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
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

        {/* Tab: Disponibilidad (incluye Horarios y Días libres como sub-tabs) */}
        {activeTab === "disponibilidad" && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>Disponibilidad</h2>

            {/* Sub-tabs */}
            <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
              <button
                onClick={() => setAvailSubTab("horarios")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-colors ${
                  availSubTab === "horarios" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Horarios semanales
              </button>
              <button
                onClick={() => setAvailSubTab("dias-libres")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-colors ${
                  availSubTab === "dias-libres" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CalendarX className="w-3.5 h-3.5" />
                Días libres
              </button>
            </div>

            {/* ── Sub-tab: Horarios — vista semanal tipo calendario ── */}
            {availSubTab === "horarios" && (() => {
              // Group slots by day
              const slotsByDay: Record<number, typeof availability> = {};
              for (let i = 0; i < 7; i++) slotsByDay[i] = [];
              (availability ?? []).forEach((s) => slotsByDay[s.dayOfWeek]?.push(s));

              // Days ordered Mon–Sun (1-6, 0) for display
              const dayOrder = [1, 2, 3, 4, 5, 6, 0];
              const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

              return (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Toca <span className="font-medium text-foreground">+</span> en cualquier día para agregar un horario. Los pacientes solo podrán agendar en los bloques activos.
                  </p>

                  {/* Scrollable week grid */}
                  <div className="overflow-x-auto pb-2 -mx-1 px-1">
                    <div className="flex gap-2.5" style={{ minWidth: "560px" }}>
                      {dayOrder.map((dayIdx) => {
                        const slots = slotsByDay[dayIdx] ?? [];
                        const hasSlots = slots.length > 0;
                        const isAddingThis = addingSlotForDay === dayIdx;

                        return (
                          <div
                            key={dayIdx}
                            className={`flex-1 rounded-2xl border transition-all duration-200 ${
                              hasSlots
                                ? "border-primary/20 bg-primary/[0.03] shadow-sm"
                                : "border-border bg-muted/20"
                            }`}
                          >
                            {/* Day header */}
                            <div className={`flex items-center justify-between px-3 pt-3 pb-2 rounded-t-2xl ${
                              hasSlots ? "border-b border-primary/10" : "border-b border-border/40"
                            }`}>
                              <div>
                                <p className={`text-xs font-bold uppercase tracking-wide ${
                                  hasSlots ? "text-primary" : "text-muted-foreground"
                                }`}>
                                  {DAY_SHORT[dayIdx]}
                                </p>
                                <p className={`text-[10px] ${hasSlots ? "text-primary/60" : "text-muted-foreground/60"}`}>
                                  {DAYS[dayIdx]}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  if (isAddingThis) {
                                    setAddingSlotForDay(null);
                                  } else {
                                    setAddingSlotForDay(dayIdx);
                                    setInlineSlot({ startTime: "09:00", endTime: "17:00" });
                                  }
                                }}
                                className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors text-xs font-bold ${
                                  isAddingThis
                                    ? "bg-primary/10 text-primary rotate-45"
                                    : hasSlots
                                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                                    : "bg-border text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                }`}
                                title={isAddingThis ? "Cancelar" : "Agregar horario"}
                              >
                                {isAddingThis ? "✕" : "+"}
                              </button>
                            </div>

                            {/* Slots */}
                            <div className="px-2.5 py-2 space-y-1.5 min-h-[56px]">
                              {slots.length === 0 && !isAddingThis && (
                                <p className="text-[10px] text-muted-foreground/50 text-center pt-2">Sin horario</p>
                              )}
                              {slots.map((slot) => (
                                <div
                                  key={slot.id}
                                  className="group flex items-center justify-between gap-1 px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 transition-all hover:bg-primary/15"
                                >
                                  <span className="text-[11px] font-medium text-primary tabular-nums whitespace-nowrap">
                                    {slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)}
                                  </span>
                                  <button
                                    onClick={() => removeAvailabilityMutation.mutate({ id: slot.id })}
                                    disabled={removeAvailabilityMutation.isPending}
                                    className="opacity-0 group-hover:opacity-100 text-primary/40 hover:text-red-500 transition-all disabled:opacity-30 flex-shrink-0"
                                    title="Eliminar"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}

                              {/* Inline add form */}
                              {isAddingThis && (
                                <div className="mt-1 space-y-1.5 pt-1 border-t border-primary/10">
                                  <div className="flex flex-col gap-1">
                                    <input
                                      type="time"
                                      value={inlineSlot.startTime}
                                      onChange={(e) => setInlineSlot((s) => ({ ...s, startTime: e.target.value }))}
                                      className="w-full rounded-lg border border-border p-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
                                    />
                                    <input
                                      type="time"
                                      value={inlineSlot.endTime}
                                      onChange={(e) => setInlineSlot((s) => ({ ...s, endTime: e.target.value }))}
                                      className="w-full rounded-lg border border-border p-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
                                    />
                                  </div>
                                  <button
                                    onClick={() => {
                                      addAvailabilityMutation.mutate(
                                        { dayOfWeek: dayIdx, startTime: inlineSlot.startTime, endTime: inlineSlot.endTime },
                                        { onSuccess: () => setAddingSlotForDay(null) }
                                      );
                                    }}
                                    disabled={addAvailabilityMutation.isPending}
                                    className="w-full py-1.5 rounded-lg text-[11px] font-semibold text-white gradient-brand disabled:opacity-50 transition-opacity"
                                  >
                                    {addAvailabilityMutation.isPending ? "..." : "Guardar"}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary badge */}
                  {(availability ?? []).length > 0 && (
                    <p className="text-xs text-muted-foreground text-center">
                      {(availability ?? []).length} horario{(availability ?? []).length !== 1 ? "s" : ""} activo{(availability ?? []).length !== 1 ? "s" : ""} en{" "}
                      {Object.values(slotsByDay).filter((s) => (s ?? []).length > 0).length} día{Object.values(slotsByDay).filter((s) => (s ?? []).length > 0).length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* ── Sub-tab: Días libres — calendario mensual ── */}
            {availSubTab === "dias-libres" && (() => {
              const blockedSet = new Set((blockedDays ?? []).map((d) => d.blockedDate));
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const todayStr = today.toISOString().split("T")[0];

              const year = blockedCalMonth.getFullYear();
              const month = blockedCalMonth.getMonth();
              const firstDay = new Date(year, month, 1);
              const lastDay = new Date(year, month + 1, 0);
              // Start grid on Monday (adjust firstDay.getDay: 0=Sun→6, 1=Mon→0, ...)
              const startOffset = (firstDay.getDay() + 6) % 7;
              const totalCells = startOffset + lastDay.getDate();
              const cells = Array.from({ length: Math.ceil(totalCells / 7) * 7 }, (_, i) => {
                const d = i - startOffset + 1;
                if (d < 1 || d > lastDay.getDate()) return null;
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                return { d, dateStr };
              });

              const DOW_HEADERS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

              return (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Toca un día para bloquearlo o desbloquearlo. Los pacientes no podrán agendar en los días marcados en rojo.
                  </p>

                  <Card className="border-border overflow-hidden">
                    {/* Calendar header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                      <button
                        onClick={() => setBlockedCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                        className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <h3 className="text-sm font-semibold capitalize">
                        {format(blockedCalMonth, "MMMM yyyy", { locale: es })}
                      </h3>
                      <button
                        onClick={() => setBlockedCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                        className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <CardContent className="p-4">
                      {/* Day-of-week headers */}
                      <div className="grid grid-cols-7 mb-1">
                        {DOW_HEADERS.map((h) => (
                          <div key={h} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{h}</div>
                        ))}
                      </div>

                      {/* Calendar grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {cells.map((cell, i) => {
                          if (!cell) return <div key={i} />;
                          const { d, dateStr } = cell;
                          const isPast = dateStr < todayStr;
                          const isBlocked = blockedSet.has(dateStr);
                          const isToday = dateStr === todayStr;
                          const pendingRemove = removeBlockedDayMutation.isPending;
                          const pendingAdd = addBlockedDayMutation.isPending;

                          return (
                            <button
                              key={dateStr}
                              disabled={isPast || pendingAdd || pendingRemove}
                              onClick={() => {
                                if (isBlocked) {
                                  const entry = (blockedDays ?? []).find((bd) => bd.blockedDate === dateStr);
                                  if (entry) removeBlockedDayMutation.mutate({ id: entry.id });
                                } else {
                                  addBlockedDayMutation.mutate({ blockedDate: dateStr });
                                }
                              }}
                              className={`
                                relative aspect-square flex items-center justify-center rounded-xl text-xs font-medium transition-all
                                ${isPast ? "opacity-30 cursor-not-allowed text-muted-foreground" : "cursor-pointer"}
                                ${isBlocked && !isPast ? "bg-red-100 text-red-600 border border-red-200 hover:bg-red-200" : ""}
                                ${!isBlocked && !isPast ? "hover:bg-primary/10 hover:text-primary" : ""}
                                ${isToday && !isBlocked ? "ring-2 ring-primary/40 text-primary font-bold" : ""}
                                ${isToday && isBlocked ? "ring-2 ring-red-400" : ""}
                              `}
                            >
                              {d}
                              {isBlocked && (
                                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-400" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Blocked days list */}
                  {(blockedDays ?? []).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                        Días bloqueados ({(blockedDays ?? []).filter((d) => d.blockedDate >= todayStr).length} próximos)
                      </p>
                      <div className="space-y-1.5">
                        {(blockedDays ?? [])
                          .filter((d) => d.blockedDate >= todayStr)
                          .sort((a, b) => a.blockedDate.localeCompare(b.blockedDate))
                          .map((day) => (
                            <div key={day.id} className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-100">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                                  <CalendarX className="w-3.5 h-3.5 text-red-500" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-red-700 capitalize">
                                    {format(new Date(day.blockedDate + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es })}
                                  </p>
                                  {day.reason && <p className="text-xs text-red-400">{day.reason}</p>}
                                </div>
                              </div>
                              <button
                                onClick={() => removeBlockedDayMutation.mutate({ id: day.id })}
                                disabled={removeBlockedDayMutation.isPending}
                                className="text-red-300 hover:text-red-500 transition-colors disabled:opacity-30"
                                title="Desbloquear"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Tab: Reseñas */}
        {activeTab === "resenas" && (
          <div className="space-y-6">
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
              <div style={{
                display: 'flex',
                gap: '12px',
                overflowX: 'auto',
                paddingBottom: '8px',
                scrollbarWidth: 'none',
              }}
              className="scrollbar-none"
              >
                {myReviews.map((review) => (
                  <div key={review.id} style={{
                    minWidth: '220px',
                    maxWidth: '220px',
                    background: '#fff',
                    borderRadius: '12px',
                    border: '1px solid rgba(96,117,98,0.12)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    flexShrink: 0,
                  }}>
                    {/* Header: foto + nombre + fecha */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: '#eef2ee',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: 600, color: '#607562',
                        flexShrink: 0,
                        overflow: 'hidden',
                      }}>
                        {(review as any).userImage
                          ? <img src={(review as any).userImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : ((review as any).userName?.[0] ?? 'U').toUpperCase()
                        }
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#333', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {(review as any).userName ?? 'Usuario'}
                        </p>
                        <p style={{ fontSize: '11px', color: '#999', margin: 0 }}>
                          {new Date(review.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    {/* Estrellas */}
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {[1,2,3,4,5].map(s => (
                        <span key={s} style={{ color: s <= review.rating ? '#f59e0b' : '#e5e7eb', fontSize: '14px' }}>★</span>
                      ))}
                    </div>
                    {/* Comentario */}
                    {review.comment && (
                      <p style={{ fontSize: '12px', color: '#555', margin: 0, lineHeight: 1.5,
                        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                      } as React.CSSProperties}>
                        {review.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Ganancias */}
        {activeTab === "ganancias" && (() => {
          const balance = parseFloat((wallet as any)?.wallet?.balance ?? "0");
          const pendingWithdrawal = parseFloat((wallet as any)?.wallet?.pendingWithdrawal ?? "0");
          const withdrawals: any[] = (wallet as any)?.withdrawals ?? [];
          const hasPending = withdrawals.some((w) => w.status === "pending");
          return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>Mis ganancias</h2>

            {/* Wallet summary */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: "Balance disponible", value: `$${balance.toFixed(2)} MXN`, highlight: true },
                { label: "Total ganado", value: `$${parseFloat((wallet as any)?.wallet?.totalEarned ?? "0").toFixed(2)} MXN`, highlight: false },
                { label: "Total retirado", value: `$${parseFloat((wallet as any)?.wallet?.totalWithdrawn ?? "0").toFixed(2)} MXN`, highlight: false },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="rounded-2xl border border-[rgba(96,117,98,0.15)] bg-white p-4">
                  <p className="text-xs text-[#93A295] mb-1">{label}</p>
                  <p className={`text-lg font-bold ${highlight ? "text-[#4ade80]" : "text-[#2d3a2e]"}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Withdrawal CTA or pending status */}
            {hasPending ? (
              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 flex items-center gap-3">
                <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-yellow-800">Retiro pendiente</p>
                  <p className="text-xs text-yellow-700">Tienes una solicitud en proceso. Se procesa los lunes.</p>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setWithdrawalOpen(true)}
                disabled={balance < 1000}
                className="w-full rounded-2xl border border-[rgba(96,117,98,0.3)] bg-white px-4 py-3 flex items-center justify-between hover:bg-[#f0f4f0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(96,117,98,0.1)" }}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#607562" strokeWidth="2" strokeLinecap="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-[#2d3a2e]">Solicitar retiro</p>
                    <p className="text-xs text-[#93A295]">{balance < 1000 ? "Mínimo $1,000 MXN para retirar" : `Disponible: $${balance.toFixed(2)} MXN`}</p>
                  </div>
                </div>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#93A295" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            )}

            {/* Pending withdrawal amount info */}
            {pendingWithdrawal > 0 && (
              <p className="text-xs text-[#93A295] text-center">
                ${pendingWithdrawal.toFixed(2)} MXN en proceso de retiro
              </p>
            )}

            {/* Withdrawal history */}
            {withdrawals.length > 0 && (
              <div className="rounded-2xl border border-[rgba(96,117,98,0.15)] bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-[rgba(96,117,98,0.1)]">
                  <p className="text-sm font-semibold text-[#2d3a2e]">Historial de retiros</p>
                </div>
                <div className="divide-y divide-[rgba(96,117,98,0.08)]">
                  {withdrawals.slice(0, 5).map((w: any) => (
                    <div key={w.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-[#2d3a2e]">${parseFloat(w.amount).toFixed(2)} MXN</p>
                        <p className="text-xs text-[#93A295]">{w.paymentMethod ?? "CLABE"} · {new Date(w.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${w.status === "paid" ? "bg-green-100 text-green-700" : w.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"}`}>
                        {w.status === "paid" ? "Pagado" : w.status === "pending" ? "Pendiente" : w.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Earnings history */}
            <div className="rounded-2xl border border-[rgba(96,117,98,0.15)] bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-[rgba(96,117,98,0.1)]">
                <p className="text-sm font-semibold text-[#2d3a2e]">Historial de sesiones</p>
              </div>
              {!earningsHistory || earningsHistory.length === 0 ? (
                <div className="p-10 text-center">
                  <BarChart3 className="w-8 h-8 text-[#93A295] mx-auto mb-2" />
                  <p className="text-sm text-[#93A295]">Aún no tienes ganancias registradas.</p>
                </div>
              ) : (
                <div className="divide-y divide-[rgba(96,117,98,0.08)]">
                  {(earningsHistory as any[]).map((e) => (
                    <div key={e.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-[#2d3a2e]">Cita #{e.appointmentId}</p>
                        <p className="text-xs text-[#93A295]">{e.appointmentDate ? format(new Date(e.appointmentDate), "d MMM yyyy 'a las' HH:mm", { locale: es }) : "—"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#607562]">+${parseFloat(e.netAmount).toFixed(2)} MXN</p>
                        <p className="text-xs text-[#93A295]">Comisión: ${parseFloat(e.commissionAmount).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          );
        })()}

        {/* Withdrawal Modal */}
        {withdrawalOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => setWithdrawalOpen(false)}>
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative w-full max-w-md bg-white rounded-t-3xl md:rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#2d3a2e]">Solicitar retiro</h3>
                <button onClick={() => setWithdrawalOpen(false)} className="w-8 h-8 rounded-full bg-[#f0f4f0] flex items-center justify-center">
                  <XCircle className="w-4 h-4 text-[#607562]" />
                </button>
              </div>

              {/* Info banner */}
              <div className="rounded-xl bg-[#f0f4f0] px-3 py-2 text-xs text-[#607562]">
                Los retiros se procesan los lunes. El dinero puede tardar hasta <strong>7 días hábiles</strong> en llegar.
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-semibold text-[#93A295] uppercase tracking-wider">Monto a retirar (MXN)</label>
                <input
                  type="number"
                  min={1000}
                  max={wBalance}
                  value={withdrawalForm.amount}
                  onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })}
                  placeholder="Mínimo $1,000"
                  className="mt-1 w-full rounded-xl border border-[rgba(96,117,98,0.2)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(96,117,98,0.3)]"
                />
                <p className="text-[11px] text-[#93A295] mt-1">Disponible: ${wBalance.toFixed(2)} MXN</p>
              </div>

              {/* Payment method */}
              <div>
                <label className="text-xs font-semibold text-[#93A295] uppercase tracking-wider">Método de pago</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {(["clabe", "binance", "paypal", "other"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setWithdrawalForm({ ...withdrawalForm, paymentMethod: m, paymentDetails: "" })}
                      className="rounded-xl border px-3 py-2 text-sm font-medium transition-colors"
                      style={{
                        background: withdrawalForm.paymentMethod === m ? "rgba(96,117,98,0.12)" : "#f7faf7",
                        borderColor: withdrawalForm.paymentMethod === m ? "#607562" : "rgba(96,117,98,0.2)",
                        color: withdrawalForm.paymentMethod === m ? "#2d3a2e" : "#607562",
                      }}
                    >
                      {m === "clabe" ? "CLABE" : m === "binance" ? "Binance" : m === "paypal" ? "PayPal" : "Otro"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic payment details */}
              {withdrawalForm.paymentMethod === "clabe" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#93A295] uppercase tracking-wider">CLABE interbancaria (18 dígitos)</label>
                  <input
                    type="text"
                    maxLength={18}
                    value={withdrawalForm.paymentDetails}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, paymentDetails: e.target.value.replace(/\D/g, "").slice(0, 18) })}
                    placeholder="000000000000000000"
                    className="w-full rounded-xl border border-[rgba(96,117,98,0.2)] px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[rgba(96,117,98,0.3)]"
                  />
                </div>
              )}
              {withdrawalForm.paymentMethod === "binance" && (
                <div>
                  <label className="text-xs font-semibold text-[#93A295] uppercase tracking-wider">Binance Pay ID o UID</label>
                  <input
                    type="text"
                    value={withdrawalForm.paymentDetails}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, paymentDetails: e.target.value })}
                    placeholder="Tu Binance Pay ID"
                    className="mt-1 w-full rounded-xl border border-[rgba(96,117,98,0.2)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(96,117,98,0.3)]"
                  />
                </div>
              )}
              {withdrawalForm.paymentMethod === "paypal" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#93A295] uppercase tracking-wider">Email de PayPal</label>
                  <input
                    type="email"
                    value={withdrawalForm.paymentDetails}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, paymentDetails: e.target.value })}
                    placeholder="tu@email.com"
                    className="w-full rounded-xl border border-[rgba(96,117,98,0.2)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(96,117,98,0.3)]"
                  />
                  <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-3 py-2 text-xs text-yellow-800">
                    ⚠️ PayPal cobra una comisión del 5.4% que no cubrimos. Recibirás el monto menos esa comisión.
                  </div>
                </div>
              )}
              {withdrawalForm.paymentMethod === "other" && (
                <div>
                  <label className="text-xs font-semibold text-[#93A295] uppercase tracking-wider">Describe el método de pago</label>
                  <textarea
                    value={withdrawalForm.paymentDetails}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, paymentDetails: e.target.value })}
                    placeholder="Describe cómo quieres recibir tu pago..."
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-[rgba(96,117,98,0.2)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(96,117,98,0.3)] resize-none"
                  />
                </div>
              )}

              {/* Optional note */}
              <div>
                <label className="text-xs font-semibold text-[#93A295] uppercase tracking-wider">Nota adicional (opcional)</label>
                <input
                  type="text"
                  value={withdrawalForm.notes}
                  onChange={(e) => setWithdrawalForm({ ...withdrawalForm, notes: e.target.value })}
                  placeholder="Ej: transferir el lunes por la mañana"
                  className="mt-1 w-full rounded-xl border border-[rgba(96,117,98,0.2)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(96,117,98,0.3)]"
                />
              </div>

              <Button
                className="w-full gradient-brand text-white border-0 h-11"
                disabled={!wValid || requestWithdrawalMutation.isPending}
                onClick={() => requestWithdrawalMutation.mutate({
                  amount: wAmount,
                  paymentMethod: withdrawalForm.paymentMethod,
                  paymentDetails: withdrawalForm.paymentDetails,
                  notes: withdrawalForm.notes || undefined,
                })}
              >
                {requestWithdrawalMutation.isPending ? "Enviando..." : `Solicitar $${wAmount > 0 ? wAmount.toLocaleString("es-MX") : "—"} MXN`}
              </Button>
            </div>
          </div>
        )}

        {/* Tab: Perfil */}
        {activeTab === "perfil" && (
          <div className="space-y-6">
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
                    <Label className="text-xs">Certificaciones y documentos</Label>
                    <div className="mt-1.5 space-y-2">
                      {parseCerts(profileForm.certifications).map((url, i) => {
                        const fileName = url.split("/").pop() ?? `Documento ${i + 1}`;
                        const isPdf = url.toLowerCase().includes(".pdf");
                        return (
                          <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-muted/40 text-sm">
                            <span className="text-base">{isPdf ? "📄" : "🖼️"}</span>
                            <a href={url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-primary hover:underline text-xs">
                              {fileName}
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = parseCerts(profileForm.certifications).filter((_, idx) => idx !== i);
                                setProfileForm((f) => ({ ...f, certifications: JSON.stringify(updated) }));
                              }}
                              className="text-muted-foreground hover:text-red-500 transition-colors text-xs px-1"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => certFileInputRef.current?.click()}
                        disabled={uploadingCerts}
                        className="w-full py-2 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                      >
                        {uploadingCerts ? "Subiendo..." : "+ Subir documento (PDF, JPG, PNG — máx 10 MB)"}
                      </button>
                      <input
                        ref={certFileInputRef}
                        type="file"
                        accept=".pdf,image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleCertUpload}
                      />
                    </div>
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
                      {(() => {
                        const certs = parseCerts(profile.certifications);
                        return certs.length === 1 && !profile.certifications.startsWith("[")
                          ? <p className="text-sm">{profile.certifications}</p>
                          : (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {certs.map((url, i) => {
                                const fileName = url.split("/").pop() ?? `Documento ${i + 1}`;
                                const isPdf = url.toLowerCase().includes(".pdf");
                                return (
                                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-muted/40 text-xs text-primary hover:underline">
                                    <span>{isPdf ? "📄" : "🖼️"}</span>
                                    <span className="max-w-[140px] truncate">{fileName}</span>
                                  </a>
                                );
                              })}
                            </div>
                          );
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
      </div>

      {activeCall && (
        <div style={{ width: "420px", minWidth: "420px", height: "calc(100vh - 120px)", flexShrink: 0, position: "sticky", top: "24px" }}>
          <VideoCallPanel
            roomUrl={activeCall.url}
            appointmentId={activeCall.appointmentId}
            professionalName={activeCall.professionalName}
            startTime={activeCall.startTime}
            endTime={activeCall.endTime}
            onLeave={() => setActiveCall(null)}
          />
        </div>
      )}
      </div>

      {/* ─── Modal de asistencia ─── */}
      {attendanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-xl mx-auto bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                {attendanceModal.userName?.charAt(0) ?? "U"}
              </div>
              <h2 className="text-base font-bold mt-2">¿El usuario asistió a la consulta?</h2>
              <p className="text-xs text-muted-foreground">
                {attendanceModal.userName ?? `Usuario #${attendanceModal.userId}`} ·{" "}
                {format(new Date(attendanceModal.appointmentDate), "d MMM yyyy 'a las' HH:mm", { locale: es })}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1 gradient-brand text-white border-0"
                disabled={completeMutation.isPending || markNoShowMutation.isPending}
                onClick={() => {
                  completeMutation.mutate({ appointmentId: attendanceModal.id });
                  setAttendanceModal(null);
                }}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Sí asistió
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                disabled={completeMutation.isPending || markNoShowMutation.isPending}
                onClick={() => {
                  markNoShowMutation.mutate({ appointmentId: attendanceModal.id });
                  setAttendanceModal(null);
                }}
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                No asistió
              </Button>
            </div>
            <button
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              onClick={() => setAttendanceModal(null)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
