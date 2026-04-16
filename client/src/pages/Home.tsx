import { useAuth } from "@/_core/hooks/useAuth";
import { useRef, useState, useEffect } from "react";
import { PRICING, PRICING_DISPLAY } from "@/lib/pricing";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import {
  Star,
  CheckCircle2,
  Video,
  Calendar,
  Shield,
  ArrowRight,
  Users,
  Clock,
  Award,
  ChevronRight,
  ChevronLeft,
  Brain,
  Scale,
  TrendingUp,
  DollarSign,
  Mic2,
  Sparkles,
  Compass,
  LayoutDashboard,
  Wallet,
  LogOut,
  ChevronDown,
  Heart,
  Leaf,
  Apple,
  GraduationCap,
  HeartHandshake,
  HandHeart,
  Sun,
  Smile,
  BookOpen,
  Briefcase,
  Globe,
  Activity,
  Search,
  CalendarCheck,
  CreditCard,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
  "Nutrición": <Apple className="w-5 h-5 text-white" />,
  "Orientación vocacional": <GraduationCap className="w-5 h-5 text-white" />,
  "Terapia de pareja": <HeartHandshake className="w-5 h-5 text-white" />,
  "Trabajo social": <HandHeart className="w-5 h-5 text-white" />,
  "Salud mental": <Brain className="w-5 h-5 text-white" />,
  "Desarrollo personal": <Smile className="w-5 h-5 text-white" />,
  "Educación": <BookOpen className="w-5 h-5 text-white" />,
  "Negocios": <Briefcase className="w-5 h-5 text-white" />,
  "Idiomas y cultura": <Globe className="w-5 h-5 text-white" />,
  "Bienestar": <Activity className="w-5 h-5 text-white" />,
  "Familia": <Heart className="w-5 h-5 text-white" />,
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

const CAROUSEL_ITEMS = [
  { name: "Emprendimiento",   image: "https://pub-cc4c932d49594db4a582c5a9a78363f7.r2.dev/imagenes%20carrusel/asesorias_Emprendimiento.webp",    specialtyNames: ["Emprendimiento", "Coach Deportivo"] },
  { name: "Finanzas",         image: "https://pub-cc4c932d49594db4a582c5a9a78363f7.r2.dev/imagenes%20carrusel/asesorias_Finanzas.webp",           specialtyNames: ["Asesor Financiero", "Mercadotecnia"] },
  { name: "Idiomas",          image: "https://pub-cc4c932d49594db4a582c5a9a78363f7.r2.dev/imagenes%20carrusel/asesorias_Idiomas.webp",             specialtyNames: ["Inglés", "Ingles", "Francés", "Lenguaje de Señas", "Oratoria"] },
  { name: "Imagen Personal",  image: "https://pub-cc4c932d49594db4a582c5a9a78363f7.r2.dev/imagenes%20carrusel/asesorias_Imagen-Personal.webp",    specialtyNames: ["Asesor de Imagen", "Maquillaje"] },
  { name: "Psicología",       image: "https://pub-cc4c932d49594db4a582c5a9a78363f7.r2.dev/imagenes%20carrusel/asesorias_Psicologia.webp",          specialtyNames: ["Psicología", "Mindfulness y meditación", "Desarrollo Personal"] },
  { name: "Vocación",         image: "https://pub-cc4c932d49594db4a582c5a9a78363f7.r2.dev/imagenes%20carrusel/asesorias_Vocacion.webp",            specialtyNames: ["Coaching de vida", "Orientación vocacional", "Guía Motivacional"] },
];

const steps = [
  {
    icon: <Users className="w-5 h-5" />,
    title: "Regístrate gratis",
    description: "Crea tu cuenta en minutos.",
  },
  {
    icon: <Award className="w-5 h-5" />,
    title: "Elige tu especialista",
    description: "Perfiles verificados con reseñas reales.",
  },
  {
    icon: <Calendar className="w-5 h-5" />,
    title: "Agenda tu cita",
    description: "Confirmación inmediata por email.",
  },
  {
    icon: <Video className="w-5 h-5" />,
    title: "Conéctate en línea",
    description: "Videollamada integrada desde cualquier dispositivo.",
  },
];

const stats = [
  { value: "500+", label: "Especialistas" },
  { value: "10k+", label: "Consultas" },
  { value: "4.9", label: "Calificación" },
  { value: "7", label: "Áreas" },
];

const testimonials = [
  {
    name: "María González",
    role: "Emprendedora",
    rating: 5,
    comment: "Encontré un asesor legal de confianza en minutos. Excelente experiencia.",
    specialty: "Legal",
  },
  {
    name: "Carlos Ramírez",
    role: "Profesional independiente",
    rating: 5,
    comment: "Las sesiones de psicología en línea son igual de efectivas que en persona.",
    specialty: "Psicología",
  },
  {
    name: "Ana Martínez",
    role: "Directora de empresa",
    rating: 5,
    comment: "El asesor financiero me ayudó a estructurar mi negocio. Proceso muy sencillo.",
    specialty: "Finanzas",
  },
];

const defaultSpecialties = [
  { id: 1, name: "Psicología" },
  { id: 2, name: "Emprendimiento" },
  { id: 3, name: "Finanzas" },
  { id: 4, name: "Idiomas" },
  { id: 5, name: "Imagen Personal" },
  { id: 6, name: "Legal" },
  { id: 7, name: "Vocación" },
] as Array<{ id: number; name: string }>;


export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { data: specialties } = trpc.specialty.getAll.useQuery();
  const { data: plans } = trpc.subscriptionPlan.getAll.useQuery();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => window.location.reload(),
  });

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";


  const specialtiesScrollRef = useRef<HTMLDivElement>(null);
  const [activeDot, setActiveDot] = useState(0);

  const scrollSpecialties = (dir: "left" | "right") => {
    specialtiesScrollRef.current?.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  const scrollToIndex = (index: number) => {
    const container = specialtiesScrollRef.current;
    if (!container) return;
    const card = container.children[index] as HTMLElement;
    if (card) {
      container.scrollTo({ left: card.offsetLeft - container.offsetLeft, behavior: "smooth" });
    }
    setActiveDot(index);
  };

  useEffect(() => {
    const total = CAROUSEL_ITEMS.length;
    const interval = setInterval(() => {
      setActiveDot((prev) => {
        const next = (prev + 1) % total;
        const container = specialtiesScrollRef.current;
        if (container) {
          const card = container.children[next] as HTMLElement;
          if (card) container.scrollTo({ left: card.offsetLeft - container.offsetLeft, behavior: "smooth" });
        }
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* ══════════════════════════════════════════
          NAVBAR — desktop visible, mobile minimal
          ══════════════════════════════════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="container">
          <div className="flex items-center justify-between h-14 md:h-16">
            {/* Logo */}
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663083109800/hvpTFzVHTUDdmneoDhwUNk/logo-verde_8475ff2a.webp"
                  alt="Inteira"
                  className="h-8 md:h-9 w-auto object-contain"
                />
              </div>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#especialidades" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Especialidades
              </a>
              <a href="#como-funciona" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Cómo funciona
              </a>
              <a href="#planes" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Planes
              </a>
              <Link href="/especialidades">
                <span className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                  Especialistas
                </span>
              </Link>
            </div>

            {/* Auth buttons */}
            <div className="flex items-center gap-2 md:gap-3">
              {isAuthenticated ? (
                <>
                  <Link href="/dashboard">
                    <Button size="sm" className="hidden md:flex gradient-brand text-white border-0 shadow-md shadow-primary/30">
                      Mi dashboard
                    </Button>
                  </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-muted transition-colors active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                      {/* Avatar circle */}
                      {(user as any)?.avatarUrl || (user as any)?.profileImage ? (
                        <img
                          src={(user as any).avatarUrl ?? (user as any).profileImage}
                          alt={user?.name ?? "Avatar"}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0 shadow-sm"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                          {initials}
                        </div>
                      )}
                      {/* Name — desktop only */}
                      <span className="hidden md:block text-sm font-medium text-foreground max-w-[100px] truncate">
                        {user?.name?.split(" ")[0] ?? "Mi cuenta"}
                      </span>
                      <ChevronDown className="hidden md:block w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-border">
                    <div className="px-3 py-2">
                      <p className="text-xs font-semibold text-foreground truncate">{user?.name ?? "Usuario"}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{user?.email ?? ""}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/dashboard")} className="cursor-pointer gap-2 text-sm">
                      <LayoutDashboard className="w-4 h-4 text-primary" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/wallet")} className="cursor-pointer gap-2 text-sm">
                      <Wallet className="w-4 h-4 text-primary" />
                      Mi Wallet
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => logout.mutate()}
                      className="cursor-pointer gap-2 text-sm text-red-500 focus:text-red-500"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </>
              ) : (
                <>
                  {/* Mobile */}
                  <a href={getLoginUrl()} className="md:hidden">
                    <Button size="sm" variant="outline" className="text-primary border-primary/40 hover:bg-primary/5 text-xs px-3 rounded-full">
                      Entrar
                    </Button>
                  </a>
                  {/* Desktop */}
                  <a href={getLoginUrl()} className="hidden md:block">
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary">
                      Iniciar sesión
                    </Button>
                  </a>
                  <a href={getLoginUrl()} className="hidden md:block">
                    <Button size="sm" className="gradient-brand text-white border-0 shadow-md shadow-primary/30">
                      Comenzar gratis
                    </Button>
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════
          HERO — Mobile: app-style greeting card
                 Desktop: split layout
          ══════════════════════════════════════════ */}
      <section className="relative pt-14 md:pt-24 overflow-hidden">
        {/* Desktop background blobs */}
        <div className="hidden md:block absolute top-20 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="hidden md:block absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

        {/* ── Mobile Hero ── */}
        <div className="md:hidden">
          {/* Gradient header card */}
          <div className="gradient-hero px-5 pt-8 pb-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative z-10">
              <p className="text-white/70 text-sm font-medium mb-1">
                {isAuthenticated ? `Hola, ${user?.name?.split(" ")[0] ?? ""}` : "Bienvenido a"}
              </p>
              <h1 className="text-3xl font-bold text-white leading-tight mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>
                {isAuthenticated ? "¿Con quién quieres hablar hoy?" : "Inteira"}
              </h1>
              {!isAuthenticated && (
                <p className="text-white/80 text-sm leading-relaxed mb-5">
                  Consultas con especialistas en psicología, finanzas, legal y más. Todo en línea.
                </p>
              )}
              <a href={getLoginUrl()}>
                <Button className="bg-white text-primary font-semibold px-6 shadow-lg active:scale-95 transition-transform">
                  {isAuthenticated ? "Ver especialistas" : "Comenzar gratis"}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </a>
            </div>
          </div>

          {/* Stats strip — overlapping the hero */}
          <div className="mx-4 -mt-8 relative z-10">
            <div className="bg-white rounded-2xl shadow-xl border border-border/50 grid grid-cols-4 divide-x divide-border">
              {stats.map((s, i) => (
                <div key={i} className="flex flex-col items-center py-4 px-1">
                  <span className="text-lg font-bold text-primary" style={{ fontFamily: "Poppins, sans-serif" }}>{s.value}</span>
                  <span className="text-[10px] text-muted-foreground text-center leading-tight mt-0.5">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-4 px-5 mt-5 mb-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span>Verificados</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Video className="w-3.5 h-3.5 text-primary" />
              <span>Videollamada integrada</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>Agenda flexible</span>
            </div>
          </div>
        </div>

        {/* ── Desktop Hero ── */}
        <div className="hidden md:block pb-20">
          <div className="container relative">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 text-sm font-medium">
                  Plataforma de consultas en línea
                </Badge>
                <h1 className="text-5xl lg:text-6xl font-bold leading-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
                  Conecta con{" "}
                  <span className="text-primary">especialistas</span>{" "}
                  desde cualquier lugar
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                  Accede a consultas profesionales en psicología, legal, finanzas, emprendimiento y más.
                  Todo desde la comodidad de tu hogar, con videollamadas en tiempo real.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a href={getLoginUrl()}>
                    <Button size="lg" className="gradient-brand text-white border-0 shadow-lg shadow-primary/30 px-8 text-base">
                      Comenzar ahora
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </a>
                  <Link href="/especialidades">
                    <Button size="lg" variant="outline" className="border-primary/30 text-primary hover:bg-primary/5 px-8 text-base">
                      Ver especialistas
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center gap-6 pt-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="w-4 h-4 text-primary" />
                    <span>Profesionales verificados</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Video className="w-4 h-4 text-primary" />
                    <span>Videollamada integrada</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Agenda flexible</span>
                  </div>
                </div>
              </div>
              <div className="relative hidden lg:block">
                <div className="grid grid-cols-2 gap-4">
                  {stats.map((stat, i) => (
                    <Card key={i} className="border-border shadow-sm">
                      <CardContent className="p-6">
                        <div className="text-3xl font-bold text-primary mb-1" style={{ fontFamily: "Poppins, sans-serif" }}>
                          {stat.value}
                        </div>
                        <div className="text-sm text-muted-foreground">{stat.label}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SPECIALTIES — Mobile: horizontal scroll
                        Desktop: grid
          ══════════════════════════════════════════ */}
      <section id="especialidades" className="py-8 md:py-20 bg-secondary/20 md:bg-secondary/30">
        <div className="container">
          {/* Section header */}
          <div className="mb-5 md:mb-12 text-center">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1 md:mb-4">
              Especialidades
            </p>
            <h2 className="text-xl md:text-4xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
              Encuentra al experto que necesitas
            </h2>
            <p className="hidden md:block text-muted-foreground text-lg max-w-2xl mx-auto mt-3">
              Contamos con profesionales certificados en múltiples áreas para atender todas tus necesidades.
            </p>
          </div>

          {/* Carousel */}
          <div className="relative">
            {/* Flecha izquierda */}
            <button
              onClick={() => scrollSpecialties("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full shadow p-2 hidden md:block"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Scroll container */}
            <div
              ref={specialtiesScrollRef}
              className="flex gap-4 overflow-x-auto px-10"
              style={{ scrollbarWidth: "none" }}
            >
              {CAROUSEL_ITEMS.map((item, i) => (
                <a
                  href="/especialidades"
                  key={item.name}
                  onClick={() => setActiveDot(i)}
                  style={{
                    backgroundImage: `url(${item.image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                  className="relative flex-shrink-0 w-[85vw] md:w-[calc(50%-8px)] lg:w-[calc(25%-12px)] h-[240px] md:h-[220px] rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </a>
              ))}
            </div>

            {/* Flecha derecha */}
            <button
              onClick={() => scrollSpecialties("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full shadow p-2 hidden md:block"
              aria-label="Siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation dots */}
          <div className="flex justify-center gap-2 mt-4">
            {CAROUSEL_ITEMS.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToIndex(i)}
                className={`rounded-full transition-all ${
                  i === activeDot ? "bg-primary w-5 h-2" : "bg-gray-300 w-2 h-2"
                }`}
                aria-label={`Ir a especialidad ${i + 1}`}
              />
            ))}
          </div>

          <div className="text-center mt-5 md:mt-8">
            <Link href="/especialidades">
              <Button variant="outline" className="w-full md:w-auto border-primary/30 text-primary hover:bg-primary/5">
                Ver todos los especialistas
                <ChevronRight className="ml-1 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          WHY INTEIRA — Image left + 4 steps right
          ══════════════════════════════════════════ */}
      <section className="py-8 md:py-20">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">

            {/* Left: image */}
            <div className="relative rounded-2xl overflow-hidden shadow-xl" style={{ height: "480px" }}>
              <img
                src="https://pub-cc4c932d49594db4a582c5a9a78363f7.r2.dev/imagenes%20carrusel/full-shot-young-woman-undergoing-therapy.jpg"
                alt="Asesoría profesional"
                className="w-full h-full object-cover object-top"
              />
              {/* Quote card floating */}
              <div className="absolute bottom-4 left-4 w-64 bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
                <p className="text-sm font-medium text-gray-800 leading-snug">
                  "Encontré al experto ideal en minutos. Fue una experiencia increíble."
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <Star className="w-3 h-3 text-primary fill-primary" />
                  </div>
                  <span className="text-xs text-gray-500">María G. — Cliente verificada</span>
                </div>
              </div>
            </div>

            {/* Right: 4 steps */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-primary uppercase tracking-widest">
                Por qué Inteira
              </p>
              <h2 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
                La forma más simple de conectar con expertos
              </h2>

              {[
                { icon: <Search className="w-5 h-5 text-primary" />, title: "Búsqueda Simple", description: "Encuentra al especialista que necesitas con filtros inteligentes por área y disponibilidad." },
                { icon: <CalendarCheck className="w-5 h-5 text-primary" />, title: "Elección fácil y rápida", description: "Revisa perfiles verificados, reseñas reales y agenda en segundos." },
                { icon: <CreditCard className="w-5 h-5 text-primary" />, title: "Pagos en Línea", description: "Paga de forma segura con tarjeta o saldo de tu cuenta. Sin sorpresas." },
                { icon: <Video className="w-5 h-5 text-primary" />, title: "Conéctate en Vivo", description: "Sesiones por videollamada integrada desde cualquier dispositivo, sin instalar nada." },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{step.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          HOW IT WORKS — Mobile: vertical steps
                          Desktop: horizontal
          ══════════════════════════════════════════ */}
      <section id="como-funciona" className="py-8 md:py-20">
        <div className="container">
          <div className="mb-6 md:mb-12 text-center">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1 md:mb-4">
              Proceso simple
            </p>
            <h2 className="text-xl md:text-4xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
              ¿Cómo funciona Inteira?
            </h2>
          </div>

          {/* Mobile: vertical timeline */}
          <div className="md:hidden space-y-4">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white shadow-md flex-shrink-0">
                    {step.icon}
                  </div>
                  {i < steps.length - 1 && (
                    <div className="w-0.5 h-8 bg-primary/20 mt-2" />
                  )}
                </div>
                <div className="pt-1.5">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">
                      Paso {i + 1}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: horizontal */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-primary/30 to-transparent z-0" />
                )}
                <div className="relative z-10 flex flex-col items-center text-center gap-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl gradient-brand flex items-center justify-center text-white shadow-lg shadow-primary/30">
                      {step.icon}
                    </div>
                    <span className="absolute -top-2 -right-2 w-7 h-7 bg-accent rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PLANS — 3-col desktop, stacked mobile
          ══════════════════════════════════════════ */}
      <section id="planes" className="py-8 md:py-20 bg-secondary/20 md:bg-secondary/30">
        <div className="container">
          <div className="mb-6 md:mb-12 text-center">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1 md:mb-4">
              Planes y precios
            </p>
            <h2 className="text-xl md:text-4xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
              Elige el plan perfecto para ti
            </h2>
            <p className="hidden md:block text-muted-foreground text-lg max-w-2xl mx-auto mt-3">
              Suscripciones mensuales o compra individual. Sin contratos, cancela cuando quieras.
            </p>
          </div>

          {/* Desktop: 3 columns | Mobile: Pro first, then Básico, then Individual */}
          <div className="flex flex-col-reverse md:grid md:grid-cols-3 md:gap-6 md:items-start gap-4">

            {/* Col 1 — Plan Básico (mobile: shows last via flex-col-reverse ordering) */}
            <div className="order-2 md:order-1">
              <Card className="border border-border bg-white hover:shadow-lg transition-shadow">
                <CardContent className="p-6 md:p-8">
                  <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: "Poppins, sans-serif" }}>Plan Básico</h3>
                  <div className="flex items-baseline gap-1 mt-2 mb-6">
                    <span className="text-4xl font-bold text-primary" style={{ fontFamily: "Poppins, sans-serif" }}>${PRICING.PLAN_BASIC_MXN}</span>
                    <span className="text-muted-foreground text-sm">/mes</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {[
                      "980 créditos mensuales",
                      "4 sesiones básicas",
                      "Vigencia 60 días",
                      "Todas las especialidades",
                    ].map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a href={getLoginUrl()}>
                    <Button variant="outline" className="w-full border-primary/40 text-primary hover:bg-primary/5">
                      Elegir Plan Básico
                    </Button>
                  </a>
                </CardContent>
              </Card>
            </div>

            {/* Col 2 — Plan Pro destacado (mobile: shows first via order) */}
            <div className="order-1 md:order-2 md:-mt-4 md:-mb-4">
              <Card className="relative border-0 shadow-2xl shadow-primary/25 overflow-hidden" style={{ background: "linear-gradient(135deg, #3d5e40 0%, #4f7a53 100%)" }}>
                <div className="absolute top-0 left-0 right-0 flex justify-center pt-4">
                  <Badge className="bg-white/20 text-white border-white/30 text-xs font-semibold px-3 py-1 backdrop-blur-sm">
                    ⭐ Más popular
                  </Badge>
                </div>
                <CardContent className="p-6 md:p-8 pt-14">
                  <h3 className="text-lg font-bold text-white" style={{ fontFamily: "Poppins, sans-serif" }}>Plan Pro</h3>
                  <div className="flex items-baseline gap-1 mt-2 mb-6">
                    <span className="text-5xl font-bold text-white" style={{ fontFamily: "Poppins, sans-serif" }}>{PRICING_DISPLAY.PLAN_PRO}</span>
                    <span className="text-white/70 text-sm">/mes</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {[
                      "2,500 créditos mensuales",
                      "2 sesiones premium",
                      "Vigencia 60 días",
                      "Acceso prioritario",
                      "Soporte 24/7",
                      "Precio especial en sesiones",
                    ].map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-white/90">
                        <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a href={getLoginUrl()}>
                    <Button className="w-full bg-white text-primary hover:bg-white/90 font-semibold shadow-lg">
                      Elegir Plan Pro
                    </Button>
                  </a>
                </CardContent>
              </Card>
            </div>

            {/* Col 3 — Sesiones individuales (mobile: shows between Pro and Básico) */}
            <div className="order-3 md:order-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                O paga por sesión
              </p>
              <div className="flex flex-col gap-3">
                <Card className="border border-border bg-white hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <h4 className="font-semibold text-gray-900">Sesión Básica</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">60 min · Videollamada integrada</p>
                    <div className="flex items-baseline gap-1 mt-3">
                      <span className="text-2xl font-bold text-primary" style={{ fontFamily: "Poppins, sans-serif" }}>${PRICING.SESSION_BASIC_MXN}</span>
                      <span className="text-xs text-muted-foreground">MXN</span>
                    </div>
                    <a href={getLoginUrl()}>
                      <Button variant="outline" size="sm" className="w-full mt-3 border-primary/30 text-primary hover:bg-primary/5 text-xs">
                        Comprar sesión
                      </Button>
                    </a>
                  </CardContent>
                </Card>
                <Card className="border border-border bg-white hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <h4 className="font-semibold text-gray-900">Sesión Premium</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">60 min · Experto top</p>
                    <div className="flex items-baseline gap-1 mt-3">
                      <span className="text-2xl font-bold text-primary" style={{ fontFamily: "Poppins, sans-serif" }}>{PRICING_DISPLAY.SESSION_PREMIUM}</span>
                      <span className="text-xs text-muted-foreground">MXN</span>
                    </div>
                    <a href={getLoginUrl()}>
                      <Button variant="outline" size="sm" className="w-full mt-3 border-primary/30 text-primary hover:bg-primary/5 text-xs">
                        Comprar sesión
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              </div>
            </div>

          </div>

          <div className="text-center mt-8 md:mt-10">
            <Link href="/planes">
              <Button variant="ghost" className="text-primary text-sm">
                Ver todos los planes y detalles
                <ChevronRight className="ml-1 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TESTIMONIALS — Mobile: horizontal scroll
          ══════════════════════════════════════════ */}
      <section className="py-8 md:py-20">
        <div className="container">
          <div className="mb-5 md:mb-12 text-center">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1 md:mb-4">
              Testimonios
            </p>
            <h2 className="text-xl md:text-4xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
              Lo que dicen nuestros usuarios
            </h2>
          </div>

          {/* Mobile: horizontal scroll */}
          <div className="md:hidden overflow-x-auto scrollbar-none pb-2">
            <div className="flex gap-3 px-5" style={{ width: "max-content" }}>
              {testimonials.map((t, i) => (
                <div key={i} className="w-72 bg-white rounded-2xl border border-border p-5 shadow-sm flex-shrink-0">
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="w-3.5 h-3.5 fill-accent text-accent" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    "{t.comment}"
                  </p>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground">{t.role} · {t.specialty}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop: grid */}
          <div className="hidden md:grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <Card key={i} className="border-border hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-accent text-accent" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    "{t.comment}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full gradient-brand flex items-center justify-center text-white font-semibold text-sm">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role} · {t.specialty}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA — Mobile: full-width app banner
          ══════════════════════════════════════════ */}
      <section className="py-8 md:py-20">
        <div className="container">
          <div className="gradient-hero rounded-2xl md:rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent rounded-full blur-3xl" />
            </div>
            <div className="relative z-10">
              <h2 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4 text-[#F5F0E8]" style={{ fontFamily: "Poppins, sans-serif" }}>
                ¿Listo para tu primera consulta?
              </h2>
              <p className="text-[#F5F0E8]/80 text-sm md:text-lg mb-6 md:mb-8 max-w-xl mx-auto">
                Únete a miles de personas que ya confían en Inteira para conectar con especialistas de calidad.
              </p>
              <a href={getLoginUrl()}>
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold px-8 md:px-10 shadow-lg active:scale-95 transition-transform">
                  Comenzar gratis hoy
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA PROFESIONALES
          ══════════════════════════════════════════ */}
      <section className="py-8 md:py-20 bg-secondary/20 md:bg-secondary/30">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
            {/* Texto izquierda */}
            <div className="text-center md:text-left max-w-xl">
              <span className="text-xs font-semibold tracking-widest text-primary uppercase mb-3 block">Para profesionales</span>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-3 md:mb-4" style={{ fontFamily: "Poppins, sans-serif" }}>
                ¿Eres especialista? <br className="hidden md:block" />
                <span className="text-primary">Únete a Inteira</span>
              </h2>
              <p className="text-muted-foreground text-sm md:text-base mb-6 md:mb-8">
                Comparte tu conocimiento, amplía tu cartera de clientes y gestiona tus citas desde un solo lugar.
                Más de <strong>500 profesionales</strong> ya confían en nuestra plataforma.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <Link href="/registro-profesional">
                  <Button size="lg" className="bg-primary text-white hover:bg-primary/90 font-semibold px-8 shadow-md active:scale-95 transition-transform w-full sm:w-auto">
                    Registrarme como profesional
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
            {/* Beneficios derecha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:max-w-sm">
              {[
                { icon: <Calendar className="w-5 h-5 text-primary" />, title: "Gestión de agenda", desc: "Controla tu disponibilidad y citas fácilmente" },
                { icon: <Users className="w-5 h-5 text-primary" />, title: "Más clientes", desc: "Accede a miles de usuarios que buscan tu especialidad" },
                { icon: <Shield className="w-5 h-5 text-primary" />, title: "Perfil verificado", desc: "Genera confianza con tu credencial profesional" },
                { icon: <Award className="w-5 h-5 text-primary" />, title: "Reseñas reales", desc: "Construye tu reputación con opiniones verificadas" },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-border/50 flex gap-3 items-start">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER — Mobile: compact, Desktop: full
          ══════════════════════════════════════════ */}
      <footer className="py-8 md:py-12" style={{ backgroundColor: "#607562" }}>
        <div className="container">
          {/* Desktop footer grid */}
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
                <li><a href="#como-funciona" className="hover:text-white transition-colors">Cómo funciona</a></li>
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

          {/* Mobile footer: compact logo + links */}
          <div className="md:hidden">
            <div className="flex items-center justify-between mb-5">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663083109800/hvpTFzVHTUDdmneoDhwUNk/logo-blanco_886f1d65.webp"
                alt="Inteira"
                className="h-7 w-auto object-contain"
              />
              <a href="https://inteira.app" className="text-xs text-white/70 hover:text-white transition-colors">
                inteira.app
              </a>
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
                  <li><a href="#como-funciona" className="hover:text-white">Cómo funciona</a></li>
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
