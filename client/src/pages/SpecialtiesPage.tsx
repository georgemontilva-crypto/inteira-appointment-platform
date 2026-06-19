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
  Target, X,
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

const CATEGORY_FALLBACK_BG: Record<CategoryKey | "default", string> = {
  salud_mental:  "#1e2e28",
  salud_fisica:  "#1a2a3a",
  negocios:      "#281e14",
  educacion:     "#1a2234",
  legal:         "#221830",
  creatividad:   "#2e1824",
  otros:         "#1e2220",
  default:       "#1e2220",
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
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.22 } },
};

export default function SpecialtiesPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryKey | "all">("all");

  const { data: specialties, isPlaceholderData } = trpc.specialty.getAll.useQuery(undefined, {
    placeholderData: STATIC_SPECIALTIES,
    staleTime: 5 * 60 * 1000,
  });

  const allSpecialties: any[] = specialties ?? [];
  const visibleSpecialties = isPlaceholderData
    ? allSpecialties
    : allSpecialties.filter((s) => (s.professionalCount ?? 0) > 0);

  const withCategory = useMemo(
    () => visibleSpecialties.map((s) => ({ ...s, category: classifySpecialty(s.name) })),
    [visibleSpecialties]
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
      <div className="bg-white flex flex-col" style={{ height: "calc(100vh - 58px)" }}>
        <div className="max-w-7xl mx-auto w-full px-4 md:px-6 flex flex-col h-full">

          {/* ── Isla: header + búsqueda + chips ── */}
          <div className="flex-shrink-0 pt-6 pb-4">
          <div className="bg-gray-50 rounded-2xl p-5">
            <h1 className="text-xl font-semibold text-gray-900 mb-1">Especialidades</h1>
            <p className="text-sm text-gray-500 mb-4">Encuentra el especialista ideal para lo que necesitas</p>

            {/* Barra de búsqueda */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar especialidad..."
                className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm bg-white border border-gray-200 outline-none focus:ring-2 focus:ring-[#5B6A57]/20 focus:border-[#5B6A57]/40 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Chips de categoría — scroll horizontal */}
            <div
              className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: "none" }}
            >
              <button
                onClick={() => setActiveCategory("all")}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeCategory === "all"
                    ? "bg-[#5B6A57] text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-[#5B6A57] hover:text-[#5B6A57]"
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
                      : "bg-white border border-gray-200 text-gray-600 hover:border-[#5B6A57] hover:text-[#5B6A57]"
                  }`}
                >
                  <cat.Icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
          </div>

          {/* ── Scrollable zone ── */}
          <div
            className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none" }}
          >

          {/* ── Grid de cards ── */}
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
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                variants={gridVariants}
                initial="hidden"
                animate="show"
              >
                {filtered.map((s: any) => {
                  const IconComp = resolveIconComponent(s.icon, s.name);
                  const fallbackBg = CATEGORY_FALLBACK_BG[s.category as CategoryKey] ?? CATEGORY_FALLBACK_BG.default;
                  return (
                    <motion.div
                      key={s.id}
                      variants={cardVariants}
                      whileHover={{ y: -3 }}
                      onClick={() => navigate(`/especialidades/${(s as any).slug || s.id}`)}
                      className="relative rounded-[20px] overflow-hidden h-[220px] cursor-pointer group"
                      style={{ backgroundColor: fallbackBg }}
                    >
                      {/* Imagen de fondo */}
                      {(s as any).imageUrl && (
                        <div
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                          style={{ backgroundImage: `url(${(s as any).imageUrl})` }}
                        />
                      )}

                      {/* Degradado izquierda→derecha */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: "linear-gradient(to right, rgba(20,26,20,0.97) 0%, rgba(20,26,20,0.85) 35%, rgba(20,26,20,0.35) 65%, rgba(20,26,20,0.05) 100%)",
                        }}
                      />

                      {/* Contenido */}
                      <div className="relative h-full flex flex-col justify-between p-[18px] z-10">
                        {/* Top row */}
                        <div className="flex justify-between items-start">
                          <div className="w-9 h-9 rounded-[10px] bg-white/15 flex items-center justify-center">
                            <IconComp className="w-[17px] h-[17px] text-white" />
                          </div>
                          {(s.professionalCount ?? 0) > 0 && (
                            <span className="bg-white/20 text-white text-[11px] px-2.5 py-1 rounded-full font-medium">
                              {s.professionalCount} prof.
                            </span>
                          )}
                        </div>

                        {/* Bottom text */}
                        <div>
                          <h3 className="text-[17px] font-medium text-white leading-snug">{s.name}</h3>
                          {s.description && (
                            <p className="text-xs text-white/60 mt-1 line-clamp-1">{s.description}</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </>
          )}

          {/* ── Stats strip ── */}
          <div className="bg-gray-50 rounded-2xl py-6 px-6 mt-8">
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

          {/* ── ¿Cómo funciona? ── */}
          <div className="py-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">¿Cómo funciona?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { n: "1", title: "Elige tu especialidad", desc: "Explora las áreas disponibles y encuentra lo que necesitas" },
                { n: "2", title: "Selecciona un profesional", desc: "Revisa perfiles, calificaciones y disponibilidad" },
                { n: "3", title: "Agenda tu sesión", desc: "Elige fecha y hora. Recibirás el link de videollamada al instante" },
              ].map(({ n, title, desc }) => (
                <div key={n} className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-[#5B6A57] text-white text-sm font-semibold flex items-center justify-center flex-shrink-0">
                    {n}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── CTA banner ── */}
          <div className="rounded-2xl bg-[#5B6A57] p-6 flex flex-col sm:flex-row items-center justify-between gap-4 mb-2">
            <div>
              <p className="text-white font-semibold text-base">¿No sabes por dónde empezar?</p>
              <p className="text-[#c5d0c2] text-sm mt-0.5">Cuéntanos qué necesitas y te ayudamos a encontrar el especialista ideal</p>
            </div>
            <Button
              className="bg-white text-[#3d4e3f] hover:bg-gray-100 font-medium flex-shrink-0 border-0"
              onClick={() => { setSearch(""); setActiveCategory("all"); }}
            >
              Ver todos los especialistas
            </Button>
          </div>

          </div>{/* end scrollable zone */}

        </div>
      </div>
    </DashboardLayout>
  );
}
