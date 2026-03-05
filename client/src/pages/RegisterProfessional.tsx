import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  CheckCircle2,
  Upload,
  User,
  FileText,
  ArrowLeft,
  Camera,
  Award,
  CreditCard,
  Clock,
  DollarSign,
} from "lucide-react";
import { Link, useLocation } from "wouter";

interface FileUploadFieldProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
}

function FileUploadField({ label, description, icon, accept, file, onChange }: FileUploadFieldProps) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-foreground">{label}</Label>
      <div
        className="border-2 border-dashed border-border rounded-xl p-5 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
        onClick={() => ref.current?.click()}
      >
        <input
          ref={ref}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors flex-shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            {file ? (
              <div>
                <p className="text-sm font-medium text-primary truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(file.size / 1024).toFixed(1)} KB — Haz clic para cambiar
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-foreground">
                  <span className="text-primary">Subir archivo</span> o arrastra aquí
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
            )}
          </div>
          <Upload className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}

export default function RegisterProfessional() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [submitted, setSubmitted] = useState(false);

  // Form fields matching inteira.mx/registro-de-asesor
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    gender: "",
    campo: "",           // "Selecciona tu Campo" — la especialidad principal
    especialidad: "",    // sub-especialidad libre
    bio: "",
    email: "",
    licenseNumber: "",
    yearsOfExperience: "",
    hourlyRate: "",
    education: "",
    languages: "Español",
  });

  // File uploads
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [certifications, setCertifications] = useState<File | null>(null);
  const [identityDoc, setIdentityDoc] = useState<File | null>(null);

  const { data: specialties } = trpc.specialty.getAll.useQuery();

  const registerMutation = trpc.professional.register.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Solicitud enviada. El equipo de inteira revisará tu perfil.");
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message ?? "Error al enviar la solicitud");
    },
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.campo) {
      toast.error("Selecciona tu campo de especialidad");
      return;
    }
    if (!form.firstName || !form.lastName) {
      toast.error("Nombre y apellido son obligatorios");
      return;
    }
    if (!form.licenseNumber) {
      toast.error("El número de cédula profesional es obligatorio");
      return;
    }

    // Find the specialty ID from the selected campo
    const selectedSpecialty = specialties?.find(
      (s) => s.name === form.campo
    );

    registerMutation.mutate({
      specialtyId: selectedSpecialty?.id ?? 1,
      licenseNumber: form.licenseNumber,
      bio: form.bio || undefined,
      education: form.education || undefined,
      certifications: certifications?.name || undefined,
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
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full border-border">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: "Poppins, sans-serif" }}>
              Inicia sesión para continuar
            </h2>
            <p className="text-muted-foreground mb-6 text-sm">
              Necesitas una cuenta para registrarte como asesor en inteira.
            </p>
            <a href={getLoginUrl()}>
              <Button className="w-full bg-primary hover:bg-primary/90 text-white">
                Iniciar sesión
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-lg w-full border-border">
          <CardContent className="p-10 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>
              Solicitud enviada
            </h2>
            <p className="text-muted-foreground mb-2">
              Tu solicitud de registro como asesor ha sido recibida. El equipo de inteira revisará tu perfil y documentos.
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              Recibirás un correo electrónico cuando tu cuenta sea aprobada o si se necesita información adicional.
            </p>
            <Link href="/">
              <Button className="bg-primary hover:bg-primary/90 text-white">
                Volver al inicio
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-[#607562] text-white py-10">
        <div className="container">
          <Link href="/">
            <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 mb-4 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Inicio
            </Button>
          </Link>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
            Registro de asesor
          </h1>
          <p className="text-white/80 mt-2 max-w-xl">
            Completa el formulario para unirte a la red de asesores de inteira. Tu solicitud será revisada por nuestro equipo.
          </p>
        </div>
      </div>

      <div className="container py-10">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-8">

            {/* ── Sección 1: Datos personales ── */}
            <Card className="border-border">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground" style={{ fontFamily: "Poppins, sans-serif" }}>
                    Datos personales
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nombre de pila <span className="text-red-500">*</span></Label>
                    <Input
                      id="firstName"
                      placeholder="Nombre de pila"
                      value={form.firstName}
                      onChange={(e) => handleChange("firstName", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Apellido <span className="text-red-500">*</span></Label>
                    <Input
                      id="lastName"
                      placeholder="Apellido"
                      value={form.lastName}
                      onChange={(e) => handleChange("lastName", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Nombre de usuario <span className="text-red-500">*</span></Label>
                  <Input
                    id="username"
                    placeholder="Nombre de usuario"
                    value={form.username}
                    onChange={(e) => handleChange("username", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Género</Label>
                  <div className="flex gap-6 pt-1">
                    {["Masculino", "Femenino", "Prefiero no decir"].map((g) => (
                      <label key={g} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          value={g}
                          checked={form.gender === g}
                          onChange={() => handleChange("gender", g)}
                          className="accent-primary"
                        />
                        <span className="text-sm text-foreground">{g}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Sección 2: Especialidad ── */}
            <Card className="border-border">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Award className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground" style={{ fontFamily: "Poppins, sans-serif" }}>
                    Especialidad profesional
                  </h3>
                </div>

                <div className="space-y-2">
                  <Label>Selecciona tu Campo <span className="text-red-500">*</span></Label>
                  <Select value={form.campo} onValueChange={(v) => handleChange("campo", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tu Campo" />
                    </SelectTrigger>
                    <SelectContent>
                      {(specialties ?? [
                        { id: 1, name: "Psicología" },
                        { id: 2, name: "Emprendimiento" },
                        { id: 3, name: "Finanzas" },
                        { id: 4, name: "Idiomas" },
                        { id: 5, name: "Imagen Personal" },
                        { id: 6, name: "Legal" },
                        { id: 7, name: "Vocación" },
                      ]).map((s) => (
                        <SelectItem key={s.id} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="especialidad">Especialidad específica</Label>
                  <Input
                    id="especialidad"
                    placeholder="Ej: Terapia cognitivo-conductual, Derecho laboral..."
                    value={form.especialidad}
                    onChange={(e) => handleChange("especialidad", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Breve descripción <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="bio"
                    placeholder="Breve descripción de tu experiencia y enfoque profesional..."
                    value={form.bio}
                    onChange={(e) => handleChange("bio", e.target.value)}
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="yearsOfExperience">
                      <Clock className="w-4 h-4 inline mr-1 text-primary" />
                      Años de experiencia
                    </Label>
                    <Input
                      id="yearsOfExperience"
                      type="number"
                      min="0"
                      max="60"
                      placeholder="Ej: 5"
                      value={form.yearsOfExperience}
                      onChange={(e) => handleChange("yearsOfExperience", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">
                      <DollarSign className="w-4 h-4 inline mr-1 text-primary" />
                      Tarifa por sesión (MXN)
                    </Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      min="0"
                      placeholder="Ej: 800"
                      value={form.hourlyRate}
                      onChange={(e) => handleChange("hourlyRate", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="education">Formación académica</Label>
                  <Textarea
                    id="education"
                    placeholder="Ej: Licenciatura en Psicología, UNAM. Maestría en Psicoterapia Cognitiva..."
                    value={form.education}
                    onChange={(e) => handleChange("education", e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* ── Sección 3: Documentos ── */}
            <Card className="border-border">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground" style={{ fontFamily: "Poppins, sans-serif" }}>
                      Documentos de verificación
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Los documentos son revisados por el equipo de inteira antes de aprobar tu perfil.
                    </p>
                  </div>
                </div>

                <FileUploadField
                  label="Foto de perfil"
                  description="JPG, PNG o WEBP — máximo 5 MB"
                  icon={<Camera className="w-5 h-5" />}
                  accept="image/*"
                  file={profilePhoto}
                  onChange={setProfilePhoto}
                />

                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">
                    Número de cédula profesional <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="licenseNumber"
                    placeholder="Ej: 12345678"
                    value={form.licenseNumber}
                    onChange={(e) => handleChange("licenseNumber", e.target.value)}
                    required
                  />
                </div>

                <FileUploadField
                  label="Certificaciones y títulos"
                  description="PDF, JPG o PNG — máximo 10 MB"
                  icon={<Award className="w-5 h-5" />}
                  accept=".pdf,image/*"
                  file={certifications}
                  onChange={setCertifications}
                />

                <FileUploadField
                  label="Documento de identidad"
                  description="INE, pasaporte o cédula — PDF, JPG o PNG — máximo 10 MB"
                  icon={<CreditCard className="w-5 h-5" />}
                  accept=".pdf,image/*"
                  file={identityDoc}
                  onChange={setIdentityDoc}
                />
              </CardContent>
            </Card>

            {/* ── Submit ── */}
            <div className="pb-8">
              <Button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full bg-primary hover:bg-primary/90 text-white h-12 text-base font-semibold rounded-xl"
              >
                {registerMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Enviando solicitud...
                  </span>
                ) : (
                  "Enviar solicitud"
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-3">
                Al enviar, aceptas los{" "}
                <a href="#" className="text-primary hover:underline">
                  términos y condiciones
                </a>{" "}
                de inteira para asesores.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
