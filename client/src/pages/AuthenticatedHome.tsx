import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
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
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Users,
  BookOpen,
  TrendingUp,
  MessageCircle,
  Zap,
  Shield,
  LockOpen,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";

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

  // Derived — usar profile (DB) como fuente principal, con fallback al user del contexto
  const resolvedName = profile?.name || user?.name || user?.email?.split("@")[0] || "";
  type Apt = NonNullable<typeof appointments>[number];
  const upcomingApts: Apt[] = appointments?.filter((a) => a.status === "scheduled") ?? [];
  const completedCount = appointments?.filter((a) => a.status === "completed").length ?? 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";

  return (
    <DashboardLayout
      title={`${greeting}, ${resolvedName}`}
      subtitle="¿Con quién quieres hablar hoy?"
    >
      <div className="space-y-8">

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
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {(specialties ?? [
              { id: 1, name: "Psicología" },
              { id: 2, name: "Emprendimiento" },
              { id: 3, name: "Legal" },
              { id: 4, name: "Finanzas" },
            ]).slice(0, 8).map((s) => {
              const n = s.name.toLowerCase();
              const icon = n.includes("coaching") || n.includes("vida") ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="#607562" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]"><path d="M4.5 16.5l-1.5 4.5 4.5-1.5L19 8 17 6 4.5 16.5z"/><path d="M14 4l6 6"/><path d="M5 20l-1-1"/></svg>
              ) : n.includes("mindfulness") || n.includes("meditación") || n.includes("meditacion") ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="#607562" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10"/><path d="M12 2c2 4 2 8 0 12"/><path d="M2 12c4-2 8-2 12 0"/></svg>
              ) : n.includes("nutrición") || n.includes("nutricion") ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="#607562" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]"><path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z"/><path d="M12 2c1 2.5 0 5-2 6"/></svg>
              ) : n.includes("orientación") || n.includes("orientacion") || n.includes("vocacional") ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="#607562" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
              ) : n.includes("psicología") || n.includes("psicologia") || n.includes("mental") ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="#607562" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]"><path d="M9.5 2A6.5 6.5 0 0 1 16 8.5c0 2.5-1.5 4.5-3 6l-1 5.5H12l-1-5.5c-1.5-1.5-3-3.5-3-6A6.5 6.5 0 0 1 9.5 2z"/><path d="M12 14.5v1"/><path d="M6.5 8.5h1"/><path d="M16.5 8.5h-1"/></svg>
              ) : n.includes("pareja") || n.includes("amor") || n.includes("relación") || n.includes("relacion") ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="#607562" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              ) : n.includes("social") || n.includes("habilidades") ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="#607562" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]"><path d="M18 11V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h3l3 3 3-3h3a2 2 0 0 0 2-2z"/><path d="M22 13v3a2 2 0 0 1-2 2h-2"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="#607562" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              );
              return (
                <Link href={`/especialidades/${s.id}`} key={s.id}>
                  <div
                    className="flex-shrink-0 w-[160px] h-[120px] flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all active:scale-[0.97]"
                    style={{ background: "#fff", border: "1px solid rgba(96,117,98,0.15)", borderRadius: "12px", padding: "16px 12px" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(96,117,98,0.45)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(96,117,98,0.15)")}
                  >
                    <div className="w-[44px] h-[44px] rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(96,117,98,0.1)" }}>
                      {icon}
                    </div>
                    <span className="text-center leading-tight" style={{ fontSize: "12px", color: "#333333", fontWeight: 500 }}>{s.name}</span>
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
                    <Link href={`/profesional/${pro.id}`}>
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
            <div className="absolute top-0 right-0 w-56 h-56 bg-white/[0.06] rounded-full -translate-y-1/3 translate-x-1/4 pointer-events-none" />
            <div className="absolute bottom-0 right-24 w-40 h-40 bg-white/[0.04] rounded-full translate-y-1/2 pointer-events-none" />
            <div className="relative z-10 flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/[0.12] border border-white/[0.18] flex items-center justify-center flex-shrink-0">
                  <LockOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-medium text-white/55 uppercase tracking-widest block mb-1">Desbloquea más</span>
                  <h3 className="text-base font-medium text-white mb-1">Activa un plan y ahorra</h3>
                  <p className="text-white/65 text-xs max-w-sm leading-relaxed">
                    Con un plan mensual obtienes citas ilimitadas a un precio fijo y acceso prioritario a todos los especialistas.
                  </p>
                </div>
              </div>
              <Link href="/planes" className="flex-shrink-0">
                <Button className="bg-white text-primary hover:bg-white/90 font-medium shadow-none active:scale-95 transition-transform whitespace-nowrap">
                  Ver planes disponibles →
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
    </DashboardLayout>
  );
}
