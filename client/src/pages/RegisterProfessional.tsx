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
  const res = await fetch("/api/upload/professional-photo", {
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
export default function RegisterProfessional({ embedded = false }: { embedded?: boolean } = {}) {
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
    bio: "",
    yearsOfExperience: "",
    education: "",
    licenseNumber: "",
    documentNationality: "",
  });

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [professionalLicense, setProfessionalLicense] = useState<File | null>(null);
  const [identityDoc, setIdentityDoc] = useState<File | null>(null);
  const [certifications, setCertifications] = useState<File | null>(null);
  const [showLicenseConfirm, setShowLicenseConfirm] = useState(false);
  const [pendingLicenseFile, setPendingLicenseFile] = useState<File | null>(null);

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

  const registerNewMutation = trpc.professional.registerNew.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Solicitud enviada. Recibirás un correo cuando sea aprobada.");
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
    if (!isAuthenticated && !form.email.trim()) return toast.error("El email es obligatorio");
    if (!isAuthenticated && password.length < 8) return toast.error("La contraseña debe tener al menos 8 caracteres");
    if (!isAuthenticated && password !== passwordConfirm) return toast.error("Las contraseñas no coinciden");
    if (!form.specialtyId) return toast.error("Selecciona la especialidad en la plataforma");
    if (!form.bio.trim()) return toast.error("La descripción profesional es obligatoria");
    if (!profilePhoto) return toast.error("La foto de perfil es obligatoria");
    if (!identityDoc) return toast.error("El documento de identidad ciudadana es obligatorio");

    setUploading(true);
    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    try {
      const profilePhotoUrl = await uploadFile(profilePhoto);
      let professionalLicenseUrl: string | undefined;
      if (professionalLicense) professionalLicenseUrl = await uploadFile(professionalLicense);
      const identityDocUrl = await uploadFile(identityDoc);
      let certificationsUrl: string | undefined;
      if (certifications) certificationsUrl = await uploadFile(certifications);

      const payload = {
        specialtyId: parseInt(form.specialtyId),
        licenseNumber: form.licenseNumber.trim() || undefined,
        licenseDocument: professionalLicenseUrl,
        identityDocUrl,
        documentNationality: form.documentNationality || undefined,
        bio: form.bio || undefined,
        education: form.education || undefined,
        certifications: certificationsUrl,
        yearsOfExperience: form.yearsOfExperience ? parseInt(form.yearsOfExperience) : undefined,
        profilePhoto: profilePhotoUrl,
        fullName: fullName || undefined,
      };

      if (isAuthenticated) {
        registerMutation.mutate(payload);
      } else {
        registerNewMutation.mutate({ ...payload, email: form.email.trim(), fullName, password: password || undefined });
      }
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Error al subir archivos");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    if (embedded) return (
      <div className="flex justify-center py-10">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (submitted) {
    if (embedded) return (
      <div className="py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: "Poppins, sans-serif" }}>
          ¡Solicitud enviada!
        </h3>
        <p className="text-muted-foreground text-sm">
          Recibirás un correo cuando tu cuenta sea aprobada.
        </p>
      </div>
    );
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

  const isSubmitting = uploading || registerMutation.isPending || registerNewMutation.isPending;

  // ── Embedded layout (used inside landing page) ────────────────────────────
  if (embedded) return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Fila 1: Nombre | Apellido */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="e-firstName">Nombre <span className="text-red-500">*</span></Label>
            <Input id="e-firstName" placeholder="Nombre de pila" value={form.firstName}
              onChange={(e) => handleChange("firstName", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-lastName">Apellido <span className="text-red-500">*</span></Label>
            <Input id="e-lastName" placeholder="Apellido" value={form.lastName}
              onChange={(e) => handleChange("lastName", e.target.value)} />
          </div>
        </div>

        {/* Fila 2: Email | Username */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="e-email">Correo electrónico <span className="text-red-500">*</span></Label>
            <Input id="e-email" type="email" placeholder="tu@email.com" value={form.email}
              onChange={(e) => handleChange("email", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-username">Nombre de usuario</Label>
            <Input id="e-username" placeholder="@usuario" value={form.username}
              onChange={(e) => handleChange("username", e.target.value)} />
          </div>
        </div>

        {/* Fila 2b: Contraseña (solo usuarios no autenticados) */}
        {!isAuthenticated && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="e-password">Contraseña <span className="text-red-500">*</span></Label>
              <Input id="e-password" type="password" placeholder="Mínimo 8 caracteres"
                value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-passwordConfirm">Confirmar contraseña <span className="text-red-500">*</span></Label>
              <Input id="e-passwordConfirm" type="password" placeholder="Repite tu contraseña"
                value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} minLength={8} required />
            </div>
          </div>
        )}

        {/* Fila 3: Especialidad | Años de experiencia */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Especialidad en Inteira <span className="text-red-500">*</span></Label>
            <Select value={form.specialtyId} onValueChange={(v) => handleChange("specialtyId", v)} disabled={!specialties}>
              <SelectTrigger>
                <SelectValue placeholder={!specialties ? "Cargando..." : "Selecciona tu especialidad"} />
              </SelectTrigger>
              <SelectContent>
                {(specialties ?? []).map((s: any) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-years">Años de experiencia</Label>
            <Input id="e-years" type="number" min="0" max="60" placeholder="Ej: 5"
              value={form.yearsOfExperience} onChange={(e) => handleChange("yearsOfExperience", e.target.value)} />
          </div>
        </div>

        {/* Fila 4: Género | Licencia profesional (archivo) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Género</Label>
            <div className="flex flex-wrap gap-4 pt-1">
              {["Masculino", "Femenino", "Prefiero no decir"].map((g) => (
                <label key={g} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="e-gender" value={g} checked={form.gender === g}
                    onChange={() => handleChange("gender", g)} className="accent-primary" />
                  <span className="text-sm text-foreground">{g}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Cédula profesional (archivo)</Label>
            <FileUploadField label="" description="PDF, JPG o PNG — máx 10 MB (opcional)"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              file={professionalLicense}
              onChange={(file) => {
                if (file) { setPendingLicenseFile(file); setShowLicenseConfirm(true); }
                else { setProfessionalLicense(null); }
              }} />
          </div>
        </div>

        {/* Fila 5: Educación (full width) */}
        <div className="space-y-2">
          <Label htmlFor="e-education">Formación académica</Label>
          <Textarea id="e-education" placeholder="Ej: Licenciatura en Psicología, UNAM. Maestría en Psicoterapia..." rows={3}
            value={form.education} onChange={(e) => handleChange("education", e.target.value)} />
        </div>

        {/* Fila 6: Bio (full width) */}
        <div className="space-y-2">
          <Label htmlFor="e-bio">Descripción profesional <span className="text-red-500">*</span></Label>
          <Textarea id="e-bio" placeholder="Describe tu experiencia, enfoque y cómo puedes ayudar a tus clientes..." rows={4}
            value={form.bio} onChange={(e) => handleChange("bio", e.target.value)} />
        </div>

        {/* Fila 7: Foto de perfil | Documento de identidad */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Foto de perfil <span className="text-red-500">*</span></Label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-primary/10 border-2 border-dashed border-primary/30 flex items-center justify-center flex-shrink-0">
                {photoPreview ? (
                  <img src={photoPreview} alt="Vista previa" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-5 h-5 text-primary/50" />
                )}
              </div>
              <div className="flex-1">
                <FileUploadField label="" description="JPG, PNG o WEBP — máx 5 MB"
                  accept="image/jpeg,image/png,image/webp" file={profilePhoto} onChange={handlePhotoChange} />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Identificación oficial <span className="text-red-500">*</span></Label>
            <FileUploadField label="" description="INE, pasaporte o cédula — PDF, JPG o PNG — máx 10 MB"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              file={identityDoc} onChange={setIdentityDoc} required />
          </div>
        </div>

        {/* Fila 8: Número de cédula | Nacionalidad */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="e-licenseNumber">Número de cédula profesional</Label>
            <Input id="e-licenseNumber" placeholder="Ej: 12345678 — Cédula SEP (no CURP)"
              value={form.licenseNumber} onChange={(e) => handleChange("licenseNumber", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>País del documento de identidad <span className="text-red-500">*</span></Label>
            <select value={form.documentNationality} onChange={(e) => handleChange("documentNationality", e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
              <option value="">Selecciona el país</option>
              {["México","Colombia","Argentina","Chile","Perú","Venezuela","Ecuador","Bolivia","Paraguay","Uruguay","Costa Rica","Guatemala","Honduras","El Salvador","Nicaragua","Panamá","Cuba","República Dominicana","España","Otro"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Fila 9: Certificaciones (full width) */}
        <FileUploadField
          label="Certificaciones y títulos"
          description="PDF, JPG o PNG — máximo 10 MB (opcional)"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          file={certifications} onChange={setCertifications} />

        {/* CTA */}
        <div className="flex justify-center pt-4">
          <Button type="submit" disabled={isSubmitting}
            className="w-full h-12 text-base font-semibold rounded-xl text-white border-0 hover:opacity-90 transition-opacity"
            style={{ background: "#A7774E" }}>
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                {uploading ? "Subiendo archivos..." : "Enviando solicitud..."}
              </span>
            ) : "Enviar solicitud →"}
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Al enviar, aceptas los{" "}
          <a href="#" className="text-primary hover:underline">términos y condiciones</a>{" "}
          de inteira para asesores.
        </p>
      </form>

      {/* Modal confirmación cédula profesional */}
      {showLicenseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-base" style={{ fontFamily: "Poppins, sans-serif" }}>
              Confirma tu documento
            </h3>
            <p className="text-sm text-muted-foreground">
              Este campo es exclusivamente para tu <strong>CÉDULA PROFESIONAL</strong> que acredita tu título universitario. No es para tu documento de identidad ciudadana (INE, pasaporte, cédula de ciudadanía).
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="ghost" size="sm"
                onClick={() => { setPendingLicenseFile(null); setShowLicenseConfirm(false); }}>
                Cambiar documento
              </Button>
              <Button type="button" size="sm" className="bg-primary hover:bg-primary/90 text-white border-0"
                onClick={() => { setProfessionalLicense(pendingLicenseFile); setPendingLicenseFile(null); setShowLicenseConfirm(false); }}>
                Sí, es mi cédula profesional
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // ── Standalone layout ─────────────────────────────────────────────────────
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

            {/* ── Email (solo usuarios no autenticados) ── */}
            {!isAuthenticated && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground" style={{ fontFamily: "Poppins, sans-serif" }}>
                        Crea tu cuenta
                      </h3>
                      <p className="text-xs text-muted-foreground">Ingresa tu email para registrarte</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Contraseña <span className="text-red-500">*</span></Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Mínimo 8 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={8}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passwordConfirm">Confirmar contraseña <span className="text-red-500">*</span></Label>
                      <Input
                        id="passwordConfirm"
                        type="password"
                        placeholder="Repite tu contraseña"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        minLength={8}
                        required
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ¿Ya tienes cuenta?{" "}
                    <a href="/login" className="text-primary hover:underline font-medium">
                      Inicia sesión
                    </a>
                    {" "}y vuelve a este formulario.
                  </p>
                </CardContent>
              </Card>
            )}

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

                {/* Nacionalidad del documento */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    País del documento de identidad <span className="text-red-500">*</span>
                  </Label>
                  <select
                    value={form.documentNationality}
                    onChange={(e) => handleChange("documentNationality", e.target.value)}
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    <option value="">Selecciona el país del documento</option>
                    {["México","Colombia","Argentina","Chile","Perú","Venezuela","Ecuador","Bolivia","Paraguay","Uruguay","Costa Rica","Guatemala","Honduras","El Salvador","Nicaragua","Panamá","Cuba","República Dominicana","España","Otro"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Cédula profesional (con popup de confirmación) */}
                <FileUploadField
                  label="Cédula profesional"
                  description="Documento que acredita tu título universitario — PDF, JPG o PNG — máximo 10 MB (opcional)"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  file={professionalLicense}
                  onChange={(file) => {
                    if (file) {
                      setPendingLicenseFile(file);
                      setShowLicenseConfirm(true);
                    } else {
                      setProfessionalLicense(null);
                    }
                  }}
                />

                {/* Identificación oficial — obligatoria */}
                <FileUploadField
                  label="Identificación oficial"
                  description="INE, pasaporte o cédula de ciudadanía — PDF, JPG o PNG — máximo 10 MB"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  file={identityDoc}
                  onChange={setIdentityDoc}
                  required
                />

                {/* Número de cédula (opcional) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="licenseNumber" className="text-sm font-semibold">
                      Número de cédula profesional
                    </Label>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      Opcional — da más confianza
                    </span>
                  </div>
                  <Input id="licenseNumber" placeholder="Ej: 12345678 — Cédula SEP (no CURP)"
                    value={form.licenseNumber} onChange={(e) => handleChange("licenseNumber", e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-1">
                    Este es el número de cédula profesional emitido por la SEP que certifica tu título universitario —{" "}
                    <strong> no es tu CURP ni tu cédula de identidad personal</strong>.{" "}
                    Puedes verificarlo en <a href="https://cedulaprofesional.sep.gob.mx" target="_blank" className="text-primary underline">cedulaprofesional.sep.gob.mx</a>
                  </p>
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

            {/* ── Modal confirmación cédula profesional ── */}
            {showLicenseConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                  <h3 className="font-bold text-base" style={{ fontFamily: "Poppins, sans-serif" }}>
                    Confirma tu documento
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Este campo es exclusivamente para tu <strong>CÉDULA PROFESIONAL</strong> que acredita tu título universitario. No es para tu documento de identidad ciudadana (INE, pasaporte, cédula de ciudadanía).
                  </p>
                  <div className="flex gap-2 justify-end pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { setPendingLicenseFile(null); setShowLicenseConfirm(false); }}
                    >
                      Cambiar documento
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-white border-0"
                      onClick={() => { setProfessionalLicense(pendingLicenseFile); setPendingLicenseFile(null); setShowLicenseConfirm(false); }}
                    >
                      Sí, es mi cédula profesional
                    </Button>
                  </div>
                </div>
              </div>
            )}

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
