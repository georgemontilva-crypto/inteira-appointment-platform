import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
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
  Brain,
  Scale,
  DollarSign,
  Mic2,
  Compass,
  Heart,
  Leaf,
  Apple,
  GraduationCap,
  HeartHandshake,
  HandHeart,
  Sun,
  Smile,
  Briefcase,
  Globe,
  Activity,
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

const specialtyIcon: Record<string, React.ReactNode> = {
  "Psicología": <Brain className="w-6 h-6 text-white" />,
  "Legal": <Scale className="w-6 h-6 text-white" />,
  "Emprendimiento": <TrendingUp className="w-6 h-6 text-white" />,
  "Finanzas": <DollarSign className="w-6 h-6 text-white" />,
  "Idiomas": <Mic2 className="w-6 h-6 text-white" />,
  "Imagen Personal": <Sparkles className="w-6 h-6 text-white" />,
  "Vocación": <Compass className="w-6 h-6 text-white" />,
  "Coaching de vida": <Sun className="w-6 h-6 text-white" />,
  "Mindfulness y meditación": <Leaf className="w-6 h-6 text-white" />,
  "Nutrición": <Apple className="w-6 h-6 text-white" />,
  "Orientación vocacional": <GraduationCap className="w-6 h-6 text-white" />,
  "Terapia de pareja": <HeartHandshake className="w-6 h-6 text-white" />,
  "Trabajo social": <HandHeart className="w-6 h-6 text-white" />,
  "Salud mental": <Brain className="w-6 h-6 text-white" />,
  "Desarrollo personal": <Smile className="w-6 h-6 text-white" />,
  "Educación": <BookOpen className="w-6 h-6 text-white" />,
  "Negocios": <Briefcase className="w-6 h-6 text-white" />,
  "Idiomas y cultura": <Globe className="w-6 h-6 text-white" />,
  "Bienestar": <Activity className="w-6 h-6 text-white" />,
  "Familia": <Heart className="w-6 h-6 text-white" />,
  "Recursos Humanos": <Users className="w-6 h-6 text-white" />,
};

const specialtyBg: Record<string, string> = {
  "Psicología": "bg-[#607562]",
  "Legal": "bg-[#4a5c4c]",
  "Emprendimiento": "bg-[#607562]",
  "Finanzas": "bg-[#4f6651]",
  "Idiomas": "bg-[#556e57]",
  "Imagen Personal": "bg-[#607562]",
  "Vocación": "bg-[#4a5c4c]",
  "Coaching de vida": "bg-[#607562]",
  "Mindfulness y meditación": "bg-[#4f6651]",
  "Nutrición": "bg-[#556e57]",
  "Orientación vocacional": "bg-[#4a5c4c]",
  "Terapia de pareja": "bg-[#607562]",
  "Trabajo social": "bg-[#4f6651]",
  "Salud mental": "bg-[#607562]",
  "Desarrollo personal": "bg-[#556e57]",
  "Educación": "bg-[#4a5c4c]",
  "Negocios": "bg-[#607562]",
  "Idiomas y cultura": "bg-[#4f6651]",
  "Bienestar": "bg-[#556e57]",
  "Familia": "bg-[#607562]",
  "Recursos Humanos": "bg-[#4a5c4c]",
};

const specialtyDescriptions: Record<string, string> = {
  "Psicología": "Bienestar mental y emocional con psicólogos certificados.",
  "Legal": "Asesoría legal en diversas áreas del derecho.",
  "Emprendimiento": "Asesoría para emprendedores y startups en crecimiento.",
  "Finanzas": "Consultoría financiera personal y empresarial.",
  "Idiomas": "Clases con profesores nativos y certificados.",
  "Imagen Personal": "Consultoría de imagen, estilo y presencia personal.",
  "Vocación": "Orientación vocacional y desarrollo profesional.",
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
          <h2 className="text-base font-bold text-foreground mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>
            Explorar especialidades
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}>
            {(specialties ?? [
              { id: 1, name: "Psicología", description: null },
              { id: 2, name: "Emprendimiento", description: null },
              { id: 3, name: "Legal", description: null },
              { id: 4, name: "Finanzas", description: null },
            ]).map((s) => (
              <Link key={s.id} href={`/especialidades/${s.id}`} className="flex-shrink-0">
                <Card className="group cursor-pointer border-border active:scale-[0.99] md:hover:border-primary/40 md:hover:shadow-md transition-all duration-200">
                  <CardContent className="p-4 md:p-5">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-12 h-12 rounded-2xl ${specialtyBg[s.name] ?? "bg-[#607562]"} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-200`}>
                        {specialtyIcon[s.name] ?? <Compass className="w-6 h-6 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-foreground mb-0.5" style={{ fontFamily: "Poppins, sans-serif" }}>
                          {s.name}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {(s as any).description ?? specialtyDescriptions[s.name] ?? "Consultas especializadas con profesionales certificados."}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 md:hidden" />
                    </div>
                    <div className="hidden md:flex items-center justify-between mt-4 pt-3 border-t border-border">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Users className="w-4 h-4 text-primary" />
                        <span>Especialistas disponibles</span>
                      </div>
                      <span className="flex items-center gap-1 text-sm font-medium text-primary group-hover:underline">
                        Ver profesionales
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
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
