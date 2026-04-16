import { useLocation } from "wouter";
import { User, Briefcase, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function RegistroTipo() {
  const [, navigate] = useLocation();

  const cards = [
    {
      icon: <User className="w-8 h-8 text-primary" />,
      title: "Soy usuario",
      description: "Busca y agenda sesiones con especialistas verificados",
      href: "/registro/usuario",
      disabled: false,
    },
    {
      icon: <Briefcase className="w-8 h-8 text-primary" />,
      title: "Soy especialista",
      description: "Ofrece tus servicios y conecta con clientes",
      href: "/registro-profesional",
      disabled: false,
    },
    {
      icon: <Building2 className="w-8 h-8 text-muted-foreground" />,
      title: "Soy una clínica",
      description: "Gestiona tu equipo de especialistas en una sola plataforma",
      href: null,
      disabled: true,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      {/* Logo */}
      <a href="/">
        <img src="https://pub-cc4c932d49594db4a582c5a9a78363f7.r2.dev/imagenes%20carrusel/Inteira-Verde-1.webp" alt="Inteira" className="h-10 mb-8" />
      </a>

      <h1 className="text-2xl md:text-3xl font-bold mb-2 text-center" style={{ fontFamily: "Poppins, sans-serif" }}>
        ¿Cómo quieres usar Inteira?
      </h1>
      <p className="text-muted-foreground mb-8 text-center text-sm md:text-base max-w-md">
        Elige el tipo de cuenta que mejor se adapta a ti
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
        {cards.map((card) =>
          card.disabled ? (
            <div
              key={card.title}
              className="relative flex flex-col items-center gap-4 p-6 rounded-2xl border border-border bg-card opacity-60 cursor-not-allowed select-none"
            >
              <Badge className="absolute top-3 right-3 bg-muted text-muted-foreground border-0 text-xs">
                Próximamente
              </Badge>
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                {card.icon}
              </div>
              <div className="text-center">
                <h2 className="font-semibold text-base text-foreground">{card.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
              </div>
            </div>
          ) : (
            <button
              key={card.title}
              onClick={() => navigate(card.href!)}
              className="flex flex-col items-center gap-4 p-6 rounded-2xl border border-border bg-card text-left hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all duration-200 active:scale-[0.98] group"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                {card.icon}
              </div>
              <div className="text-center">
                <h2 className="font-semibold text-base text-foreground">{card.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
              </div>
            </button>
          )
        )}
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <a href="/login" className="text-primary hover:underline font-medium">
          Iniciar sesión
        </a>
      </p>
    </div>
  );
}
