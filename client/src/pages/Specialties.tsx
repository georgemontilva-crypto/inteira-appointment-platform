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

// Iconos minimalistas en verde de la marca para cada especialidad
const specialtyIcon: Record<string, React.ReactNode> = {
  Psicología: <Brain className="w-7 h-7 text-white" />,
  Legal: <Scale className="w-7 h-7 text-white" />,
  Emprendimiento: <TrendingUp className="w-7 h-7 text-white" />,
  Finanzas: <DollarSign className="w-7 h-7 text-white" />,
  Idiomas: <Mic2 className="w-7 h-7 text-white" />,
  "Imagen Personal": <Sparkles className="w-7 h-7 text-white" />,
  Vocación: <Compass className="w-7 h-7 text-white" />,
};

// Tonos del verde de la marca para variedad sutil entre tarjetas
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
  Psicología: "Consultas con psicólogos certificados para bienestar mental y emocional.",
  Legal: "Asesoría legal con abogados certificados en diversas áreas del derecho.",
  Emprendimiento: "Asesoría especializada para emprendedores y startups en crecimiento.",
  Finanzas: "Consultoría financiera personal y empresarial con expertos certificados.",
  Idiomas: "Clases y asesorías de idiomas con profesores nativos y certificados.",
  "Imagen Personal": "Consultoría de imagen, estilo y presencia personal con expertos.",
  Vocación: "Orientación vocacional y desarrollo profesional con especialistas.",
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-[#607562] text-white py-12">
        <div className="container">
          <Link href="/">
            <Button
              variant="ghost"
              className="text-white/80 hover:text-white hover:bg-white/10 mb-4 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Inicio
            </Button>
          </Link>
          <h1
            className="text-4xl font-bold mb-3"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            Especialidades
          </h1>
          <p className="text-white/80 text-lg max-w-2xl">
            Explora nuestras áreas de especialización y encuentra al profesional
            ideal para tus necesidades.
          </p>
        </div>
      </div>

      <div className="container py-12">
        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse border-border">
                <CardContent className="p-6 h-28" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {items.map((specialty) => (
              <Link key={specialty.id} href={`/especialidades/${specialty.id}`}>
                <Card className="group cursor-pointer border-border hover:border-primary/40 hover:shadow-md transition-all duration-200">
                  <CardContent className="p-5">
                    {/* Top row: icon + name + description */}
                    <div className="flex items-start gap-4">
                      {/* Icon badge */}
                      <div
                        className={`w-14 h-14 rounded-2xl ${specialtyBg[specialty.name] ?? "bg-[#607562]"} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-200`}
                      >
                        {specialtyIcon[specialty.name] ?? (
                          <Compass className="w-7 h-7 text-white" />
                        )}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <h3
                          className="text-base font-bold text-foreground mb-1"
                          style={{ fontFamily: "Poppins, sans-serif" }}
                        >
                          {specialty.name}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                          {specialty.description ??
                            specialtyDescriptions[specialty.name] ??
                            "Consultas especializadas con profesionales certificados."}
                        </p>
                      </div>
                    </div>

                    {/* Bottom row: specialists count + CTA */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
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
