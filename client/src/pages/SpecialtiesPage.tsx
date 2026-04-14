import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "../components/DashboardLayout";
import { useState, useMemo } from "react";
import {
  Brain, Apple, Target, Leaf, Heart, Users, Compass, Stethoscope,
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
} from "lucide-react";
import type React from "react";

// ─── Icon map ────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ReactNode> = {
  Brain: <Brain className="w-6 h-6 text-white" />, BrainCircuit: <BrainCircuit className="w-6 h-6 text-white" />,
  HeartPulse: <HeartPulse className="w-6 h-6 text-white" />, Heart: <Heart className="w-6 h-6 text-white" />,
  HeartHandshake: <HeartHandshake className="w-6 h-6 text-white" />, HeartCrack: <HeartCrack className="w-6 h-6 text-white" />,
  Smile: <Smile className="w-6 h-6 text-white" />, Frown: <Frown className="w-6 h-6 text-white" />,
  Laugh: <Laugh className="w-6 h-6 text-white" />, MessageCircle: <MessageCircle className="w-6 h-6 text-white" />,
  Stethoscope: <Stethoscope className="w-6 h-6 text-white" />, Pill: <Pill className="w-6 h-6 text-white" />,
  Syringe: <Syringe className="w-6 h-6 text-white" />, Microscope: <Microscope className="w-6 h-6 text-white" />,
  FlaskConical: <FlaskConical className="w-6 h-6 text-white" />, TestTube: <TestTube className="w-6 h-6 text-white" />,
  Bone: <Bone className="w-6 h-6 text-white" />, Eye: <Eye className="w-6 h-6 text-white" />,
  Ear: <Ear className="w-6 h-6 text-white" />, Hand: <Hand className="w-6 h-6 text-white" />,
  Bandage: <Bandage className="w-6 h-6 text-white" />, ShieldPlus: <ShieldPlus className="w-6 h-6 text-white" />,
  ShieldCheck: <ShieldCheck className="w-6 h-6 text-white" />,
  Dumbbell: <Dumbbell className="w-6 h-6 text-white" />, PersonStanding: <PersonStanding className="w-6 h-6 text-white" />,
  Bike: <Bike className="w-6 h-6 text-white" />, Footprints: <Footprints className="w-6 h-6 text-white" />,
  Activity: <Activity className="w-6 h-6 text-white" />, Zap: <Zap className="w-6 h-6 text-white" />,
  Apple: <Apple className="w-6 h-6 text-white" />, Salad: <Salad className="w-6 h-6 text-white" />,
  Wheat: <Wheat className="w-6 h-6 text-white" />, Carrot: <Carrot className="w-6 h-6 text-white" />,
  Grape: <Grape className="w-6 h-6 text-white" />, Citrus: <Citrus className="w-6 h-6 text-white" />,
  Coffee: <Coffee className="w-6 h-6 text-white" />, Droplets: <Droplets className="w-6 h-6 text-white" />,
  Leaf: <Leaf className="w-6 h-6 text-white" />, Flower: <Flower className="w-6 h-6 text-white" />,
  Flower2: <Flower2 className="w-6 h-6 text-white" />, Sprout: <Sprout className="w-6 h-6 text-white" />,
  TreePine: <TreePine className="w-6 h-6 text-white" />, Feather: <Feather className="w-6 h-6 text-white" />,
  Waves: <Waves className="w-6 h-6 text-white" />, Wind: <Wind className="w-6 h-6 text-white" />,
  Flame: <Flame className="w-6 h-6 text-white" />, Snowflake: <Snowflake className="w-6 h-6 text-white" />,
  Sun: <Sun className="w-6 h-6 text-white" />, Moon: <Moon className="w-6 h-6 text-white" />,
  Sunset: <Sunset className="w-6 h-6 text-white" />, Baby: <Baby className="w-6 h-6 text-white" />,
  GraduationCap: <GraduationCap className="w-6 h-6 text-white" />, BookOpen: <BookOpen className="w-6 h-6 text-white" />,
  Lightbulb: <Lightbulb className="w-6 h-6 text-white" />, Puzzle: <Puzzle className="w-6 h-6 text-white" />,
  Target: <Target className="w-6 h-6 text-white" />, Trophy: <Trophy className="w-6 h-6 text-white" />,
  Award: <Award className="w-6 h-6 text-white" />, Star: <Star className="w-6 h-6 text-white" />,
  Briefcase: <Briefcase className="w-6 h-6 text-white" />, TrendingUp: <TrendingUp className="w-6 h-6 text-white" />,
  DollarSign: <DollarSign className="w-6 h-6 text-white" />, Scale: <Scale className="w-6 h-6 text-white" />,
  Globe: <Globe className="w-6 h-6 text-white" />, Compass: <Compass className="w-6 h-6 text-white" />,
  Users: <Users className="w-6 h-6 text-white" />, HandHeart: <HandHeart className="w-6 h-6 text-white" />,
  Music: <Music className="w-6 h-6 text-white" />, Palette: <Palette className="w-6 h-6 text-white" />,
  Mic2: <Mic2 className="w-6 h-6 text-white" />, Sparkles: <Sparkles className="w-6 h-6 text-white" />,
};

const NAME_ICON_MAP: Record<string, React.ReactNode> = {
  "Psicología":              <Brain className="w-6 h-6 text-white" />,
  "Salud mental":            <Brain className="w-6 h-6 text-white" />,
  "Legal":                   <Scale className="w-6 h-6 text-white" />,
  "Emprendimiento":          <TrendingUp className="w-6 h-6 text-white" />,
  "Negocios":                <Briefcase className="w-6 h-6 text-white" />,
  "Finanzas":                <DollarSign className="w-6 h-6 text-white" />,
  "Idiomas":                 <Mic2 className="w-6 h-6 text-white" />,
  "Idiomas y cultura":       <Globe className="w-6 h-6 text-white" />,
  "Imagen Personal":         <Sparkles className="w-6 h-6 text-white" />,
  "Vocación":                <Compass className="w-6 h-6 text-white" />,
  "Orientación vocacional":  <GraduationCap className="w-6 h-6 text-white" />,
  "Coaching de vida":        <Sun className="w-6 h-6 text-white" />,
  "Mindfulness y meditación":<Leaf className="w-6 h-6 text-white" />,
  "Nutrición":               <Apple className="w-6 h-6 text-white" />,
  "Terapia de pareja":       <HeartHandshake className="w-6 h-6 text-white" />,
  "Familia":                 <Heart className="w-6 h-6 text-white" />,
  "Trabajo social":          <HandHeart className="w-6 h-6 text-white" />,
  "Recursos Humanos":        <Users className="w-6 h-6 text-white" />,
  "Desarrollo personal":     <Smile className="w-6 h-6 text-white" />,
  "Educación":               <BookOpen className="w-6 h-6 text-white" />,
  "Bienestar":               <Activity className="w-6 h-6 text-white" />,
};

function resolveIcon(iconKey: string | null | undefined, name: string): React.ReactNode {
  if (iconKey && ICON_MAP[iconKey]) return ICON_MAP[iconKey];
  if (NAME_ICON_MAP[name]) return NAME_ICON_MAP[name];
  return <Stethoscope className="w-6 h-6 text-white" />;
}

// ─── Category map ─────────────────────────────────────────────────────────────
type CategoryKey = "salud_mental" | "salud_fisica" | "negocios" | "educacion" | "legal" | "creatividad" | "otros";

const CATEGORIES: { key: CategoryKey; label: string; emoji: string }[] = [
  { key: "salud_mental",  label: "Salud Mental y Bienestar",  emoji: "🧠" },
  { key: "salud_fisica",  label: "Salud Física",              emoji: "🏥" },
  { key: "negocios",      label: "Negocios y Finanzas",       emoji: "💼" },
  { key: "educacion",     label: "Educación e Idiomas",       emoji: "🎓" },
  { key: "legal",         label: "Legal y Profesional",       emoji: "⚖️" },
  { key: "creatividad",   label: "Creatividad y Estilo",      emoji: "🎨" },
  { key: "otros",         label: "Otros",                     emoji: "🌿" },
];

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

  // Assign category to each specialty
  const withCategory = useMemo(
    () => allSpecialties.map((s) => ({ ...s, category: classifySpecialty(s.name) })),
    [allSpecialties]
  );

  // Apply search + category filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return withCategory.filter((s) => {
      const matchesSearch = !q || s.name.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q);
      const matchesCategory = activeCategory === "all" || s.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [withCategory, search, activeCategory]);

  // Group filtered results by category (preserving CATEGORIES order)
  const grouped = useMemo(() => {
    const map = new Map<CategoryKey, any[]>();
    for (const cat of CATEGORIES) map.set(cat.key, []);
    for (const s of filtered) {
      map.get(s.category as CategoryKey)!.push(s);
    }
    return CATEGORIES.map((cat) => ({ ...cat, items: map.get(cat.key)! })).filter((g) => g.items.length > 0);
  }, [filtered]);

  // Which category chips to show (only categories that have at least one specialty in unfiltered set)
  const activeCategories = useMemo(() => {
    const present = new Set(withCategory.map((s) => s.category));
    return CATEGORIES.filter((c) => present.has(c.key));
  }, [withCategory]);

  const totalFiltered = filtered.length;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
            Especialidades
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Elige el área en la que necesitas orientación
          </p>
        </div>

        {/* Search bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar especialidad..."
            className="w-full pl-10 pr-4 h-10 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-lg leading-none"
            >×</button>
          )}
        </div>

        {/* Category filter chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeCategory === "all"
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            Todas
          </button>
          {activeCategories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(activeCategory === cat.key ? "all" : cat.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat.key
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        {/* Results */}
        {totalFiltered === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No se encontraron especialidades para "{search}"</p>
            <button onClick={() => { setSearch(""); setActiveCategory("all"); }} className="text-xs text-primary mt-2 hover:underline">
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map((group) => (
              <section key={group.key}>
                {/* Category header — only shown when "Todas" is active or when no search query */}
                {(activeCategory === "all" && !search) && (
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">{group.emoji}</span>
                    <h2 className="text-base font-bold text-foreground" style={{ fontFamily: "Poppins, sans-serif" }}>
                      {group.label}
                    </h2>
                    <div className="flex-1 h-px bg-border ml-2" />
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {group.items.map((s: any) => (
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
              </section>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
