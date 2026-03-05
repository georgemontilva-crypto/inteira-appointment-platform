import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useRoute } from "wouter";
import { Star, Clock, Award, ArrowLeft, Calendar } from "lucide-react";

export default function ProfessionalsList() {
  const [, params] = useRoute("/especialidades/:id");
  const specialtyId = parseInt(params?.id ?? "0");

  const { data: professionals, isLoading } = trpc.professional.getBySpecialty.useQuery(
    { specialtyId },
    { enabled: specialtyId > 0 }
  );
  const { data: specialties } = trpc.specialty.getAll.useQuery();
  const specialty = specialties?.find((s) => s.id === specialtyId);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-hero text-white py-12">
        <div className="container">
          <Link href="/especialidades">
            <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 mb-4 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Especialidades
            </Button>
          </Link>
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "Poppins, sans-serif" }}>
            {specialty?.name ?? "Especialidad"}
          </h1>
          <p className="text-white/80">
            {professionals?.length ?? 0} profesionales disponibles
          </p>
        </div>
      </div>

      <div className="container py-10">
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse border-border">
                <CardContent className="p-6 h-48" />
              </Card>
            ))}
          </div>
        ) : professionals?.length === 0 ? (
          <div className="text-center py-20">
            <Award className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No hay profesionales disponibles</h3>
            <p className="text-muted-foreground">Pronto agregaremos más especialistas en esta área.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(professionals ?? []).map((pro) => (
              <Card key={pro.id} className="group border-border hover:border-primary/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  {/* Avatar & Name */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                      P
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base mb-1">Especialista #{pro.id}</h3>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-accent text-accent" />
                        <span className="text-sm font-medium">{pro.averageRating ?? "5.0"}</span>
                        <span className="text-xs text-muted-foreground">({pro.totalReviews ?? 0} reseñas)</span>
                      </div>
                    </div>
                    <Badge className={`border-0 text-xs ${pro.isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
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
                    {pro.hourlyRate && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 text-primary" />
                        <span>${pro.hourlyRate} MXN / hora</span>
                      </div>
                    )}
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
    </div>
  );
}
