import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  CheckCircle2,
  Upload,
  User,
  ArrowLeft,
  Camera,
  Clock,
  Briefcase,
  Shield,
} from "lucide-react";
import { Link, useLocation } from "wouter";

// ── File upload helper ────────────────────────────────────────────────────────
async function uploadFile(file: File): Promise<string> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const res = await fetch("/api/upload/professional-file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ base64, mimeType: file.type, fileName: file.name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? "Error al subir archivo");
  }
  const data = await res.json();
  return data.url as string;
}

// ── FileUploadField ───────────────────────────────────────────────────────────
interface FileUploadFieldProps {
  label: string;
  description: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
  badge?: React.ReactNode;
}

function FileUploadField({ label, description, accept, file, onChange, required, badge }: FileUploadFieldProps) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center gap-2">
          <Label className="text-sm font-semibold text-foreground">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {badge}
        </div>
      )}
      <div
        className="border-2 border-dashed border-border rounded-xl p-4 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
        onClick={() => ref.current?.click()}
      >
        <input
          ref={ref}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors flex-shrink-0">
            <Upload className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            {file ? (
              <>
                <p className="text-sm font-medium text-primary truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(file.size / 1024).toFixed(1)} KB — Haz clic para cambiar
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">
                  <span className="text-primary">Subir archivo</span> o arrastra aquí
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RegisterProfessional() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    gender: "",
    email: "",
    specialtyId: "",
    especialidad: "",
    bio: "",
    yearsOfExperience: "",
    education: "",
    licenseNumber: "",
  });

  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [identityDoc, setIdentityDoc] = useState<File | null>(null);
  const [certifications, setCertifications] = useState<File | null>(null);

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

  const handleChange = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handlePhotoChange = (file: File | null) => {
    setProfilePhoto(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setPhotoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName) return toast.error("Nombre y apellido son obligatorios");
    if (!form.specialtyId) return toast.error("Selecciona la especialidad en la plataforma");
    if (!form.bio.trim()) return toast.error("La descripción profesional es obligatoria");
    if (!profilePhoto) return toast.error("La foto de perfil es obligatoria");
    if (!identityDoc) return toast.error("El documento de identidad es obligatorio");

    setUploading(true);
    try {
      const profilePhotoUrl = await uploadFile(profilePhoto);
      const identityDocUrl = await uploadFile(identityDoc);
      let certificationsUrl: string | undefined;
      if (certifications) certificationsUrl = await uploadFile(certifications);

      console.log("[Register] specialtyId enviado:", form.specialtyId, "→ parseInt:", parseInt(form.specialtyId));
      registerMutation.mutate({
        specialtyId: parseInt(form.specialtyId),
        licenseNumber: form.licenseNumber.trim() || undefined,
        licenseDocument: identityDocUrl,
        bio: form.bio || undefined,
        education: form.education || undefined,
        certifications: certificationsUrl,
        yearsOfExperience: form.yearsOfExperience ? parseInt(form.yearsOfExperience) : undefined,
        profilePhoto: profilePhotoUrl,
        fullName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim() || undefined,
      });
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Error al subir archivos");
    } finally {
      setUploading(false);
    }
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
              <Button className="w-full bg-primary hover:bg-primary/90 text-white">Iniciar sesión</Button>
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
              Tu solicitud ha sido recibida. El equipo de inteira revisará tu perfil y documentos.
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              Recibirás un correo cuando tu cuenta sea aprobada o si se necesita información adicional.
            </p>
            <Link href="/">
              <Button className="bg-primary hover:bg-primary/90 text-white">Volver al inicio</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSubmitting = uploading || registerMutation.isPending;

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
                    <Label htmlFor="firstName">Nombre <span className="text-red-500">*</span></Label>
                    <Input id="firstName" placeholder="Nombre de pila" value={form.firstName}
                      onChange={(e) => handleChange("firstName", e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Apellido <span className="text-red-500">*</span></Label>
                    <Input id="lastName" placeholder="Apellido" value={form.lastName}
                      onChange={(e) => handleChange("lastName", e.target.value)} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Nombre de usuario <span className="text-red-500">*</span></Label>
                    <Input id="username" placeholder="@usuario" value={form.username}
                      onChange={(e) => handleChange("username", e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input id="email" type="email" placeholder="correo@ejemplo.com" value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Género</Label>
                  <div className="flex gap-6 pt-1">
                    {["Masculino", "Femenino", "Prefiero no decir"].map((g) => (
                      <label key={g} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="gender" value={g} checked={form.gender === g}
                          onChange={() => handleChange("gender", g)} className="accent-primary" />
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
                    <Briefcase className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground" style={{ fontFamily: "Poppins, sans-serif" }}>
                    Especialidad profesional
                  </h3>
                </div>

                <div className="space-y-2">
                  <Label>Especialidad en Inteira <span className="text-red-500">*</span></Label>
                  <Select
                    value={form.specialtyId}
                    onValueChange={(v) => handleChange("specialtyId", v)}
                    disabled={!specialties}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !specialties ? "Cargando especialidades..." :
                        specialties.length === 0 ? "No hay especialidades disponibles" :
                        "Selecciona la especialidad de la plataforma"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {(specialties ?? []).map((s: any) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {specialties && specialties.length === 0 ? (
                    <p className="text-xs text-destructive">
                      No hay especialidades disponibles. Contacta al administrador.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      La categoría bajo la que aparecerás en la plataforma para los usuarios.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="especialidad">Especialidad específica</Label>
                  <Input id="especialidad" placeholder="Ej: Terapia cognitivo-conductual, Derecho laboral..."
                    value={form.especialidad} onChange={(e) => handleChange("especialidad", e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Descripción profesional <span className="text-red-500">*</span></Label>
                  <Textarea id="bio" placeholder="Describe tu experiencia, enfoque y cómo puedes ayudar a tus clientes..."
                    value={form.bio} onChange={(e) => handleChange("bio", e.target.value)} rows={4} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="yearsOfExperience">
                      <Clock className="w-4 h-4 inline mr-1 text-primary" />
                      Años de experiencia
                    </Label>
                    <Input id="yearsOfExperience" type="number" min="0" max="60" placeholder="Ej: 5"
                      value={form.yearsOfExperience} onChange={(e) => handleChange("yearsOfExperience", e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="education">Formación académica</Label>
                  <Textarea id="education" placeholder="Ej: Licenciatura en Psicología, UNAM. Maestría en Psicoterapia..."
                    value={form.education} onChange={(e) => handleChange("education", e.target.value)} rows={3} />
                </div>
              </CardContent>
            </Card>

            {/* ── Sección 3: Documentos (dinámica) ── */}
            <Card className="border-border">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground" style={{ fontFamily: "Poppins, sans-serif" }}>
                      Documentos de verificación
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Revisados por el equipo de inteira antes de aprobar tu perfil.
                    </p>
                  </div>
                </div>

                {/* Photo — always required */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-foreground">
                    Foto de perfil <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center gap-5">
                    <div className="relative flex-shrink-0">
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-primary/10 border-2 border-dashed border-primary/30 flex items-center justify-center">
                        {photoPreview ? (
                          <img src={photoPreview} alt="Vista previa" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="w-7 h-7 text-primary/50" />
                        )}
                      </div>
                      {photoPreview && (
                        <button type="button" onClick={() => handlePhotoChange(null)}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center hover:bg-destructive/80">
                          ×
                        </button>
                      )}
                    </div>
                    <div className="flex-1">
                      <FileUploadField label="" description="JPG, PNG o WEBP — máximo 5 MB"
                        accept="image/jpeg,image/png,image/webp" file={profilePhoto} onChange={handlePhotoChange} />
                    </div>
                  </div>
                </div>

                {/* Identity doc — always required */}
                <FileUploadField
                  label="Documento de identidad"
                  description="INE, pasaporte o cédula — PDF, JPG o PNG — máximo 10 MB"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  file={identityDoc}
                  onChange={setIdentityDoc}
                  required
                />

                {/* Cédula profesional (opcional) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="licenseNumber" className="text-sm font-semibold">
                      Número de cédula profesional
                    </Label>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      Opcional — da más confianza
                    </span>
                  </div>
                  <Input id="licenseNumber" placeholder="Ej: 12345678 (opcional)"
                    value={form.licenseNumber} onChange={(e) => handleChange("licenseNumber", e.target.value)} />
                </div>

                {/* Certificaciones (opcional) */}
                <FileUploadField
                  label="Certificaciones y títulos"
                  description="PDF, JPG o PNG — máximo 10 MB (opcional)"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  file={certifications}
                  onChange={setCertifications}
                />
              </CardContent>
            </Card>

            {/* ── Submit ── */}
            <div className="pb-8">
              <Button type="submit" disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/90 text-white h-12 text-base font-semibold rounded-xl">
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    {uploading ? "Subiendo archivos..." : "Enviando solicitud..."}
                  </span>
                ) : "Enviar solicitud"}
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-3">
                Al enviar, aceptas los{" "}
                <a href="#" className="text-primary hover:underline">términos y condiciones</a>{" "}
                de inteira para asesores.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
