import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { PRICING } from "@/lib/pricing";
import { Link, useRoute, useLocation } from "wouter";
import { Star, Award, Calendar, Search, SlidersHorizontal, X, Coins, ArrowLeft } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { motion } from "framer-motion";

type SortOption = "rating" | "experience" | "price_asc" | "price_desc";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

const _now = new Date(0);
const STATIC_SPECIALTIES = [
  { id: 1, slug: "psicologia",      name: "Psicología",      description: "Bienestar mental y emocional con psicólogos certificados.", imageUrl: null, icon: null, color: null, isActive: true, createdAt: _now, updatedAt: _now },
  { id: 2, slug: "emprendimiento",  name: "Emprendimiento",  description: "Asesoría para emprendedores y startups en crecimiento.",    imageUrl: null, icon: null, color: null, isActive: true, createdAt: _now, updatedAt: _now },
  { id: 3, slug: "finanzas",        name: "Finanzas",        description: "Consultoría financiera personal y empresarial.",             imageUrl: null, icon: null, color: null, isActive: true, createdAt: _now, updatedAt: _now },
  { id: 4, slug: "idiomas",         name: "Idiomas",         description: "Clases con profesores nativos y certificados.",              imageUrl: null, icon: null, color: null, isActive: true, createdAt: _now, updatedAt: _now },
  { id: 5, slug: "imagen-personal", name: "Imagen Personal", description: "Consultoría de imagen, estilo y presencia personal.",        imageUrl: null, icon: null, color: null, isActive: true, createdAt: _now, updatedAt: _now },
  { id: 6, slug: "legal",           name: "Legal",           description: "Asesoría legal en diversas áreas del derecho.",              imageUrl: null, icon: null, color: null, isActive: true, createdAt: _now, updatedAt: _now },
  { id: 7, slug: "vocacion",        name: "Vocación",        description: "Orientación vocacional y desarrollo profesional.",           imageUrl: null, icon: null, color: null, isActive: true, createdAt: _now, updatedAt: _now },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.22 } },
};

export default function ProfessionalsList() {
  const [, params] = useRoute("/especialidades/:slug");
  const slug = params?.slug ?? "";
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("rating");
  const [showFilters, setShowFilters] = useState(false);

  const { data: professionals, isLoading } = trpc.professional.getBySpecialtySlug.useQuery(
    { slug },
    { enabled: slug.length > 0 }
  );

  const { data: specialties } = trpc.specialty.getAll.useQuery(undefined, {
    initialData: STATIC_SPECIALTIES,
    staleTime: 5 * 60 * 1000,
  });
  const specialty = specialties?.find((s: any) => s.slug === slug);

  const filtered = useMemo(() => {
    let list = professionals ?? [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.bio?.toLowerCase().includes(q) ||
          (p as any).professionalName?.toLowerCase().includes(q) ||
          String(p.id).includes(q)
      );
    }
    if (onlyAvailable) list = list.filter((p) => p.isAvailable);
    list = [...list].sort((a, b) => {
      if (sortBy === "rating")     return (Number(b.averageRating) || 5) - (Number(a.averageRating) || 5);
      if (sortBy === "experience") return (b.yearsOfExperience ?? 0) - (a.yearsOfExperience ?? 0);
      if (sortBy === "price_asc")  return (Number(a.hourlyRate) || 0) - (Number(b.hourlyRate) || 0);
      if (sortBy === "price_desc") return (Number(b.hourlyRate) || 0) - (Number(a.hourlyRate) || 0);
      return 0;
    });
    return list;
  }, [professionals, searchQuery, onlyAvailable, sortBy]);

  const hasActiveFilters = onlyAvailable || sortBy !== "rating";

  return (
    <DashboardLayout>
      <div className="bg-white min-h-full">
        <div className="max-w-7xl mx-auto w-full px-4 md:px-6 py-6 space-y-5">

          {/* ── Header ── */}
          <div>
            <div className="flex items-center gap-3 mb-0.5">
              <button
                onClick={() => navigate("/especialidades")}
                className="text-gray-400 hover:text-[#5B6A57] flex-shrink-0 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">{specialty?.name ?? "Especialidad"}</h1>
            </div>
            <p className="text-sm text-gray-400 pl-8">
              {isLoading
                ? "Cargando especialistas..."
                : `${filtered.length} ${filtered.length === 1 ? "especialista disponible" : "especialistas disponibles"}`}
            </p>
          </div>

          {/* ── Toolbar isla ── */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar profesional..."
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm bg-white border border-gray-200 outline-none focus:ring-2 focus:ring-[#5B6A57]/20 focus:border-[#5B6A57]/40 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3.5 rounded-xl text-sm font-medium border transition-all flex-shrink-0 ${
                  hasActiveFilters
                    ? "bg-[#5B6A57] text-white border-[#5B6A57]"
                    : "bg-white border-gray-200 text-gray-600 hover:border-[#5B6A57] hover:text-[#5B6A57]"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filtros</span>
                {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </button>
            </div>

            {/* Panel de filtros inline */}
            {showFilters && (
              <div className="flex flex-wrap gap-2 items-center pt-1 border-t border-gray-200">
                <button
                  onClick={() => setOnlyAvailable(!onlyAvailable)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    onlyAvailable
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                      : "border-gray-300 text-gray-600 hover:border-gray-400 bg-white"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${onlyAvailable ? "bg-emerald-500" : "bg-gray-400"}`} />
                  Solo disponibles
                </button>
                <div className="flex flex-wrap items-center gap-2 ml-auto">
                  <span className="text-xs text-gray-400">Ordenar:</span>
                  {(
                    [
                      { value: "rating",     label: "Calificación" },
                      { value: "experience", label: "Experiencia" },
                      { value: "price_asc",  label: "Menor precio" },
                      { value: "price_desc", label: "Mayor precio" },
                    ] as { value: SortOption; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSortBy(opt.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        sortBy === opt.value
                          ? "bg-[#5B6A57] text-white border-[#5B6A57]"
                          : "border-gray-300 text-gray-600 hover:border-[#5B6A57] bg-white"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={() => { setOnlyAvailable(false); setSortBy("rating"); }}
                    className="text-xs text-gray-400 hover:text-gray-600 underline"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Grid ── */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="h-[140px] bg-gray-100" />
                  <div className="p-3.5 space-y-2">
                    <div className="h-3.5 bg-gray-100 rounded-full w-2/3" />
                    <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                    <div className="h-3 bg-gray-100 rounded-full w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Search className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                {searchQuery || hasActiveFilters ? "Sin resultados" : "No hay profesionales disponibles"}
              </h3>
              <p className="text-sm text-gray-400">
                {searchQuery || hasActiveFilters
                  ? "Intenta con otros términos o ajusta los filtros."
                  : "Pronto agregaremos más especialistas en esta área."}
              </p>
              {(searchQuery || hasActiveFilters) && (
                <button
                  className="mt-4 text-sm text-[#5B6A57] border border-[#5B6A57]/30 px-4 py-2 rounded-xl hover:bg-[#5B6A57]/5 transition-colors"
                  onClick={() => { setSearchQuery(""); setOnlyAvailable(false); setSortBy("rating"); }}
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          ) : (
            <motion.div
              key={`${searchQuery}-${onlyAvailable}-${sortBy}`}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {filtered.map((pro) => {
                const proName = (pro as any).professionalName ?? `Especialista #${pro.id}`;
                const photo = (pro as any).profilePhoto ?? (pro as any).userProfileImage ?? null;
                const rating = Number(pro.averageRating) || 0;
                const hasReviews = (pro.totalReviews ?? 0) > 0;

                return (
                  <motion.div
                    key={pro.id}
                    variants={cardVariants}
                    whileHover={{ y: -3 }}
                    className="bg-white border border-gray-100 rounded-2xl overflow-hidden"
                  >
                    {/* Foto como header */}
                    <div className="h-[140px] relative bg-gray-100">
                      {photo ? (
                        <img
                          src={photo}
                          alt={proName}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#c5d0c2] to-[#a8b5a4]">
                          <span className="text-3xl font-medium text-[#3d4e3f]">{getInitials(proName)}</span>
                        </div>
                      )}
                      <span className={`absolute top-2.5 right-2.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                        pro.isAvailable
                          ? "bg-green-50 text-green-700"
                          : "bg-black/50 text-white"
                      }`}>
                        {pro.isAvailable ? "Disponible" : "No disponible"}
                      </span>
                    </div>

                    {/* Body */}
                    <div className="p-3.5">
                      <p className="font-medium text-sm text-gray-900 truncate">{proName}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{specialty?.name ?? ""}</p>

                      {/* Rating */}
                      <div className="flex items-center gap-0.5 mt-1.5">
                        {hasReviews ? (
                          <>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className="w-3 h-3"
                                style={
                                  s <= Math.round(rating)
                                    ? { color: "#f59e0b", fill: "#f59e0b" }
                                    : { color: "rgba(0,0,0,0.12)" }
                                }
                              />
                            ))}
                            <span className="text-xs text-gray-400 ml-1">
                              {rating.toFixed(1)} ({pro.totalReviews})
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">Nuevo</span>
                        )}
                      </div>

                      {/* Bio */}
                      {pro.bio && (
                        <p className="text-xs text-gray-500 line-clamp-2 mt-2 leading-relaxed">{pro.bio}</p>
                      )}

                      {/* Meta */}
                      <div className="flex items-center gap-3 mt-2.5">
                        {pro.yearsOfExperience ? (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Award className="w-3.5 h-3.5 text-gray-400" />
                            {pro.yearsOfExperience} años
                          </span>
                        ) : null}
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Coins className="w-3.5 h-3.5 text-gray-400" />
                          Desde ${PRICING.SESSION_BASIC_MXN}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-3">
                        <Link href={`/profesional/${(pro as any).slug || pro.id}`} className="flex-1">
                          <button className="w-full h-9 rounded-xl border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors">
                            Ver perfil
                          </button>
                        </Link>
                        <button
                          className="flex-1 h-9 rounded-xl bg-[#5B6A57] hover:bg-[#3d4e3f] text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                          disabled={!pro.isAvailable}
                          onClick={() => {
                            if (!pro.isAvailable) return;
                            window.location.href = isAuthenticated
                              ? `/agendar/${pro.id}`
                              : `/login?returnTo=${encodeURIComponent(`/agendar/${pro.id}`)}`;
                          }}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          Agendar
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}
