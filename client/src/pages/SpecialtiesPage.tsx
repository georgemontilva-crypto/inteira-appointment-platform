import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "../components/DashboardLayout";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Brain, Apple, Leaf, Heart, Users, Compass, Stethoscope,
  Scale, TrendingUp, DollarSign, Mic2, Sparkles, Sun, GraduationCap,
  Briefcase, Globe, Activity, HandHeart, Smile, BookOpen, HeartHandshake,
  Pill, HeartPulse, Baby, PersonStanding, Dumbbell, Salad,
  Moon, Music, Palette, Microscope, FlaskConical, Bone,
  Eye, Ear, Hand, Frown, Laugh, MessageCircle, ShieldCheck,
  Sprout, TreePine, Waves, Wind, Flame, Snowflake, Coffee,
  Trophy, Lightbulb, Puzzle, BrainCircuit, Syringe, Zap,
  Sunset, HeartCrack, Bandage, Droplets, ShieldPlus,
  Footprints, Bike, Wheat, Carrot, Grape, Citrus,
  Feather, Flower, Flower2, TestTube, Award, Star, Search,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type React from "react";

type CategoryKey = "salud_mental" | "salud_fisica" | "negocios" | "educacion" | "legal" | "creatividad" | "otros";

const CATEGORIES: { key: CategoryKey; label: string; Icon: React.ElementType }[] = [
  { key: "salud_mental",  label: "Salud Mental",    Icon: Brain },
  { key: "salud_fisica",  label: "Salud Física",    Icon: HeartPulse },
  { key: "negocios",      label: "Negocios",        Icon: TrendingUp },
  { key: "educacion",     label: "Educación",       Icon: GraduationCap },
  { key: "legal",         label: "Legal",           Icon: Scale },
  { key: "creatividad",   label: "Creatividad",     Icon: Palette },
  { key: "otros",         label: "Otros",           Icon: Sparkles },
];

const ICON_COMPONENTS: Record<string, React.ElementType> = {
  Brain, BrainCircuit, HeartPulse, Heart, HeartHandshake, HeartCrack,
  Smile, Frown, Laugh, MessageCircle, Stethoscope, Pill, Syringe,
  Microscope, FlaskConical, TestTube, Bone, Eye, Ear, Hand, Bandage,
  ShieldPlus, ShieldCheck, Dumbbell, PersonStanding, Bike, Footprints,
  Activity, Zap, Apple, Salad, Wheat, Carrot, Grape, Citrus, Coffee,
  Droplets, Leaf, Flower, Flower2, Sprout, TreePine, Feather, Waves,
  Wind, Flame, Snowflake, Sun, Moon, Sunset, Baby, GraduationCap,
  BookOpen, Lightbulb, Puzzle, Target, Trophy, Award, Star, Briefcase,
  TrendingUp, DollarSign, Scale, Globe, Compass, Users, HandHeart,
  Music, Palette, Mic2, Sparkles,
};

const NAME_ICON_COMPONENTS: Record<string, React.ElementType> = {
  "Psicología":               Brain,
  "Salud mental":             Brain,
  "Legal":                    Scale,
  "Emprendimiento":           TrendingUp,
  "Negocios":                 Briefcase,
  "Finanzas":                 DollarSign,
  "Idiomas":                  Mic2,
  "Idiomas y cultura":        Globe,
  "Imagen Personal":          Sparkles,
  "Vocación":                 Compass,
  "Orientación vocacional":   GraduationCap,
  "Coaching de vida":         Sun,
  "Mindfulness y meditación": Leaf,
  "Nutrición":                Apple,
  "Terapia de pareja":        HeartHandshake,
  "Familia":                  Heart,
  "Trabajo social":           HandHeart,
  "Recursos Humanos":         Users,
  "Desarrollo personal":      Smile,
  "Educación":                BookOpen,
  "Bienestar":                Activity,
};

function resolveIconComponent(iconKey: string | null | undefined, name: string): React.ElementType {
  if (iconKey && ICON_COMPONENTS[iconKey]) return ICON_COMPONENTS[iconKey];
  if (NAME_ICON_COMPONENTS[name]) return NAME_ICON_COMPONENTS[name];
  return Stethoscope;
}

const CATEGORY_KEYWORDS: Record<CategoryKey, string[]> = {
  salud_mental: [
    "psicología", "psicologia", "coaching de vida", "desarrollo personal",
    "mindfulness", "meditación", "meditacion", "guía espiritual", "guia espiritual",
    "guía motivacional", "guia motivacional", "bienestar", "salud mental",
    "terapia", "ansiedad", "depresión", "depresion",
  ],
  salud_fisica: [
    "nutrición", "nutricion", "dermatólogo", "dermatologo", "gastroenterólogo",
    "gastroenterologo", "medicina integral", "salud física", "salud fisica",
    "fisioterapia", "medicina", "enfermería", "enfermeria",
  ],
  negocios: [
    "asesor financiero", "finanzas", "coach deportivo", "mercadotecnia",
    "emprendimiento", "negocios", "marketing", "inversiones", "contabilidad",
    "recursos humanos", "liderazgo",
  ],
  educacion: [
    "inglés", "ingles", "francés", "frances", "lenguaje de señas", "lenguaje de senas",
    "oratoria", "idiomas", "educación", "educacion", "matemáticas", "matematicas",
    "tutorías", "tutorias",
  ],
  legal: [
    "abogado", "legal", "orientación vocacional", "orientacion vocacional",
    "derecho", "notaría", "notaria", "asesoría legal", "asesoria legal",
  ],
  creatividad: [
    "diseño gráfico", "diseno grafico", "desarrollo web", "desarrollo app",
    "maquillaje", "asesor de imagen", "imagen personal", "fotografía", "fotografia",
    "diseño", "diseno", "arte", "moda",
  ],
  otros: [],
};

function classifySpecialty(name: string): CategoryKey {
  const lower = name.toLowerCase();
  for (const [key, keywords] of Object.entries(CATEGORY_KEYWORDS) as [CategoryKey, string[]][]) {
    if (key === "otros") continue;
    if (keywords.some((kw) => lower.includes(kw))) return key;
  }
  return "otros";
}

const STATIC_SPECIALTIES = [
  { id: 1, slug: "psicologia",      name: "Psicología",      description: "Bienestar mental y emocional con psicólogos certificados.", icon: null },
  { id: 2, slug: "emprendimiento",  name: "Emprendimiento",  description: "Asesoría para emprendedores y startups en crecimiento.",    icon: null },
  { id: 3, slug: "finanzas",        name: "Finanzas",        description: "Consultoría financiera personal y empresarial.",             icon: null },
  { id: 4, slug: "idiomas",         name: "Idiomas",         description: "Clases con profesores nativos y certificados.",              icon: null },
  { id: 5, slug: "imagen-personal", name: "Imagen Personal", description: "Consultoría de imagen, estilo y presencia personal.",        icon: null },
  { id: 6, slug: "legal",           name: "Legal",           description: "Asesoría legal en diversas áreas del derecho.",              icon: null },
  { id: 7, slug: "vocacion",        name: "Vocación",        description: "Orientación vocacional y desarrollo profesional.",           icon: null },
];

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export default function SpecialtiesPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryKey | "all">("all");

  const { data: specialties } = trpc.specialty.getAll.useQuery(undefined, {
    initialData: STATIC_SPECIALTIES,
    staleTime: 5 * 60 * 1000,
  });

  const allSpecialties: any[] = specialties ?? STATIC_SPECIALTIES;

  const withCategory = useMemo(
    () => allSpecialties
      .filter((s) => (s.professionalCount ?? 0) > 0)
      .map((s) => ({ ...s, category: classifySpecialty(s.name) })),
    [allSpecialties]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return withCategory.filter((s) => {
      const matchesSearch = !q || s.name.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q);
      const matchesCategory = activeCategory === "all" || s.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [withCategory, search, activeCategory]);

  const activeCategories = useMemo(() => {
    const present = new Set(withCategory.map((s) => s.category));
    return CATEGORIES.filter((c) => present.has(c.key));
  }, [withCategory]);

  return (
    <DashboardLayout>
      <div className="bg-white min-h-full">
        {/* Hero strip */}
        <div className="bg-[#5B6A57] px-6 py-8">
          <h1 className="text-2xl font-semibold text-white">Encuentra tu especialista</h1>
          <p className="text-[#c5d0c2] text-sm mt-1">Asesorías online con profesionales certificados</p>
          <div className="mt-4 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar especialidad..."
              className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-white/30 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Category chips — horizontal scroll */}
        <div
          className="px-6 py-3 border-b border-gray-100 flex gap-2 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          <button
            onClick={() => setActiveCategory("all")}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeCategory === "all"
                ? "bg-[#5B6A57] text-white"
                : "border border-gray-200 text-gray-600 hover:border-[#5B6A57] hover:text-[#5B6A57]"
            }`}
          >
            Todas
          </button>
          {activeCategories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(activeCategory === cat.key ? "all" : cat.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat.key
                  ? "bg-[#5B6A57] text-white"
                  : "border border-gray-200 text-gray-600 hover:border-[#5B6A57] hover:text-[#5B6A57]"
              }`}
            >
              <cat.Icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Main grid */}
        <div className="px-6 py-5">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No se encontraron especialidades para "{search}"</p>
              <button
                onClick={() => { setSearch(""); setActiveCategory("all"); }}
                className="text-xs text-[#5B6A57] mt-2 hover:underline"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-4">
                {filtered.length}{" "}
                {filtered.length === 1 ? "especialidad" : "especialidades"}
                {search || activeCategory !== "all" ? " encontradas" : " disponibles"}
              </p>
              <motion.div
                key={`${search}-${activeCategory}`}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
                variants={gridVariants}
                initial="hidden"
                animate="show"
              >
                {filtered.map((s: any) => {
                  const IconComp = resolveIconComponent(s.icon, s.name);
                  return (
                    <motion.button
                      key={s.id}
                      variants={cardVariants}
                      whileHover={{ y: -2 }}
                      onClick={() => navigate(`/especialidades/${(s as any).slug || s.id}`)}
                      className="flex flex-col items-start p-3 bg-white rounded-xl border border-gray-100 hover:border-[#5B6A57] hover:shadow-md transition-shadow w-full text-left"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-lg bg-[#f0f3ef] flex items-center justify-center mb-2">
                          <IconComp className="w-4 h-4 text-[#5B6A57]" />
                        </div>
                        {(s.professionalCount ?? 0) > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#A7774E] text-white text-[10px] font-semibold flex items-center justify-center">
                            {s.professionalCount}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900 leading-tight">{s.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 leading-snug">
                        {s.description ?? "Ver especialistas"}
                      </p>
                    </motion.button>
                  );
                })}
              </motion.div>
            </>
          )}
        </div>

        {/* Stats strip */}
        <div className="bg-gray-50 border-y border-gray-100 py-6 px-6 mt-6">
          <div className="grid grid-cols-3 gap-4 max-w-lg">
            <div className="text-center">
              <p className="text-2xl font-semibold text-[#5B6A57]">50+</p>
              <p className="text-xs text-gray-500 mt-0.5">Especialistas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-[#5B6A57]">8</p>
              <p className="text-xs text-gray-500 mt-0.5">Áreas de conocimiento</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-[#5B6A57]">50 min</p>
              <p className="text-xs text-gray-500 mt-0.5">Por sesión</p>
            </div>
          </div>
        </div>

        {/* ¿Cómo funciona? */}
        <div className="px-6 py-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">¿Cómo funciona?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-[#5B6A57] text-white text-sm font-semibold flex items-center justify-center flex-shrink-0">1</div>
              <div>
                <p className="text-sm font-medium text-gray-900">Elige tu especialidad</p>
                <p className="text-xs text-gray-500 mt-0.5">Explora las áreas disponibles y encuentra lo que necesitas</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-[#5B6A57] text-white text-sm font-semibold flex items-center justify-center flex-shrink-0">2</div>
              <div>
                <p className="text-sm font-medium text-gray-900">Selecciona un profesional</p>
                <p className="text-xs text-gray-500 mt-0.5">Revisa perfiles, calificaciones y disponibilidad</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-[#5B6A57] text-white text-sm font-semibold flex items-center justify-center flex-shrink-0">3</div>
              <div>
                <p className="text-sm font-medium text-gray-900">Agenda tu sesión</p>
                <p className="text-xs text-gray-500 mt-0.5">Elige fecha y hora. Recibirás el link de videollamada al instante</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA banner */}
        <div className="mx-6 mb-6 rounded-2xl bg-[#5B6A57] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-white font-semibold text-base">¿No sabes por dónde empezar?</p>
            <p className="text-[#c5d0c2] text-sm mt-0.5">Cuéntanos qué necesitas y te ayudamos a encontrar el especialista ideal</p>
          </div>
          <Button
            className="bg-white text-[#3d4e3f] hover:bg-gray-100 font-medium flex-shrink-0"
            onClick={() => { setSearch(""); setActiveCategory("all"); }}
          >
            Ver todos los especialistas
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
