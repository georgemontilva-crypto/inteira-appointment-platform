import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "../components/DashboardLayout";
import {
  Brain, Scale, TrendingUp, DollarSign, Mic2, Sparkles, Compass,
  Sun, Leaf, Apple, GraduationCap, HeartHandshake, HandHeart,
  Smile, BookOpen, Briefcase, Globe, Activity, Heart, Users,
} from "lucide-react";
import type React from "react";

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

const STATIC_SPECIALTIES = [
  { id: 1, name: "Psicología", description: "Bienestar mental y emocional con psicólogos certificados." },
  { id: 2, name: "Emprendimiento", description: "Asesoría para emprendedores y startups en crecimiento." },
  { id: 3, name: "Finanzas", description: "Consultoría financiera personal y empresarial." },
  { id: 4, name: "Idiomas", description: "Clases con profesores nativos y certificados." },
  { id: 5, name: "Imagen Personal", description: "Consultoría de imagen, estilo y presencia personal." },
  { id: 6, name: "Legal", description: "Asesoría legal en diversas áreas del derecho." },
  { id: 7, name: "Vocación", description: "Orientación vocacional y desarrollo profesional." },
];

export default function SpecialtiesPage() {
  const [, navigate] = useLocation();

  const { data: specialties } = trpc.specialty.getAll.useQuery(undefined, {
    initialData: STATIC_SPECIALTIES,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
            Especialidades
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Elige el área en la que necesitas orientación
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {(specialties ?? STATIC_SPECIALTIES).map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/especialidades/${s.id}`)}
              className="flex flex-col items-start gap-3 bg-white rounded-2xl p-4 border border-border/60 shadow-sm hover:shadow-md hover:border-primary/30 active:scale-[0.98] transition-all text-left"
            >
              <div className={`w-12 h-12 rounded-xl ${specialtyBg[s.name] ?? "bg-[#607562]"} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                {specialtyIcon[s.name] ?? <Compass className="w-6 h-6 text-white" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{s.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                  {(s as any).description ?? "Consultas con profesionales certificados."}
                </p>
              </div>
              <span className="text-xs text-primary font-medium mt-auto">Ver profesionales →</span>
            </button>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
