import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Brain,
  Scale,
  TrendingUp,
  DollarSign,
  Mic2,
  Sparkles,
  Compass,
  Users,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

const specialtyIcon: Record<string, React.ReactNode> = {
  Psicología: <Brain className="w-6 h-6 text-white" />,
  Legal: <Scale className="w-6 h-6 text-white" />,
  Emprendimiento: <TrendingUp className="w-6 h-6 text-white" />,
  Finanzas: <DollarSign className="w-6 h-6 text-white" />,
  Idiomas: <Mic2 className="w-6 h-6 text-white" />,
  "Imagen Personal": <Sparkles className="w-6 h-6 text-white" />,
  Vocación: <Compass className="w-6 h-6 text-white" />,
};

const specialtyBg: Record<string, string> = {
  Psicología: "bg-[#607562]",
  Legal: "bg-[#4a5c4c]",
  Emprendimiento: "bg-[#607562]",
  Finanzas: "bg-[#4f6651]",
  Idiomas: "bg-[#556e57]",
  "Imagen Personal": "bg-[#607562]",
  Vocación: "bg-[#4a5c4c]",
};

const specialtyDescriptions: Record<string, string> = {
  Psicología: "Bienestar mental y emocional con psicólogos certificados.",
  Legal: "Asesoría legal en diversas áreas del derecho.",
  Emprendimiento: "Asesoría para emprendedores y startups en crecimiento.",
  Finanzas: "Consultoría financiera personal y empresarial.",
  Idiomas: "Clases con profesores nativos y certificados.",
  "Imagen Personal": "Consultoría de imagen, estilo y presencia personal.",
  Vocación: "Orientación vocacional y desarrollo profesional.",
};

export default function Specialties() {
  const { data: specialties, isLoading } = trpc.specialty.getAll.useQuery();

  const fallback = [
    { id: 1, name: "Psicología", description: null, imageUrl: null },
    { id: 2, name: "Emprendimiento", description: null, imageUrl: null },
    { id: 3, name: "Finanzas", description: null, imageUrl: null },
    { id: 4, name: "Idiomas", description: null, imageUrl: null },
    { id: 5, name: "Imagen Personal", description: null, imageUrl: null },
    { id: 6, name: "Legal", description: null, imageUrl: null },
    { id: 7, name: "Vocación", description: null, imageUrl: null },
  ];

  const items = specialties ?? fallback;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      {/* ── Header ── */}
      <div className="bg-[#607562] text-white">
        <div className="container py-7 md:py-12">
          <Link href="/">
            <Button
              variant="ghost"
              className="text-white/80 hover:text-white hover:bg-white/10 mb-3 md:mb-4 -ml-2 active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="text-sm">Inicio</span>
            </Button>
          </Link>
          <h1 className="text-2xl md:text-4xl font-bold mb-1.5 md:mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>
            Especialidades
          </h1>
          <p className="text-white/80 text-sm md:text-lg md:max-w-2xl">
            Encuentra al profesional ideal para tus necesidades.
          </p>
        </div>
      </div>

      <div className="container py-5 md:py-12">
        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-3 md:gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse border-border">
                <CardContent className="p-5 h-24 md:h-28" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3 md:gap-4">
            {items.map((specialty) => (
              <Link key={specialty.id} href={`/especialidades/${specialty.id}`}>
                <Card className="group cursor-pointer border-border active:scale-[0.99] md:hover:border-primary/40 md:hover:shadow-md transition-all duration-200">
                  <CardContent className="p-4 md:p-5">
                    <div className="flex items-center gap-3.5 md:gap-4">
                      {/* Icon */}
                      <div
                        className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl ${specialtyBg[specialty.name] ?? "bg-[#607562]"} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-200`}
                      >
                        {specialtyIcon[specialty.name] ?? <Compass className="w-6 h-6 text-white" />}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm md:text-base font-bold text-foreground mb-0.5" style={{ fontFamily: "Poppins, sans-serif" }}>
                          {specialty.name}
                        </h3>
                        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed line-clamp-2">
                          {specialty.description ?? specialtyDescriptions[specialty.name] ?? "Consultas especializadas con profesionales certificados."}
                        </p>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 md:hidden" />
                    </div>

                    {/* Desktop bottom row */}
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
        )}
      </div>
    </div>
  );
}
