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
} from "lucide-react";

const specialtyImages: Record<string, string> = {
  Psicología: "https://inteira.mx/wp-content/uploads/2025/03/asesorias_Psicologia.png",
  Emprendimiento: "https://inteira.mx/wp-content/uploads/2025/03/asesorias_Emprendimiento.png",
  Finanzas: "https://inteira.mx/wp-content/uploads/2025/03/asesorias_Finanzas.png",
  Idiomas: "https://inteira.mx/wp-content/uploads/2025/03/asesorias_Idiomas.png",
  "Imagen Personal": "https://inteira.mx/wp-content/uploads/2025/03/asesorias_Imagen-Personal.png",
  Legal: "https://inteira.mx/wp-content/uploads/2025/03/asesorias_Legal.png",
  Vocación: "https://inteira.mx/wp-content/uploads/2025/03/asesorias_Vocacion.png",
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
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
                  <span className="text-white font-bold text-sm">i</span>
                </div>
                <span className="text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
                  <span className="text-primary">inteira</span>
                </span>
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

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {(specialties ?? [
              { id: 1, name: "Psicología", imageUrl: specialtyImages["Psicología"] },
              { id: 2, name: "Emprendimiento", imageUrl: specialtyImages["Emprendimiento"] },
              { id: 3, name: "Finanzas", imageUrl: specialtyImages["Finanzas"] },
              { id: 4, name: "Idiomas", imageUrl: specialtyImages["Idiomas"] },
              { id: 5, name: "Imagen Personal", imageUrl: specialtyImages["Imagen Personal"] },
              { id: 6, name: "Legal", imageUrl: specialtyImages["Legal"] },
              { id: 7, name: "Vocación", imageUrl: specialtyImages["Vocación"] },
            ] as Array<{id: number; name: string; imageUrl?: string | null}>).map((specialty) => (
              <Link key={specialty.id} href={`/especialidades/${specialty.id}`}>
                <Card className="group cursor-pointer border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                  <CardContent className="p-0 flex flex-col items-center text-center">
                    <div className="w-full h-28 overflow-hidden relative">
                      {(specialty.imageUrl ?? specialtyImages[specialty.name]) ? (
                        <img
                          src={specialty.imageUrl ?? specialtyImages[specialty.name]}
                          alt={specialty.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-bold text-xl">{specialty.name.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                    <div className="py-3 px-2">
                      <span className="text-sm font-semibold text-foreground leading-tight">
                        {specialty.name}
                      </span>
                    </div>
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
              Planes flexibles que se adaptan a tus necesidades. Sin contratos, cancela cuando quieras.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {(plans ?? [
              { id: 1, name: "Básico", price: "99.00", billingPeriod: "monthly", maxAppointmentsPerMonth: 2, features: ["2 citas al mes", "30 min por cita", "Zoom o Google Meet", "Soporte básico"] },
              { id: 2, name: "Premium", price: "199.00", billingPeriod: "monthly", maxAppointmentsPerMonth: 5, features: ["5 citas al mes", "60 min por cita", "Zoom o Google Meet", "Soporte prioritario", "Acceso a todas las especialidades"] },
              { id: 3, name: "Pro", price: "399.00", billingPeriod: "monthly", maxAppointmentsPerMonth: null, features: ["Citas ilimitadas", "90 min por cita", "Zoom o Google Meet", "Soporte 24/7", "Acceso a todas las especialidades", "Historial completo"] },
            ]).map((plan, i) => (
              <Card
                key={plan.id}
                className={`relative border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  i === 1
                    ? "border-primary shadow-lg shadow-primary/20 scale-105"
                    : "border-border hover:border-primary/30"
                }`}
              >
                {i === 1 && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="gradient-brand text-white border-0 px-4 py-1 shadow-md">
                      Más popular
                    </Badge>
                  </div>
                )}
                <CardContent className="p-8">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-primary" style={{ fontFamily: "Poppins, sans-serif" }}>
                        ${plan.price}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        MXN/{plan.billingPeriod === "monthly" ? "mes" : "año"}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {(Array.isArray(plan.features) ? plan.features : []).map((feature: string, j: number) => (
                      <li key={j} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <a href={getLoginUrl()}>
                    <Button
                      className={`w-full ${i === 1 ? "gradient-brand text-white border-0 shadow-md shadow-primary/30" : "border-primary/30 text-primary hover:bg-primary/5"}`}
                      variant={i === 1 ? "default" : "outline"}
                    >
                      Comenzar con {plan.name}
                    </Button>
                  </a>
                </CardContent>
              </Card>
            ))}
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
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">i</span>
                </div>
                <span className="text-lg font-bold text-white" style={{ fontFamily: "Poppins, sans-serif" }}>
                  inteira
                </span>
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
