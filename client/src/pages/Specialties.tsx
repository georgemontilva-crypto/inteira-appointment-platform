import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Brain, Scale, TrendingUp, DollarSign, Stethoscope, Apple,
  Star, Users, ChevronRight, ArrowLeft,
} from "lucide-react";

const specialtyIcons: Record<string, React.ReactNode> = {
  Psicología: <Brain className="w-8 h-8" />,
  Legal: <Scale className="w-8 h-8" />,
  Emprendimiento: <TrendingUp className="w-8 h-8" />,
  Finanzas: <DollarSign className="w-8 h-8" />,
  "Medicina General": <Stethoscope className="w-8 h-8" />,
  Nutrición: <Apple className="w-8 h-8" />,
};

const specialtyColors: Record<string, string> = {
  Psicología: "from-violet-500 to-purple-600",
  Legal: "from-blue-500 to-indigo-600",
  Emprendimiento: "from-orange-400 to-orange-600",
  Finanzas: "from-emerald-500 to-teal-600",
  "Medicina General": "from-sky-500 to-blue-600",
  Nutrición: "from-green-500 to-emerald-600",
};

const specialtyDescriptions: Record<string, string> = {
  Psicología: "Atención psicológica para bienestar emocional, ansiedad, depresión y más.",
  Legal: "Asesoría legal en derecho civil, laboral, familiar y corporativo.",
  Emprendimiento: "Mentoría para emprendedores: modelos de negocio, estrategia y crecimiento.",
  Finanzas: "Planificación financiera personal, inversiones y gestión de patrimonio.",
  "Medicina General": "Consultas médicas generales, diagnóstico y orientación en salud.",
  Nutrición: "Planes nutricionales personalizados y educación alimentaria.",
};

export default function Specialties() {
  const { data: specialties, isLoading } = trpc.specialty.getAll.useQuery();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-hero text-white py-12">
        <div className="container">
          <Link href="/">
            <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 mb-4 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Inicio
            </Button>
          </Link>
          <h1 className="text-4xl font-bold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>
            Especialidades
          </h1>
          <p className="text-white/80 text-lg max-w-2xl">
            Explora nuestras áreas de especialización y encuentra al profesional ideal para tus necesidades.
          </p>
        </div>
      </div>

      <div className="container py-12">
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse border-border">
                <CardContent className="p-6 h-40" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(specialties ?? []).map((specialty) => (
              <Link key={specialty.id} href={`/especialidades/${specialty.id}`}>
                <Card className="group cursor-pointer border-border hover:border-primary/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${specialtyColors[specialty.name] ?? "from-primary to-primary/70"} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                        {specialtyIcons[specialty.name] ?? <Stethoscope className="w-8 h-8" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold mb-1">{specialty.name}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {specialty.description ?? specialtyDescriptions[specialty.name] ?? "Consultas especializadas con profesionales certificados."}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>Especialistas disponibles</span>
                      </div>
                      <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/5 p-0 h-auto">
                        Ver profesionales
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
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
