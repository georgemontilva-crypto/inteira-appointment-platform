import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "../components/DashboardLayout";
import {
  Brain, Apple, Target, Leaf, Heart, Users, Compass, Stethoscope,
  Scale, TrendingUp, DollarSign, Mic2, Sparkles, Sun, GraduationCap,
  Briefcase, Globe, Activity, HandHeart, Smile, BookOpen, HeartHandshake,
} from "lucide-react";
import type React from "react";

// Matches SPECIALTY_ICON_MAP in AdminDashboard — key = DB icon string
const ICON_MAP: Record<string, React.ReactNode> = {
  Brain:         <Brain className="w-6 h-6 text-white" />,
  Apple:         <Apple className="w-6 h-6 text-white" />,
  Target:        <Target className="w-6 h-6 text-white" />,
  Leaf:          <Leaf className="w-6 h-6 text-white" />,
  Heart:         <Heart className="w-6 h-6 text-white" />,
  Users:         <Users className="w-6 h-6 text-white" />,
  Compass:       <Compass className="w-6 h-6 text-white" />,
  Stethoscope:   <Stethoscope className="w-6 h-6 text-white" />,
  Scale:         <Scale className="w-6 h-6 text-white" />,
  TrendingUp:    <TrendingUp className="w-6 h-6 text-white" />,
  DollarSign:    <DollarSign className="w-6 h-6 text-white" />,
  Mic2:          <Mic2 className="w-6 h-6 text-white" />,
  Sparkles:      <Sparkles className="w-6 h-6 text-white" />,
  Sun:           <Sun className="w-6 h-6 text-white" />,
  GraduationCap: <GraduationCap className="w-6 h-6 text-white" />,
  Briefcase:     <Briefcase className="w-6 h-6 text-white" />,
  Globe:         <Globe className="w-6 h-6 text-white" />,
  Activity:      <Activity className="w-6 h-6 text-white" />,
  HandHeart:     <HandHeart className="w-6 h-6 text-white" />,
  Smile:         <Smile className="w-6 h-6 text-white" />,
  BookOpen:      <BookOpen className="w-6 h-6 text-white" />,
  HeartHandshake:<HeartHandshake className="w-6 h-6 text-white" />,
};

// Legacy name-based fallback for specialties that predate icon assignment
const NAME_ICON_MAP: Record<string, React.ReactNode> = {
  "Psicología":             <Brain className="w-6 h-6 text-white" />,
  "Salud mental":           <Brain className="w-6 h-6 text-white" />,
  "Legal":                  <Scale className="w-6 h-6 text-white" />,
  "Emprendimiento":         <TrendingUp className="w-6 h-6 text-white" />,
  "Negocios":               <Briefcase className="w-6 h-6 text-white" />,
  "Finanzas":               <DollarSign className="w-6 h-6 text-white" />,
  "Idiomas":                <Mic2 className="w-6 h-6 text-white" />,
  "Idiomas y cultura":      <Globe className="w-6 h-6 text-white" />,
  "Imagen Personal":        <Sparkles className="w-6 h-6 text-white" />,
  "Vocación":               <Compass className="w-6 h-6 text-white" />,
  "Orientación vocacional": <GraduationCap className="w-6 h-6 text-white" />,
  "Coaching de vida":       <Sun className="w-6 h-6 text-white" />,
  "Mindfulness y meditación":<Leaf className="w-6 h-6 text-white" />,
  "Nutrición":              <Apple className="w-6 h-6 text-white" />,
  "Terapia de pareja":      <HeartHandshake className="w-6 h-6 text-white" />,
  "Familia":                <Heart className="w-6 h-6 text-white" />,
  "Trabajo social":         <HandHeart className="w-6 h-6 text-white" />,
  "Recursos Humanos":       <Users className="w-6 h-6 text-white" />,
  "Desarrollo personal":    <Smile className="w-6 h-6 text-white" />,
  "Educación":              <BookOpen className="w-6 h-6 text-white" />,
  "Bienestar":              <Activity className="w-6 h-6 text-white" />,
};

function resolveIcon(iconKey: string | null | undefined, name: string): React.ReactNode {
  if (iconKey && ICON_MAP[iconKey]) return ICON_MAP[iconKey];
  if (NAME_ICON_MAP[name]) return NAME_ICON_MAP[name];
  return <Stethoscope className="w-6 h-6 text-white" />;
}

const STATIC_SPECIALTIES = [
  { id: 1, name: "Psicología",       description: "Bienestar mental y emocional con psicólogos certificados.", icon: null },
  { id: 2, name: "Emprendimiento",   description: "Asesoría para emprendedores y startups en crecimiento.",    icon: null },
  { id: 3, name: "Finanzas",         description: "Consultoría financiera personal y empresarial.",             icon: null },
  { id: 4, name: "Idiomas",          description: "Clases con profesores nativos y certificados.",              icon: null },
  { id: 5, name: "Imagen Personal",  description: "Consultoría de imagen, estilo y presencia personal.",        icon: null },
  { id: 6, name: "Legal",            description: "Asesoría legal en diversas áreas del derecho.",              icon: null },
  { id: 7, name: "Vocación",         description: "Orientación vocacional y desarrollo profesional.",           icon: null },
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
          {(specialties ?? STATIC_SPECIALTIES).map((s: any) => (
            <button
              key={s.id}
              onClick={() => navigate(`/especialidades/${s.id}`)}
              className="flex flex-col items-start gap-3 bg-white rounded-2xl p-4 border border-border/60 shadow-sm hover:shadow-md hover:border-primary/30 active:scale-[0.98] transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-[#607562] flex items-center justify-center flex-shrink-0 shadow-sm">
                {resolveIcon(s.icon, s.name)}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{s.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                  {s.description ?? "Consultas con profesionales certificados."}
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
