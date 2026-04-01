import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useRoute } from "wouter";
import { Star, Clock, Award, Calendar, Search, SlidersHorizontal, X } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";

type SortOption = "rating" | "experience" | "price_asc" | "price_desc";

export default function ProfessionalsList() {
  const [, params] = useRoute("/especialidades/:id");
  const specialtyId = parseInt(params?.id ?? "0");

  const [searchQuery, setSearchQuery] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("rating");
  const [showFilters, setShowFilters] = useState(false);

  const { data: professionals, isLoading } = trpc.professional.getBySpecialty.useQuery(
    { specialtyId },
    { enabled: specialtyId > 0 }
  );

  // Static specialties — shown instantly without waiting for DB
  const _now = new Date(0);
  const STATIC_SPECIALTIES = [
    { id: 1, name: "Psicología", description: "Bienestar mental y emocional con psicólogos certificados.", imageUrl: null, icon: null, color: null, isActive: true, createdAt: _now, updatedAt: _now },
    { id: 2, name: "Emprendimiento", description: "Asesoría para emprendedores y startups en crecimiento.", imageUrl: null, icon: null, color: null, isActive: true, createdAt: _now, updatedAt: _now },
    { id: 3, name: "Finanzas", description: "Consultoría financiera personal y empresarial.", imageUrl: null, icon: null, color: null, isActive: true, createdAt: _now, updatedAt: _now },
    { id: 4, name: "Idiomas", description: "Clases con profesores nativos y certificados.", imageUrl: null, icon: null, color: null, isActive: true, createdAt: _now, updatedAt: _now },
    { id: 5, name: "Imagen Personal", description: "Consultoría de imagen, estilo y presencia personal.", imageUrl: null, icon: null, color: null, isActive: true, createdAt: _now, updatedAt: _now },
    { id: 6, name: "Legal", description: "Asesoría legal en diversas áreas del derecho.", imageUrl: null, icon: null, color: null, isActive: true, createdAt: _now, updatedAt: _now },
    { id: 7, name: "Vocación", description: "Orientación vocacional y desarrollo profesional.", imageUrl: null, icon: null, color: null, isActive: true, createdAt: _now, updatedAt: _now },
  ];

  const { data: specialties } = trpc.specialty.getAll.useQuery(undefined, {
    initialData: STATIC_SPECIALTIES,
    staleTime: 5 * 60 * 1000,
  });
  const specialty = specialties?.find((s) => s.id === specialtyId);

  const filtered = useMemo(() => {
    let list = professionals ?? [];

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.bio?.toLowerCase().includes(q) ||
          (p as typeof p & { professionalName?: string | null }).professionalName?.toLowerCase().includes(q) ||
          String(p.id).includes(q)
      );
    }

    // Availability filter
    if (onlyAvailable) {
      list = list.filter((p) => p.isAvailable);
    }

    // Sort
    list = [...list].sort((a, b) => {
      if (sortBy === "rating") return (Number(b.averageRating) || 5) - (Number(a.averageRating) || 5);
      if (sortBy === "experience") return (b.yearsOfExperience ?? 0) - (a.yearsOfExperience ?? 0);
      if (sortBy === "price_asc") return (Number(a.hourlyRate) || 0) - (Number(b.hourlyRate) || 0);
      if (sortBy === "price_desc") return (Number(b.hourlyRate) || 0) - (Number(a.hourlyRate) || 0);
      return 0;
    });

    return list;
  }, [professionals, searchQuery, onlyAvailable, sortBy]);

  const hasActiveFilters = onlyAvailable || sortBy !== "rating";

  return (
    <DashboardLayout>
      <div className="container py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
            {specialty?.name ?? "Especialidad"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} de {professionals?.length ?? 0} profesionales
          </p>
        </div>
        {/* Search & Filter bar */}
        <div className="mb-6 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, especialidad o descripción..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 border-border focus:border-primary"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              className={`h-11 px-4 border-border gap-2 ${hasActiveFilters ? "border-primary text-primary bg-primary/5" : ""}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filtros</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-primary" />
              )}
            </Button>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-4">
              <div className="flex flex-wrap gap-3 items-center">
                {/* Availability toggle */}
                <button
                  onClick={() => setOnlyAvailable(!onlyAvailable)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                    onlyAvailable
                      ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                      : "border-border bg-background hover:border-primary/40 text-foreground"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${onlyAvailable ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                  Solo disponibles
                </button>

                {/* Sort options */}
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs text-muted-foreground font-medium">Ordenar por:</span>
                  {(
                    [
                      { value: "rating", label: "Mejor calificación" },
                      { value: "experience", label: "Más experiencia" },
                      { value: "price_asc", label: "Menor precio" },
                      { value: "price_desc", label: "Mayor precio" },
                    ] as { value: SortOption; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSortBy(opt.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        sortBy === opt.value
                          ? "gradient-brand text-white border-transparent"
                          : "border-border bg-background hover:border-primary/40"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={() => { setOnlyAvailable(false); setSortBy("rating"); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse border-border">
                <CardContent className="p-6 h-48" />
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {searchQuery || hasActiveFilters ? "Sin resultados" : "No hay profesionales disponibles"}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery || hasActiveFilters
                ? "Intenta con otros términos o ajusta los filtros."
                : "Pronto agregaremos más especialistas en esta área."}
            </p>
            {(searchQuery || hasActiveFilters) && (
              <Button
                variant="outline"
                className="mt-4 border-primary/30 text-primary"
                onClick={() => { setSearchQuery(""); setOnlyAvailable(false); setSortBy("rating"); }}
              >
                Limpiar búsqueda
              </Button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((pro) => (
              <Card key={pro.id} className="group border-border hover:border-primary/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  {/* Avatar & Name */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0">
                      {((pro as any).profilePhoto || (pro as any).userProfileImage) ? (
                        <img
                          src={(pro as any).profilePhoto ?? (pro as any).userProfileImage}
                          alt={(pro as any).professionalName ?? "Especialista"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full gradient-brand flex items-center justify-center text-white text-2xl font-bold">
                          {((pro as any).professionalName ?? pro.bio ?? "P").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base mb-1 truncate">
                        {(pro as typeof pro & { professionalName?: string | null }).professionalName ?? `Especialista #${pro.id}`}
                      </h3>
                      <div className="flex items-center gap-1">
                        {(pro.totalReviews ?? 0) > 0 ? (
                          <>
                            {[1,2,3,4,5].map((s) => (
                              <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(Number(pro.averageRating)) ? "fill-accent text-accent" : "text-muted-foreground/30"}`} />
                            ))}
                            <span className="text-sm font-medium ml-0.5">{Number(pro.averageRating).toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground">({pro.totalReviews} reseñas)</span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Nuevo</span>
                        )}
                      </div>
                    </div>
                    <Badge className={`border-0 text-xs flex-shrink-0 ${pro.isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                      {pro.isAvailable ? "Disponible" : "No disponible"}
                    </Badge>
                  </div>

                  {/* Bio */}
                  {pro.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {pro.bio}
                    </p>
                  )}

                  {/* Details */}
                  <div className="space-y-2 mb-4">
                    {pro.yearsOfExperience && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Award className="w-4 h-4 text-primary" />
                        <span>{pro.yearsOfExperience} años de experiencia</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>$350 MXN / sesión</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link href={`/profesional/${pro.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full border-primary/30 text-primary hover:bg-primary/5">
                        Ver perfil
                      </Button>
                    </Link>
                    <Link href={`/agendar/${pro.id}`} className="flex-1">
                      <Button size="sm" className="w-full gradient-brand text-white border-0">
                        <Calendar className="w-4 h-4 mr-1" />
                        Agendar
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
