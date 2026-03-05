import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, Upload, User, Award, FileText, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function RegisterProfessional() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    specialtyId: "",
    licenseNumber: "",
    bio: "",
    education: "",
    certifications: "",
    yearsOfExperience: "",
    hourlyRate: "",
    languages: "Español",
  });

  const { data: specialties } = trpc.specialty.getAll.useQuery();

  const registerMutation = trpc.professional.register.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Solicitud enviada exitosamente");
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message ?? "Error al enviar la solicitud");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.specialtyId || !form.licenseNumber) {
      toast.error("Por favor completa los campos obligatorios");
      return;
    }
    registerMutation.mutate({
      specialtyId: parseInt(form.specialtyId),
      licenseNumber: form.licenseNumber,
      bio: form.bio || undefined,
      education: form.education || undefined,
      certifications: form.certifications || undefined,
      yearsOfExperience: form.yearsOfExperience ? parseInt(form.yearsOfExperience) : undefined,
      hourlyRate: form.hourlyRate || undefined,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-sm w-full mx-4">
          <CardContent className="p-8 text-center space-y-4">
            <User className="w-12 h-12 text-primary mx-auto" />
            <h2 className="text-xl font-bold">Inicia sesión para registrarte</h2>
            <p className="text-muted-foreground text-sm">Necesitas una cuenta para registrarte como profesional.</p>
            <a href={getLoginUrl()}>
              <Button className="w-full gradient-brand text-white border-0">Iniciar sesión</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-10 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "Poppins, sans-serif" }}>
                ¡Solicitud enviada!
              </h2>
              <p className="text-muted-foreground">
                Tu solicitud ha sido recibida. El equipo de Inteira revisará tu información y te notificará por email cuando sea aprobada.
              </p>
            </div>
            <div className="bg-primary/5 rounded-xl p-4 text-left text-sm space-y-2">
              <p className="font-semibold text-primary">¿Qué sigue?</p>
              <p className="text-muted-foreground">1. Revisión de tu cédula profesional</p>
              <p className="text-muted-foreground">2. Verificación de credenciales</p>
              <p className="text-muted-foreground">3. Notificación de aprobación por email</p>
            </div>
            <Link href="/">
              <Button className="w-full gradient-brand text-white border-0">Volver al inicio</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-hero text-white py-10">
        <div className="container">
          <Link href="/">
            <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 mb-4 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
            </Button>
          </Link>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
            Regístrate como profesional
          </h1>
          <p className="text-white/80 mt-2 max-w-lg">
            Únete a la red de especialistas de Inteira y conecta con pacientes que necesitan tu ayuda.
          </p>
        </div>
      </div>

      <div className="container py-10">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Especialidad */}
            <Card className="border-border">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-5 h-5 text-primary" />
                  <h2 className="font-bold">Especialidad y credenciales</h2>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Especialidad <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.specialtyId}
                    onChange={(e) => setForm({ ...form, specialtyId: e.target.value })}
                    required
                    className="w-full rounded-xl border border-border p-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    <option value="">Selecciona una especialidad</option>
                    {(specialties ?? []).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Número de cédula profesional <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.licenseNumber}
                    onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                    placeholder="Ej: 12345678"
                    required
                    className="w-full rounded-xl border border-border p-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Años de experiencia</label>
                    <input
                      type="number"
                      value={form.yearsOfExperience}
                      onChange={(e) => setForm({ ...form, yearsOfExperience: e.target.value })}
                      placeholder="5"
                      min="0"
                      max="60"
                      className="w-full rounded-xl border border-border p-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Tarifa por hora (MXN)</label>
                    <input
                      type="text"
                      value={form.hourlyRate}
                      onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
                      placeholder="500"
                      className="w-full rounded-xl border border-border p-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Perfil */}
            <Card className="border-border">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-5 h-5 text-primary" />
                  <h2 className="font-bold">Perfil profesional</h2>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Biografía profesional</label>
                  <textarea
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="Cuéntanos sobre tu experiencia, enfoque y metodología de trabajo..."
                    className="w-full rounded-xl border border-border p-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary min-h-[120px] resize-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Formación académica</label>
                  <textarea
                    value={form.education}
                    onChange={(e) => setForm({ ...form, education: e.target.value })}
                    placeholder="Universidad, título, año de graduación..."
                    className="w-full rounded-xl border border-border p-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary min-h-[80px] resize-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Certificaciones y cursos</label>
                  <textarea
                    value={form.certifications}
                    onChange={(e) => setForm({ ...form, certifications: e.target.value })}
                    placeholder="Lista tus certificaciones, cursos especializados, diplomados..."
                    className="w-full rounded-xl border border-border p-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary min-h-[80px] resize-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Idiomas</label>
                  <input
                    type="text"
                    value={form.languages}
                    onChange={(e) => setForm({ ...form, languages: e.target.value })}
                    placeholder="Español, Inglés..."
                    className="w-full rounded-xl border border-border p-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Documentos */}
            <Card className="border-border border-dashed">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-primary" />
                  <h2 className="font-bold">Documentos de verificación</h2>
                </div>
                <div className="bg-primary/5 rounded-xl p-4 text-center">
                  <Upload className="w-8 h-8 text-primary/50 mx-auto mb-2" />
                  <p className="text-sm font-medium">Sube tu cédula profesional y certificados</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    La subida de documentos estará disponible una vez que tu solicitud sea aprobada.
                    El equipo de Inteira te contactará para solicitar los documentos necesarios.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="space-y-3">
              <Button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full gradient-brand text-white border-0 shadow-lg shadow-primary/30 h-12 text-base"
              >
                {registerMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Enviando solicitud...
                  </div>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Enviar solicitud de registro
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Al enviar tu solicitud, aceptas los términos y condiciones de Inteira para profesionales.
                Tu información será revisada en un plazo de 24-48 horas hábiles.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
