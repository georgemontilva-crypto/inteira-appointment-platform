import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar,
  Video,
  Star,
  Clock,
  Plus,
  ChevronRight,
  Wallet,
  Search,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Users,
  BookOpen,
  TrendingUp,
  MessageCircle,
  Zap,
  Bell,
  Shield,
} from "lucide-react";

// Mapa de ícono por especialidad
const SPECIALTY_ICONS: Record<string, React.ReactNode> = {
  "Psicología": <MessageCircle className="w-5 h-5" />,
  "Legal": <BookOpen className="w-5 h-5" />,
  "Finanzas": <TrendingUp className="w-5 h-5" />,
  "Emprendimiento": <Zap className="w-5 h-5" />,
  "Nutrición": <Star className="w-5 h-5" />,
  "Salud": <CheckCircle2 className="w-5 h-5" />,
};

const SPECIALTY_COLORS: Record<string, string> = {
  "Psicología": "bg-violet-100 text-violet-700",
  "Legal": "bg-blue-100 text-blue-700",
  "Finanzas": "bg-emerald-100 text-emerald-700",
  "Emprendimiento": "bg-amber-100 text-amber-700",
  "Nutrición": "bg-rose-100 text-rose-700",
  "Salud": "bg-teal-100 text-teal-700",
};

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
};
const statusLabels: Record<string, string> = {
  scheduled: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  pending: "Pendiente",
};

export default function AuthenticatedHome() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // Obtener perfil actualizado del usuario (tiene el nombre real guardado en DB)
  const { data: profile } = trpc.user.getProfile.useQuery(undefined, {
    staleTime: 60_000,
  });

  // Queries
  const { data: appointments, isLoading: loadingApts } = trpc.user.getAppointments.useQuery(
    undefined,
    { staleTime: 30_000 }
  );
  const { data: wallet } = trpc.user.getWallet.useQuery(
    undefined,
    { staleTime: 60_000 }
  );
  const { data: subscription } = trpc.user.getSubscription.useQuery(
    undefined,
    { staleTime: 60_000 }
  );
  const { data: featuredPros, isLoading: loadingPros } = trpc.professional.getFeatured.useQuery(
    { limit: 6 },
    { staleTime: 120_000 }
  );
  const { data: specialties } = trpc.specialty.getAll.useQuery(
    undefined,
    { staleTime: 300_000 }
  );

  // Notifications
  const { data: unreadCountData } = trpc.notifications.getUnreadCount.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 30000,
  });
  const { data: notifications } = trpc.notifications.getAll.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 30000,
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.getAll.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
  });
  const markOneRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.getAll.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
  });
  const unreadCount = unreadCountData?.count ?? 0;

  // Derived — usar profile (DB) como fuente principal, con fallback al user del contexto
  const resolvedName = profile?.name || user?.name || user?.email?.split("@")[0] || "";
  type Apt = NonNullable<typeof appointments>[number];
  const upcomingApts: Apt[] = appointments?.filter((a) => a.status === "scheduled") ?? [];
  const completedCount = appointments?.filter((a) => a.status === "completed").length ?? 0;
  const nextApt = upcomingApts[0];
  const firstName = resolvedName.split(" ")[0] || "";
  const initials = resolvedName
    ? resolvedName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="min-h-screen bg-[#F7F9F7] pb-24 md:pb-0">
      {/* ══════════════════════════════════════════
          HERO HEADER — Mobile & Desktop
          ══════════════════════════════════════════ */}
      <div className="gradient-hero text-white relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3 pointer-events-none" />

        {/* Mobile header */}
        <div className="md:hidden px-5 pt-20 pb-8 relative z-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              {(user as any)?.profileImage ? (
                <img
                  src={(user as any).profileImage}
                  alt={user?.name ?? "Avatar"}
                  className="w-11 h-11 rounded-2xl object-cover shadow-md"
                />
              ) : (
                <div className="w-11 h-11 rounded-2xl bg-white/25 flex items-center justify-center text-white text-lg font-bold shadow-md">
                  {initials}
                </div>
              )}
              <div>
                <p className="text-white/70 text-xs font-medium">{greeting}</p>
                <h1 className="text-xl font-bold leading-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
                  {firstName} 👋
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="relative p-2 rounded-full hover:bg-white/20 transition-colors">
                    <Bell className="w-5 h-5 text-white" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" sideOffset={8} className="w-[340px] p-0 rounded-xl overflow-hidden" style={{boxShadow: "0 8px 32px rgba(61,78,63,0.12)", border: "0.5px solid rgba(96,117,98,0.2)"}}>
                  <div className="flex items-center justify-between px-4 py-3 border-b bg-[#F7FAFC]" style={{borderColor: "rgba(96,117,98,0.15)"}}>
                    <div>
                      <h3 className="text-sm font-medium text-[#333333]">Notificaciones</h3>
                      {unreadCount > 0 && <p className="text-[11px] text-[#607562]">{unreadCount} sin leer</p>}
                    </div>
                    {unreadCount > 0 && (
                      <button onClick={() => markAllRead.mutate()} className="text-xs text-[#607562] px-[10px] py-1 rounded-md transition-colors hover:bg-[rgba(96,117,98,0.08)]" style={{border: "0.5px solid rgba(96,117,98,0.3)"}}>
                        Marcar todas como leídas
                      </button>
                    )}
                  </div>
                  <div className="max-h-[300px] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(96,117,98,0.25)_transparent] [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[rgba(96,117,98,0.25)] [&::-webkit-scrollbar-thumb]:rounded-full">
                    {!notifications || notifications.length === 0 ? (
                      <div className="py-10 text-center text-sm text-[#93A295]">No hay notificaciones</div>
                    ) : (
                      notifications.map((n: any) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (!n.isRead) markOneRead.mutate({ id: n.id });
                            if (n.link) window.location.href = n.link;
                          }}
                          className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors items-start border-b last:border-b-0 ${!n.isRead ? "bg-[#f0f4f0] hover:bg-[#e8efe8]" : "hover:bg-[#F7FAFC]"}`}
                          style={{borderColor: "rgba(96,117,98,0.1)"}}
                        >
                          <div className={`w-[34px] h-[34px] rounded-full flex items-center justify-center flex-shrink-0 mt-[1px] ${!n.isRead ? "bg-[rgba(96,117,98,0.15)]" : "bg-[rgba(147,162,149,0.2)]"}`}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" stroke={!n.isRead ? "#607562" : "#93A295"}>
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-[#333333] leading-snug mb-[2px]">{n.title}</p>
                            <p className="text-[12px] text-[#666666] leading-snug truncate">{n.message}</p>
                            <p className="text-[11px] text-[#93A295] mt-1">{new Date(n.createdAt).toLocaleDateString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                          {!n.isRead && <div className="w-[7px] h-[7px] rounded-full bg-[#607562] mt-[6px] flex-shrink-0" />}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-4 py-[10px] text-center bg-[#F7FAFC]" style={{borderTop: "0.5px solid rgba(96,117,98,0.15)"}}>
                    <span className="text-xs text-[#607562] cursor-pointer hover:underline">Ver todas las notificaciones</span>
                  </div>
                </PopoverContent>
              </Popover>
              <Link href="/wallet">
                <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-2 active:scale-95 transition-transform cursor-pointer">
                  <Wallet className="w-4 h-4 text-white" />
                  <span className="text-white font-bold text-sm">{(wallet?.balance ?? 0).toLocaleString("es-MX")}</span>
                </div>
              </Link>
            </div>
          </div>

          {/* Search bar */}
          <Link href="/especialidades">
            <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3 active:scale-[0.98] transition-transform cursor-pointer border border-white/20">
              <Search className="w-4 h-4 text-white/70 flex-shrink-0" />
              <span className="text-white/70 text-sm">Buscar especialista o área...</span>
            </div>
          </Link>
        </div>

        {/* Desktop header */}
        <div className="hidden md:block py-10 relative z-10">
          <div className="container">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                {(user as any)?.profileImage ? (
                  <img
                    src={(user as any).profileImage}
                    alt={user?.name ?? "Avatar"}
                    className="w-16 h-16 rounded-2xl object-cover shadow-lg"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-white/25 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {initials}
                  </div>
                )}
                <div>
                  <p className="text-white/70 text-sm font-medium">{greeting},</p>
                  <h1 className="text-3xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
                    {resolvedName || firstName} 👋
                  </h1>
                  <p className="text-white/60 text-sm mt-0.5">
                    {upcomingApts.length > 0
                      ? `Tienes ${upcomingApts.length} cita${upcomingApts.length > 1 ? "s" : ""} próxima${upcomingApts.length > 1 ? "s" : ""}`
                      : "¿Con quién quieres hablar hoy?"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="relative p-2 rounded-full hover:bg-white/20 transition-colors">
                      <Bell className="w-5 h-5 text-white" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" sideOffset={8} className="w-[340px] p-0 rounded-xl overflow-hidden" style={{boxShadow: "0 8px 32px rgba(61,78,63,0.12)", border: "0.5px solid rgba(96,117,98,0.2)"}}>
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-[#F7FAFC]" style={{borderColor: "rgba(96,117,98,0.15)"}}>
                      <div>
                        <h3 className="text-sm font-medium text-[#333333]">Notificaciones</h3>
                        {unreadCount > 0 && <p className="text-[11px] text-[#607562]">{unreadCount} sin leer</p>}
                      </div>
                      {unreadCount > 0 && (
                        <button onClick={() => markAllRead.mutate()} className="text-xs text-[#607562] px-[10px] py-1 rounded-md transition-colors hover:bg-[rgba(96,117,98,0.08)]" style={{border: "0.5px solid rgba(96,117,98,0.3)"}}>
                          Marcar todas como leídas
                        </button>
                      )}
                    </div>
                    <div className="max-h-[300px] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(96,117,98,0.25)_transparent] [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[rgba(96,117,98,0.25)] [&::-webkit-scrollbar-thumb]:rounded-full">
                      {!notifications || notifications.length === 0 ? (
                        <div className="py-10 text-center text-sm text-[#93A295]">No hay notificaciones</div>
                      ) : (
                        notifications.map((n: any) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              if (!n.isRead) markOneRead.mutate({ id: n.id });
                              if (n.link) window.location.href = n.link;
                            }}
                            className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors items-start border-b last:border-b-0 ${!n.isRead ? "bg-[#f0f4f0] hover:bg-[#e8efe8]" : "hover:bg-[#F7FAFC]"}`}
                            style={{borderColor: "rgba(96,117,98,0.1)"}}
                          >
                            <div className={`w-[34px] h-[34px] rounded-full flex items-center justify-center flex-shrink-0 mt-[1px] ${!n.isRead ? "bg-[rgba(96,117,98,0.15)]" : "bg-[rgba(147,162,149,0.2)]"}`}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" stroke={!n.isRead ? "#607562" : "#93A295"}>
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium text-[#333333] leading-snug mb-[2px]">{n.title}</p>
                              <p className="text-[12px] text-[#666666] leading-snug truncate">{n.message}</p>
                              <p className="text-[11px] text-[#93A295] mt-1">{new Date(n.createdAt).toLocaleDateString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                            </div>
                            {!n.isRead && <div className="w-[7px] h-[7px] rounded-full bg-[#607562] mt-[6px] flex-shrink-0" />}
                          </div>
                        ))
                      )}
                    </div>
                    <div className="px-4 py-[10px] text-center bg-[#F7FAFC]" style={{borderTop: "0.5px solid rgba(96,117,98,0.15)"}}>
                      <span className="text-xs text-[#607562] cursor-pointer hover:underline">Ver todas las notificaciones</span>
                    </div>
                  </PopoverContent>
                </Popover>
                <Link href="/especialidades">
                  <Button className="bg-white text-primary hover:bg-white/90 font-semibold shadow-md">
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva cita
                  </Button>
                </Link>
                <Link href="/wallet">
                  <div className="flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2.5 cursor-pointer hover:bg-white/30 transition-colors">
                    <Wallet className="w-4 h-4 text-white" />
                    <span className="text-white font-bold">{(wallet?.balance ?? 0).toLocaleString("es-MX")}</span>
                    <span className="text-white/70 text-xs">créditos</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats strip — overlapping */}
        <div className="flex justify-center px-4 md:px-0 relative z-10 pb-6">
          <div className="w-full max-w-md md:max-w-lg bg-white rounded-2xl shadow-xl border border-border/30 grid grid-cols-3 divide-x divide-border">
            <div className="flex flex-col items-center py-4">
              <span className="text-xl font-bold text-primary" style={{ fontFamily: "Poppins, sans-serif" }}>
                {upcomingApts.length}
              </span>
              <span className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Próximas</span>
            </div>
            <div className="flex flex-col items-center py-4">
              <span className="text-xl font-bold text-emerald-600" style={{ fontFamily: "Poppins, sans-serif" }}>
                {completedCount}
              </span>
              <span className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Completadas</span>
            </div>
            <div className="flex flex-col items-center py-4">
              <span className="text-xl font-bold text-primary" style={{ fontFamily: "Poppins, sans-serif" }}>
                {subscription ? "Activo" : "—"}
              </span>
              <span className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
                {subscription ? (subscription as any).planName ?? "Plan" : "Sin plan"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          MAIN CONTENT
          ══════════════════════════════════════════ */}
      <div className="container py-8 space-y-8">

        {/* ── Banner: próxima cita con videollamada ── */}
        {(() => {
          const nextWithVideo = upcomingApts.find((a) => a.videoCallLink && a.status === "scheduled");
          if (!nextWithVideo) return null;
          const msUntil = new Date(nextWithVideo.appointmentDate).getTime() - Date.now();
          const isToday = new Date(nextWithVideo.appointmentDate).toDateString() === new Date().toDateString();
          const isSoon = msUntil > 0 && msUntil < 60 * 60 * 1000;
          if (!isToday && !isSoon) return null;
          return (
            <div className="rounded-2xl overflow-hidden border border-primary/30 bg-gradient-to-r from-primary/10 to-emerald-50">
              <div className="flex items-center gap-3 px-4 py-4">
                <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center flex-shrink-0">
                  <Video className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-primary">
                    {isSoon ? "¡Tu cita comienza pronto!" : "Tienes una cita hoy"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {format(new Date(nextWithVideo.appointmentDate), "HH:mm", { locale: es })} · {nextWithVideo.durationMinutes} min · {(nextWithVideo as any).professionalName ?? `Especialista #${nextWithVideo.professionalId}`}
                  </p>
                </div>
                <a href={nextWithVideo.videoCallLink!} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="gradient-brand text-white border-0 text-xs h-8 px-3 flex-shrink-0 font-semibold">
                    <Video className="w-3 h-3 mr-1" />
                    Unirse
                  </Button>
                </a>
              </div>
            </div>
          );
        })()}

        {/* ── Quick Actions ── */}
        <div>
          <h2 className="text-base font-bold text-foreground mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>
            Acciones rápidas
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/especialidades">
              <div className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-border/60 shadow-sm hover:shadow-md hover:border-primary/30 active:scale-[0.98] transition-all cursor-pointer group">
                <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Nueva cita</p>
                  <p className="text-[10px] text-muted-foreground">Agendar ahora</p>
                </div>
              </div>
            </Link>
            <Link href="/dashboard">
              <div className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-border/60 shadow-sm hover:shadow-md hover:border-primary/30 active:scale-[0.98] transition-all cursor-pointer group">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Mis citas</p>
                  <p className="text-[10px] text-muted-foreground">Ver historial</p>
                </div>
              </div>
            </Link>
            <Link href="/wallet">
              <div className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-border/60 shadow-sm hover:shadow-md hover:border-primary/30 active:scale-[0.98] transition-all cursor-pointer group">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Wallet className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Mi Wallet</p>
                  <p className="text-[10px] text-muted-foreground">{(wallet?.balance ?? 0).toLocaleString("es-MX")} créditos</p>
                </div>
              </div>
            </Link>
            <Link href="/planes">
              <div className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-border/60 shadow-sm hover:shadow-md hover:border-primary/30 active:scale-[0.98] transition-all cursor-pointer group">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Planes</p>
                  <p className="text-[10px] text-muted-foreground">{subscription ? "Ver mi plan" : "Explorar"}</p>
                </div>
              </div>
            </Link>
            {user?.role === "admin" && (
              <Link href="/admin">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 hover:bg-red-100 transition-colors cursor-pointer col-span-2 md:col-span-1">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-red-600" />
                    </div>
                    <span className="text-sm font-medium text-red-700">Panel Admin</span>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* ── Próximas citas ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-foreground" style={{ fontFamily: "Poppins, sans-serif" }}>
              Próximas citas
            </h2>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-primary text-xs h-7 px-2">
                Ver todas <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>

          {loadingApts ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-border/60 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-11 h-11 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : upcomingApts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-border p-8 text-center shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-7 h-7 text-primary/60" />
              </div>
              <p className="font-semibold text-foreground mb-1">Sin citas próximas</p>
              <p className="text-xs text-muted-foreground mb-4">Agenda tu primera consulta con un especialista</p>
              <Link href="/especialidades">
                <Button className="gradient-brand text-white border-0 font-semibold" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Agendar ahora
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingApts.slice(0, 3).map((apt) => (
                <div key={apt.id} className="bg-white rounded-2xl border border-border/60 shadow-sm p-4 flex items-center gap-3 hover:shadow-md hover:border-primary/20 transition-all active:scale-[0.99]">
                  <div className="w-11 h-11 rounded-xl gradient-brand flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {((apt as any).professionalName ?? "P").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {(apt as any).professionalName ?? `Especialista #${apt.professionalId}`}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(apt.appointmentDate), "d MMM 'a las' HH:mm", { locale: es })}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <Badge className={statusColors[apt.status] + " border-0 text-[10px]"}>
                      {statusLabels[apt.status]}
                    </Badge>
                    {apt.videoCallLink && (
                      <a href={apt.videoCallLink} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" className="gradient-brand text-white border-0 h-6 text-[10px] px-2">
                          <Video className="w-3 h-3 mr-1" />
                          Unirse
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Especialidades ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-foreground" style={{ fontFamily: "Poppins, sans-serif" }}>
              Explorar especialidades
            </h2>
            <Link href="/especialidades">
              <Button variant="ghost" size="sm" className="text-primary text-xs h-7 px-2">
                Ver todas <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4">
            {(specialties ?? [
              { id: 1, name: "Psicología" },
              { id: 2, name: "Emprendimiento" },
              { id: 3, name: "Legal" },
              { id: 4, name: "Finanzas" },
            ]).slice(0, 8).map((s) => {
              const colorClass = SPECIALTY_COLORS[s.name] ?? "bg-primary/10 text-primary";
              const icon = SPECIALTY_ICONS[s.name] ?? <Users className="w-5 h-5" />;
              return (
                <Link href={`/especialidades/${s.id}`} key={s.id}>
                  <div className="flex-shrink-0 md:flex-shrink bg-white rounded-2xl border border-border/60 shadow-sm p-4 flex flex-col items-center gap-2 w-24 md:w-auto hover:shadow-md hover:border-primary/20 active:scale-[0.97] transition-all cursor-pointer text-center">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}>
                      {icon}
                    </div>
                    <span className="text-xs font-semibold text-foreground leading-tight">{s.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Especialistas destacados ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-foreground" style={{ fontFamily: "Poppins, sans-serif" }}>
              Especialistas destacados
            </h2>
            <Link href="/especialidades">
              <Button variant="ghost" size="sm" className="text-primary text-xs h-7 px-2">
                Ver todos <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>

          {loadingPros ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-border/60 shadow-sm p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <Skeleton className="w-14 h-14 rounded-2xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : !featuredPros || featuredPros.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-border p-8 text-center shadow-sm">
              <Users className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No hay especialistas disponibles aún</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredPros.slice(0, 6).map((pro) => {
                const proName = (pro as any).name ?? `Especialista #${pro.id}`;
                const photoSrc = (pro as any).profilePhoto ?? (pro as any).profileImage;
                const specialty = (pro as any).specialtyName ?? "";
                const rating = parseFloat((pro as any).averageRating ?? "0") || 0;
                const reviews = (pro as any).totalReviews ?? 0;
                const available = (pro as any).isAvailable ?? false;
                const colorClass = SPECIALTY_COLORS[specialty] ?? "bg-primary/10 text-primary";

                return (
                  <div
                    key={pro.id}
                    className="bg-white rounded-2xl border border-border/60 shadow-sm p-4 hover:shadow-lg hover:border-primary/25 transition-all group"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      {/* Avatar */}
                      <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0">
                        {photoSrc ? (
                          <img
                            src={photoSrc}
                            alt={proName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full gradient-brand flex items-center justify-center text-white text-xl font-bold">
                            {proName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm truncate">{proName}</h3>
                        {specialty && (
                          <Badge className={`${colorClass} border-0 text-[10px] mt-0.5`}>
                            {specialty}
                          </Badge>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-xs font-medium">{rating > 0 ? rating.toFixed(1) : "Nuevo"}</span>
                          {reviews > 0 && (
                            <span className="text-[10px] text-muted-foreground">({reviews})</span>
                          )}
                        </div>
                      </div>
                      {/* Availability dot */}
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${available ? "bg-emerald-400" : "bg-gray-300"}`} />
                    </div>
                    {/* Bio snippet */}
                    {pro.bio && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                        {pro.bio}
                      </p>
                    )}
                    {/* CTA */}
                    <Link href={`/especialistas/${pro.id}`}>
                      <Button
                        size="sm"
                        className="w-full gradient-brand text-white border-0 font-semibold text-xs h-9 active:scale-[0.98] transition-transform"
                      >
                        Ver perfil y agendar
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Suscripción / CTA ── */}
        {!subscription && (
          <div className="gradient-hero rounded-2xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-white/80" />
                <span className="text-xs font-semibold text-white/80 uppercase tracking-widest">Desbloquea más</span>
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ fontFamily: "Poppins, sans-serif" }}>
                Activa un plan y ahorra
              </h3>
              <p className="text-white/75 text-sm mb-4 max-w-md">
                Con un plan mensual obtienes citas ilimitadas a un precio fijo y acceso prioritario a todos los especialistas.
              </p>
              <Link href="/planes">
                <Button className="bg-white text-primary hover:bg-white/90 font-semibold shadow-md active:scale-95 transition-transform">
                  Ver planes disponibles
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ── Historial reciente ── */}
        {(() => {
          const recent = appointments?.filter((a) => a.status === "completed").slice(0, 3) ?? [];
          if (recent.length === 0) return null;
          return (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-foreground" style={{ fontFamily: "Poppins, sans-serif" }}>
                  Consultas recientes
                </h2>
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="text-primary text-xs h-7 px-2">
                    Ver todas <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
              <div className="space-y-2">
                {recent.map((apt) => (
                  <div key={apt.id} className="bg-white rounded-2xl border border-border/60 shadow-sm px-4 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {(apt as any).professionalName ?? `Especialista #${apt.professionalId}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(apt.appointmentDate), "d MMM yyyy", { locale: es })}
                      </p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] flex-shrink-0">
                      Completada
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
