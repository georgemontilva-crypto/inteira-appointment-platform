import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PRICING, PRICING_DISPLAY } from "@/lib/pricing";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import {
  Star, CheckCircle2, Video, Calendar, Shield, ArrowRight, Users, Clock,
  Award, ChevronRight, Brain, Scale, TrendingUp, DollarSign,
  Mic2, Sparkles, Compass, LayoutDashboard, Wallet, LogOut, ChevronDown,
  Heart, Leaf, Apple, GraduationCap, HeartHandshake, HandHeart, Sun, Smile,
  BookOpen, Briefcase, Globe, Activity, CalendarCheck, CreditCard,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";

const homeSpecialtyIcon: Record<string, React.ReactNode> = {
  Psicología: <Brain className="w-5 h-5 text-white" />,
  Legal: <Scale className="w-5 h-5 text-white" />,
  Emprendimiento: <TrendingUp className="w-5 h-5 text-white" />,
  Finanzas: <DollarSign className="w-5 h-5 text-white" />,
  Idiomas: <Mic2 className="w-5 h-5 text-white" />,
  "Imagen Personal": <Sparkles className="w-5 h-5 text-white" />,
  Vocación: <Compass className="w-5 h-5 text-white" />,
  "Coaching de vida": <Sun className="w-5 h-5 text-white" />,
  "Mindfulness y meditación": <Leaf className="w-5 h-5 text-white" />,
  Nutrición: <Apple className="w-5 h-5 text-white" />,
  "Orientación vocacional": <GraduationCap className="w-5 h-5 text-white" />,
  "Terapia de pareja": <HeartHandshake className="w-5 h-5 text-white" />,
  "Trabajo social": <HandHeart className="w-5 h-5 text-white" />,
  "Salud mental": <Brain className="w-5 h-5 text-white" />,
  "Desarrollo personal": <Smile className="w-5 h-5 text-white" />,
  Educación: <BookOpen className="w-5 h-5 text-white" />,
  Negocios: <Briefcase className="w-5 h-5 text-white" />,
  "Idiomas y cultura": <Globe className="w-5 h-5 text-white" />,
  Bienestar: <Activity className="w-5 h-5 text-white" />,
  Familia: <Heart className="w-5 h-5 text-white" />,
  "Recursos Humanos": <Users className="w-5 h-5 text-white" />,
};

const homeSpecialtyBg: Record<string, string> = {
  Psicología: "bg-[#607562]",
  Legal: "bg-[#4a5c4c]",
  Emprendimiento: "bg-[#607562]",
  Finanzas: "bg-[#4f6651]",
  Idiomas: "bg-[#556e57]",
  "Imagen Personal": "bg-[#607562]",
  Vocación: "bg-[#4a5c4c]",
  "Coaching de vida": "bg-[#607562]",
  "Mindfulness y meditación": "bg-[#4f6651]",
  Nutrición: "bg-[#556e57]",
  "Orientación vocacional": "bg-[#4a5c4c]",
  "Terapia de pareja": "bg-[#607562]",
  "Trabajo social": "bg-[#4f6651]",
  "Salud mental": "bg-[#607562]",
  "Desarrollo personal": "bg-[#556e57]",
  Educación: "bg-[#4a5c4c]",
  Negocios: "bg-[#607562]",
  "Idiomas y cultura": "bg-[#4f6651]",
  Bienestar: "bg-[#556e57]",
  Familia: "bg-[#607562]",
  "Recursos Humanos": "bg-[#4a5c4c]",
};

const FALLBACK_BANNERS = [
  { imageUrl: "https://pub-cc4c932d49594db4a582c5a9a78363f7.r2.dev/imagenes%20carrusel/Eventos-1.webp", title: null, linkUrl: null },
  { imageUrl: "https://pub-cc4c932d49594db4a582c5a9a78363f7.r2.dev/imagenes%20carrusel/Interfaz-Inteira.webp", title: null, linkUrl: null },
];

const CAROUSEL_ITEMS = [
  { name: "Emprendimiento", image: "https://pub-cc4c932d49594db4a582c5a9a78363f7.r2.dev/imagenes%20carrusel/asesorias_Emprendimiento.webp", specialtyNames: ["Emprendimiento", "Coach Deportivo"] },
  { name: "Finanzas", image: "https://pub-cc4c932d49594db4a582c5a9a78363f7.r2.dev/imagenes%20carrusel/asesorias_Finanzas.webp", specialtyNames: ["Asesor Financiero", "Mercadotecnia"] },
  { name: "Idiomas", image: "https://pub-cc4c932d49594db4a582c5a9a78363f7.r2.dev/imagenes%20carrusel/asesorias_Idiomas.webp", specialtyNames: ["Inglés", "Ingles", "Francés", "Lenguaje de Señas", "Oratoria"] },
  { name: "Imagen Personal", image: "https://pub-cc4c932d49594db4a582c5a9a78363f7.r2.dev/imagenes%20carrusel/asesorias_Imagen-Personal.webp", specialtyNames: ["Asesor de Imagen", "Maquillaje"] },
  { name: "Psicología", image: "https://pub-cc4c932d49594db4a582c5a9a78363f7.r2.dev/imagenes%20carrusel/asesorias_Psicologia.webp", specialtyNames: ["Psicología", "Mindfulness y meditación", "Desarrollo Personal"] },
  { name: "Vocación", image: "https://pub-cc4c932d49594db4a582c5a9a78363f7.r2.dev/imagenes%20carrusel/asesorias_Vocacion.webp", specialtyNames: ["Coaching de vida", "Orientación vocacional", "Guía Motivacional"] },
];

const stats = [
  { value: "500+", label: "Especialistas activos" },
  { value: "10k+", label: "Consultas realizadas" },
  { value: "4.9", label: "Calificación promedio" },
  { value: "7", label: "Áreas de especialidad" },
];

const steps = [
  { icon: <Users className="w-6 h-6" />, title: "Regístrate gratis", description: "Crea tu cuenta en minutos, sin costo." },
  { icon: <Award className="w-6 h-6" />, title: "Elige tu especialista", description: "Perfiles verificados con reseñas reales." },
  { icon: <Calendar className="w-6 h-6" />, title: "Agenda tu cita", description: "Confirmación inmediata por email." },
  { icon: <Video className="w-6 h-6" />, title: "Conéctate en línea", description: "Videollamada integrada desde cualquier dispositivo." },
];

const testimonials = [
  { name: "María González", role: "Emprendedora", rating: 5, comment: "Encontré un asesor legal de confianza en minutos. Excelente experiencia.", specialty: "Legal" },
  { name: "Carlos Ramírez", role: "Profesional independiente", rating: 5, comment: "Las sesiones de psicología en línea son igual de efectivas que en persona.", specialty: "Psicología" },
  { name: "Ana Martínez", role: "Directora de empresa", rating: 5, comment: "El asesor financiero me ayudó a estructurar mi negocio. Proceso muy sencillo.", specialty: "Finanzas" },
];

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { data: plans } = trpc.subscriptionPlan.getAll.useQuery();
  const { data: bannersData } = trpc.public.getBanners.useQuery();
  const eventBanners = (bannersData && bannersData.length > 0) ? bannersData : FALLBACK_BANNERS;
  const { data: siteConfig } = trpc.public.getSiteConfig.useQuery({ keys: ["home_hero_banner_url"] });
  const heroImageUrl = siteConfig?.home_hero_banner_url || "https://pub-cc4c932d49594db4a582c5a9a78363f7.r2.dev/imagenes%20carrusel/banner_Mesa%20de%20trabajo%201.jpg";
  const { data: homeCarouselData } = trpc.public.getHomeCarousel.useQuery();
  const dynCarousel = (homeCarouselData && homeCarouselData.length > 0)
    ? homeCarouselData.map((item) => ({ name: item.title, image: item.imageUrl, link: item.link }))
    : CAROUSEL_ITEMS.map((item) => ({ name: item.name, image: item.image, link: "/especialidades" }));
  const logout = trpc.auth.logout.useMutation({ onSuccess: () => window.location.reload() });

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const handlePlanClick = async (productType: string, label: string) => {
    if (!isAuthenticated) {
      toast.info("Crea una cuenta para continuar");
      navigate("/registro");
      return;
    }
    setLoadingPlan(label);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productType }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error ?? "Error desconocido");
      }
    } catch (err) {
      toast.error("Error al iniciar el pago. Intenta de nuevo.");
      console.error("[Stripe]", err);
      setLoadingPlan(null);
    }
  };

  const [activeEventIndex, setActiveEventIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveEventIndex((prev) => (prev + 1) % eventBanners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [eventBanners.length]);

  return (
    <div className="min-h-screen bg-[#f5f2ed] pb-20 md:pb-0">

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="w-[95%] mx-auto">
          <div className="flex items-center justify-between h-14 md:h-16">
            <a href="https://inteira.mx/">
              <div className="flex items-center cursor-pointer">
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663083109800/hvpTFzVHTUDdmneoDhwUNk/logo-verde_8475ff2a.webp"
                  alt="Inteira"
                  className="h-8 md:h-9 w-auto object-contain"
                />
              </div>
            </a>

            <div className="hidden md:flex items-center gap-8">
              <a href="#especialidades" className="text-sm font-medium text-gray-500 hover:text-[#5B6A57] transition-colors">Especialidades</a>
              <a href="#por-que" className="text-sm font-medium text-gray-500 hover:text-[#5B6A57] transition-colors">Cómo funciona</a>
              <a href="#planes" className="text-sm font-medium text-gray-500 hover:text-[#5B6A57] transition-colors">Planes</a>
              <Link href="/especialidades">
                <span className="text-sm font-medium text-gray-500 hover:text-[#5B6A57] transition-colors cursor-pointer">Especialistas</span>
              </Link>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              {isAuthenticated ? (
                <>
                  <Link href="/dashboard">
                    <Button size="sm" className="hidden md:flex bg-[#5B6A57] hover:bg-[#3d4a3a] text-white border-0">
                      Mi dashboard
                    </Button>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-gray-100 transition-colors focus:outline-none">
                        {(user as any)?.avatarUrl || (user as any)?.profileImage ? (
                          <img
                            src={(user as any).avatarUrl ?? (user as any).profileImage}
                            alt={user?.name ?? "Avatar"}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#5B6A57] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {initials}
                          </div>
                        )}
                        <span className="hidden md:block text-sm font-medium text-gray-900 max-w-[100px] truncate">
                          {user?.name?.split(" ")[0] ?? "Mi cuenta"}
                        </span>
                        <ChevronDown className="hidden md:block w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg">
                      <div className="px-3 py-2">
                        <p className="text-xs font-semibold text-gray-900 truncate">{user?.name ?? "Usuario"}</p>
                        <p className="text-[10px] text-gray-400 truncate">{user?.email ?? ""}</p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate("/dashboard")} className="cursor-pointer gap-2 text-sm">
                        <LayoutDashboard className="w-4 h-4 text-[#5B6A57]" /> Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/wallet")} className="cursor-pointer gap-2 text-sm">
                        <Wallet className="w-4 h-4 text-[#5B6A57]" /> Mi Wallet
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => logout.mutate()} className="cursor-pointer gap-2 text-sm text-red-500 focus:text-red-500">
                        <LogOut className="w-4 h-4" /> Cerrar sesión
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <a href="/login" className="md:hidden">
                    <Button size="sm" variant="outline" className="text-[#5B6A57] border-[#5B6A57]/40 text-xs px-3 rounded-full">
                      Entrar
                    </Button>
                  </a>
                  <a href="/login" className="hidden md:block">
                    <Button variant="ghost" size="sm" className="text-[#5B6A57] hover:text-[#3d4a3a]">
                      Iniciar sesión
                    </Button>
                  </a>
                  <a href="/registro" className="hidden md:block">
                    <Button size="sm" className="bg-[#5B6A57] hover:bg-[#3d4a3a] text-white border-0">
                      Comenzar gratis
                    </Button>
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* PAGE CONTENT */}
      <div className="w-[95%] mx-auto">

        {/* HERO */}
        <div className="pt-[72px] md:pt-[80px] mb-10">
          <section
            className="rounded-2xl overflow-hidden relative h-[320px] md:h-[420px] flex items-center px-8 md:px-14"
            style={{ backgroundImage: `url(${heroImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
          >
            <div className="absolute inset-0" style={{ background: "linear-gradient(120deg, rgba(15,30,18,0.85) 0%, rgba(15,30,18,0.45) 55%, transparent 100%)" }} />
            <div className="relative z-10 max-w-md">
              <span className="inline-block bg-white/15 text-white text-xs font-medium px-3 py-1.5 rounded-full mb-4">
                Plataforma de asesorías online
              </span>
              <h1 className="text-3xl md:text-5xl font-medium text-white mb-3 leading-tight">Conecta con el especialista correcto</h1>
              <p className="text-sm md:text-base text-white/90 mb-5">Psicología, Legal, Finanzas, Emprendimiento y más.</p>
              <a href={isAuthenticated ? "/especialidades" : "/registro"}>
                <button className="bg-white text-[#1f3a23] rounded-lg px-6 py-3 text-sm font-medium hover:-translate-y-0.5 hover:shadow-lg transition-all">
                  Agendar cita
                </button>
              </a>
            </div>
          </section>
        </div>

        {/* ESPECIALIDADES */}
        <section id="especialidades" className="py-8 md:py-10">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <p className="text-xs font-semibold text-[#A7774E] uppercase tracking-widest mb-1">Especialidades</p>
              <h2 className="text-xl md:text-2xl font-medium text-gray-900">Encuentra al experto que necesitas</h2>
            </div>
            <Link href="/especialidades"><span className="text-xs font-medium text-[#5B6A57] cursor-pointer whitespace-nowrap">Ver todas →</span></Link>
          </div>
          <div className="flex gap-3.5 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {dynCarousel.map((item, i) => (
              <a key={item.name + i} href="/especialidades" className="flex-shrink-0 w-[170px] h-[220px] rounded-2xl relative overflow-hidden"
                style={{ backgroundImage: `url(${item.image})`, backgroundSize: "cover", backgroundPosition: "center" }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-white/25 flex items-center justify-center">
                  <ArrowRight className="w-3.5 h-3.5 text-white -rotate-45" />
                </div>
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-[9px] text-white/70 uppercase tracking-wider mb-0.5">Especialidad</p>
                  <p className="text-sm font-medium text-white">{item.name}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* POR QUÉ INTEIRA — bento */}
        <section id="por-que" className="py-8 md:py-12">
          <p className="text-xs font-semibold text-[#A7774E] uppercase tracking-widest mb-1">Por qué Inteira</p>
          <h2 className="text-xl md:text-2xl font-medium text-gray-900 mb-6">La forma más simple de conectar con expertos</h2>
          <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-3">
            <div className="rounded-2xl relative overflow-hidden min-h-[280px]"
              style={{ backgroundImage: `url(https://pub-cc4c932d49594db4a582c5a9a78363f7.r2.dev/imagenes%20carrusel/full-shot-young-woman-undergoing-therapy.jpg)`, backgroundSize: "cover", backgroundPosition: "top" }}>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c1a0e]/90 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5">
                <h3 className="text-white font-medium text-base mb-1">Busca y elige con confianza</h3>
                <p className="text-white/80 text-xs">Accede a perfiles verificados con reseñas reales. Filtra por especialidad, precio y disponibilidad.</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex-1 bg-white border border-[#e8e4dd] rounded-2xl p-5 flex flex-col">
                <div className="w-9 h-9 rounded-lg bg-[#5B6A57]/10 flex items-center justify-center mb-3">
                  <CalendarCheck className="w-4 h-4 text-[#5B6A57]" />
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">Agenda en segundos</p>
                <p className="text-xs text-gray-500">Perfiles verificados y confirmación inmediata.</p>
              </div>
              <div className="flex-1 bg-white border border-[#e8e4dd] rounded-2xl p-5 flex flex-col">
                <div className="w-9 h-9 rounded-lg bg-[#5B6A57]/10 flex items-center justify-center mb-3">
                  <Video className="w-4 h-4 text-[#5B6A57]" />
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">Videollamada integrada</p>
                <p className="text-xs text-gray-500">Sin instalar nada, desde cualquier dispositivo.</p>
              </div>
            </div>
          </div>
        </section>

        {/* VENTAJAS */}
        <section className="py-8 md:py-10">
          <p className="text-xs font-semibold text-[#A7774E] uppercase tracking-widest mb-1">Ventajas</p>
          <h2 className="text-xl md:text-2xl font-medium text-gray-900 mb-6">Todo lo que necesitas en un solo lugar</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: <Shield className="w-[18px] h-[18px] text-[#5B6A57]" />, title: "Verificados", desc: "Credenciales reales" },
              { icon: <Clock className="w-[18px] h-[18px] text-[#5B6A57]" />, title: "Agenda flexible", desc: "7 días a la semana" },
              { icon: <Video className="w-[18px] h-[18px] text-[#5B6A57]" />, title: "100% en línea", desc: "Sin apps externas" },
              { icon: <CreditCard className="w-[18px] h-[18px] text-[#5B6A57]" />, title: "Pagos seguros", desc: "Todo encriptado" },
            ].map((v, i) => (
              <div key={i} className="bg-white border border-[#e8e4dd] rounded-2xl p-4">
                <div className="w-9 h-9 rounded-full bg-[#5B6A57]/10 flex items-center justify-center mb-3">{v.icon}</div>
                <p className="text-sm font-medium text-gray-900 mb-0.5">{v.title}</p>
                <p className="text-xs text-gray-500">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section id="como-funciona" className="py-8 md:py-12">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold text-[#A7774E] uppercase tracking-widest mb-2">Proceso</p>
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">¿Cómo funciona Inteira?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((step, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-[#e8e4dd] flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-[#5B6A57]/10 flex items-center justify-center mb-4 text-[#5B6A57]">
                  {step.icon}
                </div>
                <span className="text-[10px] font-bold text-[#A7774E] uppercase tracking-widest mb-1">Paso {i + 1}</span>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed flex-1">{step.description}</p>
                <a href="/registro" className="inline-flex items-center gap-1 text-xs text-[#5B6A57] hover:text-[#3d4a3a] font-medium mt-4 transition-colors">
                  Ver más <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* EVENTOS */}
        <section className="py-6">
          <h2 className="text-lg font-semibold text-[#3d4a3a] mb-4">Próximos Eventos</h2>
          <div className="relative rounded-2xl overflow-hidden">
            {eventBanners[activeEventIndex]?.linkUrl ? (
              <a href={eventBanners[activeEventIndex].linkUrl!} target="_blank" rel="noopener noreferrer">
                <img
                  src={eventBanners[activeEventIndex].imageUrl}
                  alt={eventBanners[activeEventIndex].title ?? "Próximo evento"}
                  className="w-full object-cover rounded-2xl transition-opacity duration-500 h-[220px] md:h-[400px]"
                />
              </a>
            ) : (
              <img
                src={eventBanners[activeEventIndex]?.imageUrl}
                alt={eventBanners[activeEventIndex]?.title ?? "Próximo evento"}
                className="w-full object-cover rounded-2xl transition-opacity duration-500 h-[220px] md:h-[400px]"
              />
            )}
            <div className="flex justify-center gap-2 mt-3">
              {eventBanners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveEventIndex(i)}
                  className={`h-2 rounded-full transition-all ${i === activeEventIndex ? "w-6 bg-[#5B6A57]" : "w-2 bg-gray-300"}`}
                  aria-label={`Banner ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* PLANES */}
        <section id="planes" className="py-8 md:py-12">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold text-[#A7774E] uppercase tracking-widest mb-2">Planes y precios</p>
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">Elige el plan perfecto para ti</h2>
            <p className="text-sm text-gray-500 mt-2 max-w-xl mx-auto">
              Suscripciones mensuales o compra individual. Sin contratos, cancela cuando quieras.
            </p>
          </div>

          <div className="flex flex-col-reverse md:grid md:grid-cols-3 md:gap-6 md:items-stretch gap-4">

            {/* Plan Básico */}
            <div className="order-2 md:order-1">
              <Card className="border border-[#e8e4dd] bg-white hover:shadow-lg transition-shadow h-full flex flex-col overflow-hidden">
                <div className="bg-gray-50 border-b border-[#e8e4dd] px-6 py-5">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1">Esencial</p>
                  <h3 className="text-xl font-bold text-gray-900">Plan Básico</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-bold text-gray-900">${PRICING.PLAN_BASIC_MXN}</span>
                    <span className="text-gray-400 text-sm">/mes</span>
                  </div>
                </div>
                <CardContent className="p-6 flex flex-col flex-1">
                  <ul className="space-y-3 mb-6">
                    {["980 créditos mensuales", "4 sesiones básicas", "Vigencia 60 días", "Todas las especialidades"].map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="w-4 h-4 text-[#5B6A57] flex-shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="outline"
                    className="w-full border-[#5B6A57]/40 text-[#5B6A57] hover:bg-[#5B6A57]/5 mt-auto"
                    disabled={loadingPlan === "Plan Básico"}
                    onClick={() => handlePlanClick("plan_basic", "Plan Básico")}
                  >
                    {loadingPlan === "Plan Básico" ? "Procesando..." : "Suscribirse"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Plan Pro */}
            <div className="order-1 md:order-2 md:-mt-4 md:-mb-4">
              <Card className="relative border-0 shadow-2xl overflow-hidden h-full flex flex-col">
                <div className="bg-[#5B6A57] px-6 py-5">
                  <Badge className="bg-white/20 text-white border-white/30 text-xs font-semibold px-2.5 py-0.5 mb-2">
                    ⭐ Más popular
                  </Badge>
                  <h3 className="text-xl font-bold text-white">Plan Pro</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-bold text-white">{PRICING_DISPLAY.PLAN_PRO}</span>
                    <span className="text-white/70 text-sm">/mes</span>
                  </div>
                </div>
                <CardContent className="p-6 flex flex-col flex-1 bg-white">
                  <ul className="space-y-3 mb-6">
                    {["2,500 créditos mensuales", "2 sesiones premium", "Vigencia 60 días", "Acceso prioritario", "Soporte 24/7", "Precio especial en sesiones"].map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="w-4 h-4 text-[#5B6A57] flex-shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full bg-[#5B6A57] hover:bg-[#3d4a3a] text-white font-semibold shadow-md mt-auto"
                    disabled={loadingPlan === "Plan Pro"}
                    onClick={() => handlePlanClick("plan_pro", "Plan Pro")}
                  >
                    {loadingPlan === "Plan Pro" ? "Procesando..." : "Suscribirse"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Sesiones individuales */}
            <div className="order-3 md:order-3 flex flex-col">
              <div className="bg-gray-50 border border-b-0 border-[#e8e4dd] rounded-t-2xl px-5 py-4">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1">Pago único</p>
                <h3 className="text-xl font-bold text-gray-900">Por sesión</h3>
              </div>
              <div className="flex flex-col gap-0 border border-[#e8e4dd] rounded-b-2xl overflow-hidden">
                <div className="bg-white p-5 border-b border-[#e8e4dd]">
                  <h4 className="font-semibold text-gray-900">Sesión Básica</h4>
                  <p className="text-xs text-gray-400 mt-0.5">60 min · Videollamada integrada</p>
                  <div className="flex items-baseline gap-1 mt-3">
                    <span className="text-2xl font-bold text-[#5B6A57]">${PRICING.SESSION_BASIC_MXN}</span>
                    <span className="text-xs text-gray-400">MXN</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 border-[#5B6A57]/30 text-[#5B6A57] hover:bg-[#5B6A57]/5 text-xs"
                    disabled={loadingPlan === "Sesión Básica"}
                    onClick={() => handlePlanClick("individual_basic", "Sesión Básica")}
                  >
                    {loadingPlan === "Sesión Básica" ? "Procesando..." : "Comprar sesión"}
                  </Button>
                </div>
                <div className="bg-white p-5">
                  <h4 className="font-semibold text-gray-900">Sesión Premium</h4>
                  <p className="text-xs text-gray-400 mt-0.5">60 min · Experto top</p>
                  <div className="flex items-baseline gap-1 mt-3">
                    <span className="text-2xl font-bold text-[#5B6A57]">{PRICING_DISPLAY.SESSION_PREMIUM}</span>
                    <span className="text-xs text-gray-400">MXN</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 border-[#5B6A57]/30 text-[#5B6A57] hover:bg-[#5B6A57]/5 text-xs"
                    disabled={loadingPlan === "Sesión Premium"}
                    onClick={() => handlePlanClick("individual_premium", "Sesión Premium")}
                  >
                    {loadingPlan === "Sesión Premium" ? "Procesando..." : "Comprar sesión"}
                  </Button>
                </div>
              </div>
            </div>

          </div>

          <div className="text-center mt-8">
            <Link href="/planes">
              <Button variant="ghost" className="text-[#5B6A57] text-sm">
                Ver todos los planes y detalles <ChevronRight className="ml-1 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </section>

        {/* STATS */}
        <section className="py-8 md:py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((s, i) => (
              <div key={i} className="bg-white border border-[#e8e4dd] rounded-2xl p-5 text-center">
                <p className="text-2xl font-medium text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* TESTIMONIOS */}
      <section className="py-8 md:py-16">
        <div className="w-[95%] mx-auto">
          <div className="mb-6 text-center">
            <p className="text-xs font-semibold text-[#A7774E] uppercase tracking-widest mb-2">Testimonios</p>
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">Lo que dicen nuestros usuarios</h2>
          </div>

          <div className="md:hidden overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            <div className="flex gap-3 px-2" style={{ width: "max-content" }}>
              {testimonials.map((t, i) => (
                <div key={i} className="w-72 bg-white rounded-2xl border border-[#e8e4dd] p-5 shadow-sm flex-shrink-0">
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="w-3.5 h-3.5 fill-[#A7774E] text-[#A7774E]" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed mb-4">"{t.comment}"</p>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#5B6A57] flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{t.name}</p>
                      <p className="text-[10px] text-gray-400">{t.role} · {t.specialty}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden md:grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <Card key={i} className="border-[#e8e4dd] hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-[#A7774E] text-[#A7774E]" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed mb-4">"{t.comment}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#5B6A57] flex items-center justify-center text-white font-semibold text-sm">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.role} · {t.specialty}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-8 md:py-16">
        <div className="w-[95%] mx-auto">
          <div className="bg-[#3d4a3a] rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#A7774E] rounded-full blur-3xl" />
            </div>
            <div className="relative z-10">
              <h2 className="text-2xl md:text-4xl font-semibold mb-3 text-white">¿Listo para tu primera consulta?</h2>
              <p className="text-white/70 text-sm md:text-base mb-6 max-w-xl mx-auto">
                Únete a miles de personas que ya confían en Inteira para conectar con especialistas de calidad.
              </p>
              <a href="/registro">
                <Button size="lg" className="bg-white text-[#3d4a3a] hover:bg-white/90 font-semibold px-8 shadow-lg">
                  Comenzar gratis hoy <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA PROFESIONALES */}
      <section className="py-8 md:py-16">
        <div className="w-[95%] mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
            <div className="text-center md:text-left max-w-xl">
              <span className="text-xs font-semibold tracking-widest text-[#A7774E] uppercase mb-3 block">Para profesionales</span>
              <h2 className="text-2xl md:text-4xl font-semibold text-gray-900 mb-3">
                ¿Eres especialista?{" "}
                <br className="hidden md:block" />
                <span className="text-[#5B6A57]">Únete a Inteira</span>
              </h2>
              <p className="text-gray-500 text-sm md:text-base mb-6">
                Comparte tu conocimiento, amplía tu cartera de clientes y gestiona tus citas desde un solo lugar.
                Más de <strong>500 profesionales</strong> ya confían en nuestra plataforma.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <Link href="/registro-profesional">
                  <Button size="lg" className="bg-[#5B6A57] hover:bg-[#3d4a3a] text-white font-semibold px-8 w-full sm:w-auto">
                    Registrarme como profesional <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:max-w-sm">
              {[
                { icon: <Calendar className="w-5 h-5 text-[#5B6A57]" />, title: "Gestión de agenda", desc: "Controla tu disponibilidad fácilmente" },
                { icon: <Users className="w-5 h-5 text-[#5B6A57]" />, title: "Más clientes", desc: "Accede a miles de usuarios que te buscan" },
                { icon: <Shield className="w-5 h-5 text-[#5B6A57]" />, title: "Perfil verificado", desc: "Genera confianza con tu credencial" },
                { icon: <Award className="w-5 h-5 text-[#5B6A57]" />, title: "Reseñas reales", desc: "Construye tu reputación con opiniones" },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-[#e8e4dd] flex gap-3 items-start">
                  <div className="w-9 h-9 rounded-lg bg-[#5B6A57]/10 flex items-center justify-center flex-shrink-0">{item.icon}</div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 md:py-12" style={{ backgroundColor: "#5B6A57" }}>
        <div className="w-[95%] mx-auto">
          <div className="hidden md:grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="mb-4">
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663083109800/hvpTFzVHTUDdmneoDhwUNk/logo-blanco_886f1d65.webp"
                  alt="Inteira"
                  className="h-8 w-auto object-contain"
                />
              </div>
              <p className="text-sm text-white/75">
                Plataforma de consultas con especialistas en línea. Conectamos personas con profesionales de confianza.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm text-white">Especialidades</h4>
              <ul className="space-y-2 text-sm text-white/75">
                <li><a href="#" className="hover:text-white transition-colors">Psicología</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Legal</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Finanzas</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Emprendimiento</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm text-white">Plataforma</h4>
              <ul className="space-y-2 text-sm text-white/75">
                <li><a href="#por-que" className="hover:text-white transition-colors">Cómo funciona</a></li>
                <li><a href="#planes" className="hover:text-white transition-colors">Planes</a></li>
                <li><Link href="/registro-profesional"><span className="hover:text-white transition-colors cursor-pointer">Soy profesional</span></Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm text-white">Legal</h4>
              <ul className="space-y-2 text-sm text-white/75">
                <li><Link href="/terminos"><span className="hover:text-white transition-colors cursor-pointer">Términos de uso</span></Link></li>
                <li><Link href="/privacidad"><span className="hover:text-white transition-colors cursor-pointer">Privacidad</span></Link></li>
                <li><a href="mailto:soporte@inteira.mx" className="hover:text-white transition-colors">Contacto</a></li>
              </ul>
            </div>
          </div>

          <div className="md:hidden">
            <div className="flex items-center justify-between mb-5">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663083109800/hvpTFzVHTUDdmneoDhwUNk/logo-blanco_886f1d65.webp"
                alt="Inteira"
                className="h-7 w-auto object-contain"
              />
              <a href="https://inteira.app" className="text-xs text-white/70 hover:text-white transition-colors">inteira.app</a>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div>
                <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">Áreas</p>
                <ul className="space-y-1.5 text-xs text-white/75">
                  <li><a href="#" className="hover:text-white">Psicología</a></li>
                  <li><a href="#" className="hover:text-white">Legal</a></li>
                  <li><a href="#" className="hover:text-white">Finanzas</a></li>
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">App</p>
                <ul className="space-y-1.5 text-xs text-white/75">
                  <li><a href="#por-que" className="hover:text-white">Cómo funciona</a></li>
                  <li><Link href="/planes"><span className="hover:text-white cursor-pointer">Planes</span></Link></li>
                  <li><Link href="/registro-profesional"><span className="hover:text-white cursor-pointer">Profesionales</span></Link></li>
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">Legal</p>
                <ul className="space-y-1.5 text-xs text-white/75">
                  <li><Link href="/terminos"><span className="hover:text-white cursor-pointer">Términos</span></Link></li>
                  <li><Link href="/privacidad"><span className="hover:text-white cursor-pointer">Privacidad</span></Link></li>
                  <li><a href="mailto:soporte@inteira.mx" className="hover:text-white">Contacto</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-white/20 pt-5 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs md:text-sm text-white/70">
              © {new Date().getFullYear()} Inteira. Todos los derechos reservados.
            </p>
            <p className="hidden md:block text-sm text-white/70">
              <a href="https://inteira.app" className="hover:text-white transition-colors">inteira.app</a>
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
