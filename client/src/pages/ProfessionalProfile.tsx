import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { PRICING } from "@/lib/pricing";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link, useRoute, useLocation } from "wouter";
import DashboardLayout from "../components/DashboardLayout";
import {
  Star, Award, Clock, CheckCircle2, Calendar,
  Shield, GraduationCap, MessageSquare, User, FileText, Info, ArrowLeft,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [hovered, setHovered] = useState(0);
  const sizeClass = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-7 h-7" : "w-5 h-5";
  const display = readonly ? value : hovered || value;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <button
          key={i}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange?.(i + 1)}
          onMouseEnter={() => !readonly && setHovered(i + 1)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={readonly ? "cursor-default" : "cursor-pointer transition-transform hover:scale-110"}
        >
          <Star
            className={`${sizeClass} transition-colors ${
              i < display
                ? "fill-[#F59E0B] text-[#F59E0B]"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function ProfessionalProfile() {
  const [, params] = useRoute("/profesional/:slug");
  const rawParam = params?.slug ?? "";
  const isNumeric = /^\d+$/.test(rawParam);
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Numeric fallback: old /profesional/:id links redirect to /profesional/:slug
  const { data: proById } = trpc.professional.getById.useQuery(
    { id: parseInt(rawParam, 10) || 0 },
    { enabled: isNumeric && rawParam.length > 0 }
  );
  useEffect(() => {
    if (isNumeric && (proById as any)?.slug) {
      navigate(`/profesional/${(proById as any).slug}`, { replace: true } as any);
    }
  }, [isNumeric, (proById as any)?.slug]);

  // Primary slug-based fetch
  const { data: proBySlug, isLoading, refetch } = trpc.professional.getBySlug.useQuery(
    { slug: rawParam },
    { enabled: !isNumeric && rawParam.length > 0 }
  );

  const professional = isNumeric ? proById : proBySlug;
  const professionalId = professional?.id ?? 0;

  const { data: reviews, refetch: refetchReviews } = trpc.review.getByProfessional.useQuery(
    { professionalId },
    { enabled: professionalId > 0 }
  );

  const createReviewMutation = trpc.review.create.useMutation({
    onSuccess: () => {
      toast.success("Reseña publicada correctamente");
      setReviewRating(0);
      setReviewComment("");
      setShowReviewForm(false);
      refetch();
      refetchReviews();
    },
    onError: (err) => toast.error(err.message ?? "Error al publicar la reseña"),
  });

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
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Profesional no encontrado</h2>
          <Link href="/especialidades">
            <Button className="bg-primary hover:bg-primary/90 text-white">Ver especialidades</Button>
          </Link>
        </div>
      </div>
    );
  }

  const rating = parseFloat(professional.averageRating ?? "0");
  const totalReviews = professional.totalReviews ?? 0;

  // Rating distribution
  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: (reviews ?? []).filter((r) => r.rating === star).length,
  }));

  return (
    <DashboardLayout>
      <div className="container py-8">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#5B6A57] mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        {/* Profile header card */}
        <div className="rounded-2xl border border-border bg-card p-6 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0">
              {(professional.profilePhoto || professional.user?.profileImage) ? (
                <img
                  src={(professional.profilePhoto as string) ?? professional.user!.profileImage!}
                  alt={professional.user?.name ?? "Profesional"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full gradient-brand flex items-center justify-center text-white text-3xl font-bold">
                  {professional.user?.name?.charAt(0)?.toUpperCase() ?? "P"}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
                  {professional.user?.name ?? `Especialista #${professional.id}`}
                </h1>
                {professional.status === "approved" && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Verificado
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {[1,2,3,4,5].map(s => (
                        <span key={s} style={{ fontSize: '16px', color: s <= Math.round(rating) ? '#f59e0b' : '#e5e7eb' }}>★</span>
                      ))}
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '15px', color: '#333' }}>
                      {rating > 0 ? rating.toFixed(1) : 'Nuevo'}
                    </span>
                    <span style={{ fontSize: '13px', color: '#999' }}>
                      ({totalReviews} {totalReviews === 1 ? 'reseña' : 'reseñas'})
                    </span>
                  </div>
                </div>
                {professional.yearsOfExperience && (
                  <div className="flex items-center gap-1">
                    <Award className="w-4 h-4" />
                    <span>{professional.yearsOfExperience} años de experiencia</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>${PRICING.SESSION_BASIC_MXN} MXN / sesión</span>
                </div>
              </div>
            </div>
            <Button
              className="gradient-brand text-white border-0 shadow-md font-semibold"
              onClick={() => {
                window.location.href = isAuthenticated
                  ? `/agendar/${professional.id}`
                  : `/login?returnTo=${encodeURIComponent(`/agendar/${professional.id}`)}`;
              }}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Agendar cita
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio */}
            {professional.bio && (
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg" style={{ fontFamily: "Poppins, sans-serif" }}>
                    Acerca de mí
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{professional.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Education + Certifications side by side */}
            {(professional.education || professional.certifications) && (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
                gap: "16px",
              }}>
                {professional.education && (
                  <Card className="border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2" style={{ fontFamily: "Poppins, sans-serif" }}>
                        <GraduationCap className="w-5 h-5 text-primary" />
                        Formación académica
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">{professional.education}</p>
                    </CardContent>
                  </Card>
                )}

                {professional.certifications && (
                  <Card className="border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2" style={{ fontFamily: "Poppins, sans-serif" }}>
                        <Shield className="w-5 h-5 text-primary" />
                        Certificaciones
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {professional.certifications?.startsWith("http") ? (
                        <a href={professional.certifications} target="_blank" rel="noopener noreferrer">
                          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#607562] text-[#607562] text-sm hover:bg-[#eef2ee] transition-colors">
                            <FileText className="w-4 h-4" />
                            Ver certificado
                          </button>
                        </a>
                      ) : (
                        <p className="text-muted-foreground leading-relaxed">{professional.certifications}</p>
                      )}
                      {professional.licenseNumber && (
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", background: "#f7fafc", borderRadius: "10px", border: "1px solid #e0e8e0", marginTop: "12px" }}>
                          <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "#eef2ee", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Shield className="w-5 h-5 text-[#607562]" />
                          </div>
                          <div>
                            <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>Cédula profesional</p>
                            <p style={{ fontSize: "14px", fontWeight: 500, color: "#333", margin: 0 }}>{professional.licenseNumber}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Reviews section */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2" style={{ fontFamily: "Poppins, sans-serif" }}>
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Reseñas de usuarios ({totalReviews})
                  </CardTitle>
                  {isAuthenticated && !showReviewForm && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReviewForm(true)}
                      className="border-primary text-primary hover:bg-primary/5"
                    >
                      Escribir reseña
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Rating summary */}
                {totalReviews > 0 && (
                  <div className="flex items-start gap-6 p-4 bg-muted/30 rounded-xl">
                    <div style={{ textAlign: 'center', padding: '16px 0 12px', flexShrink: 0, minWidth: '90px' }}>
                      <p style={{ fontSize: '48px', fontWeight: 700, color: '#333', margin: 0, lineHeight: 1 }}>
                        {rating > 0 ? rating.toFixed(1) : '—'}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', margin: '8px 0' }}>
                        {[1,2,3,4,5].map(s => (
                          <span key={s} style={{ fontSize: '20px', color: s <= Math.round(rating) ? '#f59e0b' : '#e5e7eb' }}>★</span>
                        ))}
                      </div>
                      <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>
                        {totalReviews > 0 ? `${totalReviews} reseña${totalReviews !== 1 ? 's' : ''}` : 'Sin reseñas aún'}
                      </p>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {ratingCounts.map(({ star, count }) => (
                        <div key={star} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-4">{star}</span>
                          <Star className="w-3 h-3 text-[#F59E0B] fill-[#F59E0B] flex-shrink-0" />
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#F59E0B] rounded-full transition-all"
                              style={{ width: totalReviews > 0 ? `${(count / totalReviews) * 100}%` : "0%" }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-4">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Write review form */}
                {showReviewForm && isAuthenticated && (
                  <div className="border border-primary/20 rounded-xl p-5 bg-primary/5 space-y-4">
                    <h4 className="font-semibold text-sm">Tu calificación</h4>
                    <div className="flex items-center gap-3">
                      <StarRating value={reviewRating} onChange={setReviewRating} size="lg" />
                      {reviewRating > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"][reviewRating]}
                        </span>
                      )}
                    </div>
                    <Textarea
                      placeholder="Comparte tu experiencia con este profesional (opcional)..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          if (reviewRating === 0) {
                            toast.error("Selecciona una calificación antes de publicar");
                            return;
                          }
                          createReviewMutation.mutate({
                            professionalId,
                            appointmentId: undefined,
                            rating: reviewRating,
                            comment: reviewComment || undefined,
                          });
                        }}
                        disabled={createReviewMutation.isPending || reviewRating === 0}
                        className="bg-primary hover:bg-primary/90 text-white"
                      >
                        {createReviewMutation.isPending ? "Publicando..." : "Publicar reseña"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowReviewForm(false);
                          setReviewRating(0);
                          setReviewComment("");
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {!isAuthenticated && (
                  <div className="text-center py-4 border border-dashed border-border rounded-xl">
                    <p className="text-sm text-muted-foreground mb-3">
                      Inicia sesión para dejar una reseña
                    </p>
                  </div>
                )}

                {/* Reviews list */}
                {(reviews ?? []).length === 0 ? (
                  <div className="text-center py-8">
                    <Star className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">
                      Aún no hay reseñas. Sé el primero en calificar a este profesional.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(reviews ?? []).map((review) => (
                      <div key={review.id} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-semibold text-sm">
                            {((review as any).userName ?? "U").charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-foreground">{(review as any).userName ?? "Usuario"}</p>
                                <StarRating value={review.rating} readonly size="sm" />
                                {!!review.isVerified && (
                                  <Badge className="bg-green-100 text-green-700 border-green-200 text-xs px-1.5 py-0">
                                    <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                                    Verificada
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(review.createdAt), "d MMM yyyy", { locale: es })}
                              </span>
                            </div>
                            {review.comment && (
                              <p className="text-sm text-foreground/80 leading-relaxed">{review.comment}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Quick info card */}
            <Card className="border-border sticky top-4">
              <CardContent className="p-6 space-y-5">
                {/* Rating display */}
                <div className="text-center pb-4 border-b border-border">
                  <div className="text-4xl font-bold text-foreground mb-1" style={{ fontFamily: "Poppins, sans-serif" }}>
                    {rating > 0 ? rating.toFixed(1) : "Nuevo"}
                  </div>
                  <StarRating value={Math.round(rating)} readonly size="md" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalReviews} {totalReviews === 1 ? "reseña" : "reseñas"}
                  </p>
                </div>

                {/* Details */}
                <div className="space-y-3">
                  {professional.yearsOfExperience && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Experiencia</span>
                      <span className="font-medium">{professional.yearsOfExperience} años</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tarifa</span>
                    <span className="font-medium text-primary">${PRICING.SESSION_BASIC_MXN} MXN / sesión</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Disponibilidad</span>
                    <Badge
                      className={`border text-xs ${
                        professional.isAvailable
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-gray-100 text-gray-600 border-gray-200"
                      }`}
                      variant="outline"
                    >
                      {professional.isAvailable ? "Disponible" : "No disponible"}
                    </Badge>
                  </div>
                </div>

                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-white shadow-md"
                  onClick={() => {
                    window.location.href = isAuthenticated
                      ? `/agendar/${professional.id}`
                      : `/login?returnTo=${encodeURIComponent(`/agendar/${professional.id}`)}`;
                  }}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Agendar cita
                </Button>
              </CardContent>
            </Card>

            {/* Cancellation policy */}
            <Card className="border-amber-200 bg-amber-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2" style={{ fontFamily: "Poppins, sans-serif" }}>
                  <Info className="w-4 h-4 text-amber-600" />
                  Política de cancelación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg border border-emerald-200">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-700">Más de 12 horas de aviso</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Sin penalización</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg border border-amber-200">
                    <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-amber-700">Entre 5 y 12 horas de aviso</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Penalización de $70 MXN (Básico)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg border border-red-200">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-red-700">5 horas o menos de aviso</p>
                      <p className="text-xs text-muted-foreground mt-0.5">$150 MXN (Básico) / $250 MXN (Pro)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg border border-red-300">
                    <div className="w-2 h-2 rounded-full bg-red-700 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-red-800">No-show (no asistencia)</p>
                      <p className="text-xs text-muted-foreground mt-0.5">$150 MXN (Básico) / $500 MXN (Pro)</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
