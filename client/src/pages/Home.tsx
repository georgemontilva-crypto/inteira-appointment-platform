import { useAuth } from "@/_core/hooks/useAuth";
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
  Brain,
  Scale,
  TrendingUp,
  DollarSign,
  Mic2,
  Sparkles,
  Compass,
} from "lucide-react";

const homeSpecialtyIcon: Record<string, React.ReactNode> = {
  Psicología: <Brain className="w-6 h-6 text-white" />,
  Legal: <Scale className="w-6 h-6 text-white" />,
  Emprendimiento: <TrendingUp className="w-6 h-6 text-white" />,
  Finanzas: <DollarSign className="w-6 h-6 text-white" />,
  Idiomas: <Mic2 className="w-6 h-6 text-white" />,
  "Imagen Personal": <Sparkles className="w-6 h-6 text-white" />,
  Vocación: <Compass className="w-6 h-6 text-white" />,
};

const homeSpecialtyBg: Record<string, string> = {
  Psicología: "bg-[#607562]",
  Legal: "bg-[#4a5c4c]",
  Emprendimiento: "bg-[#607562]",
  Finanzas: "bg-[#4f6651]",
  Idiomas: "bg-[#556e57]",
  "Imagen Personal": "bg-[#607562]",
  Vocación: "bg-[#4a5c4c]",
};

const steps = [
  {
    number: "01",
    icon: <Users className="w-6 h-6" />,
    title: "Regístrate gratis",
    description: "Crea tu cuenta en minutos. Elige el plan que mejor se adapte a tus necesidades.",
  },
  {
    number: "02",
    icon: <Award className="w-6 h-6" />,
    title: "Elige tu especialista",
    description: "Explora perfiles verificados, lee reseñas y selecciona al profesional ideal para ti.",
  },
  {
    number: "03",
    icon: <Calendar className="w-6 h-6" />,
    title: "Agenda tu cita",
    description: "Selecciona fecha y hora disponible. Recibirás confirmación inmediata por email.",
  },
  {
    number: "04",
    icon: <Video className="w-6 h-6" />,
    title: "Conéctate en línea",
    description: "Únete a tu consulta por Zoom o Google Meet desde cualquier dispositivo.",
  },
];

const stats = [
  { value: "500+", label: "Especialistas verificados" },
  { value: "10,000+", label: "Consultas realizadas" },
  { value: "4.9", label: "Calificación promedio" },
  { value: "7", label: "Especialidades disponibles" },
];

const testimonials = [
  {
    name: "María González",
    role: "Emprendedora",
    rating: 5,
    comment: "La plataforma me permitió encontrar un asesor legal de confianza en minutos. Excelente experiencia.",
    specialty: "Legal",
  },
  {
    name: "Carlos Ramírez",
    role: "Profesional independiente",
    rating: 5,
    comment: "Las sesiones de psicología en línea son igual de efectivas que en persona. Muy recomendado.",
    specialty: "Psicología",
  },
  {
    name: "Ana Martínez",
    role: "Directora de empresa",
    rating: 5,
    comment: "El asesor financiero me ayudó a estructurar mi negocio. El proceso de agendar fue muy sencillo.",
    specialty: "Finanzas",
  },
];

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const { data: specialties } = trpc.specialty.getAll.useQuery();
  const { data: plans } = trpc.subscriptionPlan.getAll.useQuery();

  return (
    <div className="min-h-screen bg-background">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-border shadow-sm">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663083109800/hvpTFzVHTUDdmneoDhwUNk/logo-verde_8475ff2a.webp"
                  alt="Inteira"
                  className="h-9 w-auto object-contain"
                />
              </div>
            </Link>

            {/* Nav links */}
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
              <Link href="/profesionales">
                <span className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                  Especialistas
                </span>
              </Link>
            </div>

            {/* Auth buttons */}
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button size="sm" className="gradient-brand text-white border-0">
                    Mi Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <a href={getLoginUrl()}>
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary">
                      Iniciar sesión
                    </Button>
                  </a>
                  <a href={getLoginUrl()}>
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

      {/* ── Hero Section ── */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 gradient-hero opacity-5 pointer-events-none" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

        <div className="container relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div className="space-y-8">
              <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 text-sm font-medium">
                Plataforma de consultas en línea
              </Badge>

              <h1 className="text-5xl lg:text-6xl font-bold leading-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
                Conecta con{" "}
                <span className="gradient-brand-text">especialistas</span>{" "}
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
                <Link href="/profesionales">
                  <Button size="lg" variant="outline" className="border-primary/30 text-primary hover:bg-primary/5 px-8 text-base">
                    Ver especialistas
                  </Button>
                </Link>
              </div>

              {/* Trust badges */}
              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>Profesionales verificados</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Video className="w-4 h-4 text-primary" />
                  <span>Zoom & Google Meet</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Agenda flexible</span>
                </div>
              </div>
            </div>

            {/* Right: Stats cards */}
            <div className="relative hidden lg:block">
              <div className="grid grid-cols-2 gap-4">
                {stats.map((stat, i) => (
                  <Card key={i} className={`border-border shadow-sm ${i === 0 ? "col-span-1 row-span-1" : ""}`}>
                    <CardContent className="p-6">
                      <div className="text-3xl font-bold text-primary mb-1" style={{ fontFamily: "Poppins, sans-serif" }}>
                        {stat.value}
                      </div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Floating appointment card */}
              <div className="absolute -bottom-4 -left-8 bg-white rounded-2xl shadow-xl border border-border p-4 max-w-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-brand flex items-center justify-center flex-shrink-0">
                    <Video className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Cita confirmada</p>
                    <p className="text-xs text-muted-foreground">Psicología · Hoy 4:00 PM</p>
                  </div>
                  <Badge className="bg-primary/15 text-primary border-0 text-xs ml-auto">
                    ✓ Activa
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Specialties Section ── */}
      <section id="especialidades" className="py-20 bg-secondary/30">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="bg-primary/10 text-primary border-primary/20 mb-4">
              Especialidades
            </Badge>
            <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: "Poppins, sans-serif" }}>
              Encuentra al experto que necesitas
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Contamos con profesionales certificados en múltiples áreas para atender todas tus necesidades.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {(specialties ?? [
              { id: 1, name: "Psicología" },
              { id: 2, name: "Emprendimiento" },
              { id: 3, name: "Finanzas" },
              { id: 4, name: "Idiomas" },
              { id: 5, name: "Imagen Personal" },
              { id: 6, name: "Legal" },
              { id: 7, name: "Vocación" },
            ] as Array<{id: number; name: string}>).map((specialty) => (
              <Link key={specialty.id} href={`/especialidades/${specialty.id}`}>
                <Card className="group cursor-pointer border-border hover:border-primary/30 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                  <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl ${homeSpecialtyBg[specialty.name] ?? "bg-[#607562]"} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200`}
                    >
                      {homeSpecialtyIcon[specialty.name] ?? <Compass className="w-6 h-6 text-white" />}
                    </div>
                    <span className="text-xs font-semibold text-foreground leading-tight">
                      {specialty.name}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/especialidades">
              <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/5">
                Ver todos los especialistas
                <ChevronRight className="ml-1 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="como-funciona" className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="bg-accent/10 text-accent border-accent/20 mb-4">
              Proceso simple
            </Badge>
            <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: "Poppins, sans-serif" }}>
              ¿Cómo funciona Inteira?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              En 4 pasos sencillos puedes tener tu primera consulta con un especialista.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
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

      {/* ── Plans Section ── */}
      <section id="planes" className="py-20 bg-secondary/30">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="bg-primary/10 text-primary border-primary/20 mb-4">
              Planes y precios
            </Badge>
            <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: "Poppins, sans-serif" }}>
              Elige el plan perfecto para ti
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Suscripciones mensuales o compra individual. Sin contratos, cancela cuando quieras.
            </p>
          </div>

          {/* Suscripciones */}
          <div className="mb-6">
            <h3 className="text-center text-lg font-semibold text-muted-foreground mb-6 uppercase tracking-wider text-sm">Suscripciones Mensuales</h3>
            <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {/* Plan Básico */}
              <Card className="relative border-2 border-border hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <CardContent className="p-8">
                  <div className="mb-2">
                    <h3 className="text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>Plan Básico</h3>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-4xl font-bold text-primary" style={{ fontFamily: "Poppins, sans-serif" }}>$980</span>
                      <span className="text-muted-foreground text-sm">MXN/mes</span>
                    </div>
                    <p className="text-xs text-primary font-medium mt-1">Ahorra 30% vs compra individual</p>
                  </div>
                  <ul className="space-y-3 my-6">
                    {["980 créditos mensuales", "Equivalente a 4 asesorías básicas", "Vigencia de 60 días", "Acceso a todas las especialidades", "Soporte por email"].map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <a href={getLoginUrl()}>
                    <Button variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/5">
                      Comenzar con Plan Básico
                    </Button>
                  </a>
                </CardContent>
              </Card>

              {/* Plan Pro */}
              <Card className="relative border-2 border-primary shadow-lg shadow-primary/20 scale-105 transition-all duration-300 hover:shadow-xl">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="gradient-brand text-white border-0 px-4 py-1 shadow-md">Mas popular</Badge>
                </div>
                <CardContent className="p-8">
                  <div className="mb-2">
                    <h3 className="text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>Plan Pro</h3>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-4xl font-bold text-primary" style={{ fontFamily: "Poppins, sans-serif" }}>$2,500</span>
                      <span className="text-muted-foreground text-sm">MXN/mes</span>
                    </div>
                    <p className="text-xs text-primary font-medium mt-1">Ahorra 52% vs compra individual</p>
                  </div>
                  <ul className="space-y-3 my-6">
                    {["2,500 créditos mensuales", "Equivalente a 2 asesorías premium", "Vigencia de 60 días", "Acceso prioritario a expertos", "Soporte 24/7 prioritario", "Acceso a comunidad exclusiva"].map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <a href={getLoginUrl()}>
                    <Button className="w-full gradient-brand text-white border-0 shadow-md shadow-primary/30">
                      Comenzar con Plan Pro
                    </Button>
                  </a>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Compra Individual */}
          <div className="mt-12">
            <h3 className="text-center text-lg font-semibold text-muted-foreground mb-6 uppercase tracking-wider text-sm">Compra Individual</h3>
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <Card className="border border-border hover:border-primary/30 transition-all hover:shadow-md">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Sesión Básica</h4>
                    <p className="text-sm text-muted-foreground mt-1">1 sesión · 60 min · Zoom o Meet</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary" style={{ fontFamily: "Poppins, sans-serif" }}>$350</div>
                    <div className="text-xs text-muted-foreground">MXN</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-border hover:border-primary/30 transition-all hover:shadow-md">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Sesión Premium</h4>
                    <p className="text-sm text-muted-foreground mt-1">1 sesión · 90 min · Experto de alto nivel</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary" style={{ fontFamily: "Poppins, sans-serif" }}>$1,250</div>
                    <div className="text-xs text-muted-foreground">MXN</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="bg-primary/10 text-primary border-primary/20 mb-4">
              Testimonios
            </Badge>
            <h2 className="text-4xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
              Lo que dicen nuestros usuarios
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
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

      {/* ── CTA Section ── */}
      <section className="py-20">
        <div className="container">
          <div className="gradient-hero rounded-3xl p-12 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent rounded-full blur-3xl" />
            </div>
            <div className="relative z-10">
              <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: "Poppins, sans-serif" }}>
                ¿Listo para tu primera consulta?
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
                Únete a miles de personas que ya confían en Inteira para conectar con especialistas de calidad.
              </p>
              <a href={getLoginUrl()}>
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold px-10 shadow-lg">
                  Comenzar gratis hoy
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12" style={{backgroundColor: '#607562'}}>
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
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
                <li><a href="#" className="hover:text-white transition-colors">Términos de uso</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacidad</a></li>
                <li><a href="mailto:soporte@inteira.mx" className="hover:text-white transition-colors">Contacto</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/20 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-white/70">
              © 2025 Inteira. Todos los derechos reservados.
            </p>
            <p className="text-sm text-white/70">
              <a href="https://inteira.mx" className="hover:text-white transition-colors">inteira.mx</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
