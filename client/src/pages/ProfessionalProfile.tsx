import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useRoute } from "wouter";
import { Star, Award, Clock, CheckCircle2, ArrowLeft, Calendar, Shield, GraduationCap } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ProfessionalProfile() {
  const [, params] = useRoute("/profesional/:id");
  const professionalId = parseInt(params?.id ?? "0");

  const { data: professional, isLoading } = trpc.professional.getById.useQuery(
    { id: professionalId },
    { enabled: professionalId > 0 }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Profesional no encontrado</h2>
          <Link href="/especialidades">
            <Button className="gradient-brand text-white border-0">Ver especialidades</Button>
          </Link>
        </div>
      </div>
    );
  }

  const rating = parseFloat(professional.averageRating ?? "5.0");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-hero text-white py-12">
        <div className="container">
          <Button
            variant="ghost"
            className="text-white/80 hover:text-white hover:bg-white/10 mb-6 -ml-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-24 h-24 rounded-3xl bg-white/20 flex items-center justify-center text-4xl font-bold flex-shrink-0">
              {professional.user?.name?.charAt(0) ?? "P"}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
                  {professional.user?.name ?? `Especialista #${professional.id}`}
                </h1>
                {professional.status === "approved" && (
                  <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Verificado
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-white/80">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-accent text-accent" />
                  <span className="font-medium">{rating.toFixed(1)}</span>
                  <span className="text-sm">({professional.totalReviews ?? 0} reseñas)</span>
                </div>
                {professional.yearsOfExperience && (
                  <div className="flex items-center gap-1">
                    <Award className="w-4 h-4" />
                    <span>{professional.yearsOfExperience} años de experiencia</span>
                  </div>
                )}
                {professional.hourlyRate && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>${professional.hourlyRate} MXN / hora</span>
                  </div>
                )}
              </div>
            </div>
            <Link href={`/agendar/${professional.id}`}>
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold shadow-lg">
                <Calendar className="w-5 h-5 mr-2" />
                Agendar cita
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio */}
            {professional.bio && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Acerca de mí</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{professional.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Education */}
            {professional.education && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-primary" />
                    Educación
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{professional.education}</p>
                </CardContent>
              </Card>
            )}

            {/* Certifications */}
            {professional.certifications && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Certificaciones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{professional.certifications}</p>
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="w-5 h-5 text-accent" />
                  Reseñas ({professional.reviews?.length ?? 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {professional.reviews?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">
                    Aún no hay reseñas. ¡Sé el primero en calificar!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {professional.reviews?.map((review) => (
                      <div key={review.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${i < review.rating ? "fill-accent text-accent" : "text-muted-foreground/30"}`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(review.createdAt), "d MMM yyyy", { locale: es })}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-muted-foreground">{review.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Quick info */}
            <Card className="border-border">
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary mb-1">{rating.toFixed(1)}</div>
                  <div className="flex items-center justify-center gap-0.5 mb-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${i < Math.round(rating) ? "fill-accent text-accent" : "text-muted-foreground/30"}`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">{professional.totalReviews ?? 0} reseñas</p>
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                  {professional.yearsOfExperience && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Experiencia</span>
                      <span className="font-medium">{professional.yearsOfExperience} años</span>
                    </div>
                  )}
                  {professional.hourlyRate && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Tarifa</span>
                      <span className="font-medium">${professional.hourlyRate} MXN/hr</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Estado</span>
                    <Badge className={`border-0 text-xs ${professional.isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                      {professional.isAvailable ? "Disponible" : "No disponible"}
                    </Badge>
                  </div>
                </div>

                <Link href={`/agendar/${professional.id}`}>
                  <Button className="w-full gradient-brand text-white border-0 shadow-md shadow-primary/30">
                    <Calendar className="w-4 h-4 mr-2" />
                    Agendar cita
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* License */}
            <Card className="border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Cédula profesional</p>
                    <p className="text-xs text-muted-foreground">{professional.licenseNumber}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
