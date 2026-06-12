import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "../components/DashboardLayout";
import { useState, useMemo } from "react";
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
import type React from "react";

type CategoryKey = "salud_mental" | "salud_fisica" | "negocios" | "educacion" | "legal" | "creatividad" | "otros";

const CATEGORIES: { key: CategoryKey; label: string; Icon: React.ElementType }[] = [
  { key: "salud_mental",  label: "Salud Mental y Bienestar",  Icon: Brain },
  { key: "salud_fisica",  label: "Salud Física",              Icon: HeartPulse },
  { key: "negocios",      label: "Negocios y Finanzas",       Icon: TrendingUp },
  { key: "educacion",     label: "Educación e Idiomas",       Icon: GraduationCap },
  { key: "legal",         label: "Legal y Profesional",       Icon: Scale },
  { key: "creatividad",   label: "Creatividad y Estilo",      Icon: Palette },
  { key: "otros",         label: "Otros",                     Icon: Sparkles },
];

const CATEGORY_COLORS: Record<CategoryKey, { bg: string; icon: string }> = {
  salud_mental: { bg: "bg-purple-50",  icon: "text-purple-600" },
  salud_fisica: { bg: "bg-rose-50",    icon: "text-rose-500" },
  negocios:     { bg: "bg-blue-50",    icon: "text-blue-600" },
  educacion:    { bg: "bg-amber-50",   icon: "text-amber-600" },
  legal:        { bg: "bg-indigo-50",  icon: "text-indigo-600" },
  creatividad:  { bg: "bg-pink-50",    icon: "text-pink-600" },
  otros:        { bg: "bg-gray-50",    icon: "text-gray-500" },
};

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  salud_mental: "SALUD MENTAL",
  salud_fisica: "SALUD FÍSICA",
  negocios:     "NEGOCIOS",
  educacion:    "EDUCACIÓN",
  legal:        "LEGAL",
  creatividad:  "CREATIVIDAD",
  otros:        "OTROS",
};

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
  "Psicología":             Brain,
  "Salud mental":           Brain,
  "Legal":                  Scale,
  "Emprendimiento":         TrendingUp,
  "Negocios":               Briefcase,
  "Finanzas":               DollarSign,
  "Idiomas":                Mic2,
  "Idiomas y cultura":      Globe,
  "Imagen Personal":        Sparkles,
  "Vocación":               Compass,
  "Orientación vocacional": GraduationCap,
  "Coaching de vida":       Sun,
  "Mindfulness y meditación": Leaf,
  "Nutrición":              Apple,
  "Terapia de pareja":      HeartHandshake,
  "Familia":                Heart,
  "Trabajo social":         HandHeart,
  "Recursos Humanos":       Users,
  "Desarrollo personal":    Smile,
  "Educación":              BookOpen,
  "Bienestar":              Activity,
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
  { id: 1, name: "Psicología",      description: "Bienestar mental y emocional con psicólogos certificados.", icon: null },
  { id: 2, name: "Emprendimiento",  description: "Asesoría para emprendedores y startups en crecimiento.",    icon: null },
  { id: 3, name: "Finanzas",        description: "Consultoría financiera personal y empresarial.",             icon: null },
  { id: 4, name: "Idiomas",         description: "Clases con profesores nativos y certificados.",              icon: null },
  { id: 5, name: "Imagen Personal", description: "Consultoría de imagen, estilo y presencia personal.",        icon: null },
  { id: 6, name: "Legal",           description: "Asesoría legal en diversas áreas del derecho.",              icon: null },
  { id: 7, name: "Vocación",        description: "Orientación vocacional y desarrollo profesional.",           icon: null },
];

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
    () => allSpecialties.map((s) => ({ ...s, category: classifySpecialty(s.name) })),
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

  const grouped = useMemo(() => {
    const map = new Map<CategoryKey, any[]>();
    for (const cat of CATEGORIES) map.set(cat.key, []);
    for (const s of filtered) {
      map.get(s.category as CategoryKey)!.push(s);
    }
    return CATEGORIES.map((cat) => ({ ...cat, items: map.get(cat.key)! })).filter((g) => g.items.length > 0);
  }, [filtered]);

  const activeCategories = useMemo(() => {
    const present = new Set(withCategory.map((s) => s.category));
    return CATEGORIES.filter((c) => present.has(c.key));
  }, [withCategory]);

  const totalFiltered = filtered.length;

  return (
    <DashboardLayout>
      <div className="bg-white min-h-full p-4 md:p-6 space-y-5">
        {/* Header + search integrados */}
        <div className="space-y-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "Poppins, sans-serif" }}>
              Especialidades
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Elige el área en la que necesitas orientación
            </p>
          </div>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar especialidad..."
              className="w-full pl-10 pr-9 h-10 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#5B6A57] focus:ring-1 focus:ring-[#5B6A57]/20 transition-all"
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

        {/* Chips de categoría */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeCategory === "all"
                ? "bg-[#5B6A57] text-white"
                : "border border-gray-300 text-gray-600 hover:border-[#5B6A57] hover:text-[#5B6A57]"
            }`}
          >
            Todas
          </button>
          {activeCategories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(activeCategory === cat.key ? "all" : cat.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat.key
                  ? "bg-[#5B6A57] text-white"
                  : "border border-gray-300 text-gray-600 hover:border-[#5B6A57] hover:text-[#5B6A57]"
              }`}
            >
              <cat.Icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Resultados */}
        {totalFiltered === 0 ? (
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
          <div className="space-y-8">
            {grouped.map((group) => (
              <section key={group.key}>
                {activeCategory === "all" && !search && (
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-3">
                    {CATEGORY_LABELS[group.key as CategoryKey]}
                  </p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {group.items.map((s: any) => {
                    const IconComp = resolveIconComponent(s.icon, s.name);
                    const colors = CATEGORY_COLORS[s.category as CategoryKey] ?? CATEGORY_COLORS.otros;
                    return (
                      <button
                        key={s.id}
                        onClick={() => navigate(`/especialidades/${s.id}`)}
                        className="group flex flex-col items-start gap-3 bg-white rounded-2xl p-4 border border-gray-200 hover:border-[#5B6A57] active:scale-[0.98] transition-all text-left"
                      >
                        <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                          <IconComp className={`w-5 h-5 ${colors.icon}`} />
                        </div>
                        <div className="flex-1 min-w-0 w-full">
                          <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                            {s.description ?? "Consultas con profesionales certificados."}
                          </p>
                        </div>
                        <span className="text-xs text-[#5B6A57] font-medium mt-auto group-hover:underline">
                          Ver →
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
