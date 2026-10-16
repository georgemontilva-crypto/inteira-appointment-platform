import { useState, useRef } from "react";
import { LocationSelect } from "@/components/LocationSelect";
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
  MapPin,
  Compass,
  Heart,
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

// ── Bloques del registro ──────────────────────────────────────────────────────
// Se renderizan igual en la versión embebida y en la página completa, para que
// un campo nuevo no haya que escribirlo dos veces.

type FormState = Record<string, string>;
interface BlockProps {
  form: FormState;
  onChange: (field: string, value: string) => void;
}

function RadioRow({
  name, value, options, onPick,
}: {
  name: string;
  value: string;
  options: { value: string; label: string }[];
  onPick: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <label
            key={o.value}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm cursor-pointer transition-colors ${
              active
                ? "border-primary bg-primary/5 text-foreground font-medium"
                : "border-border hover:bg-muted/50 text-muted-foreground"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={active}
              onChange={() => onPick(o.value)}
              className="accent-primary"
            />
            {o.label}
          </label>
        );
      })}
    </div>
  );
}

/** Si ejerce, si ha dado asesorías, y en qué modalidad puede atender. */
function ExperienceBlock({ form, onChange }: BlockProps) {
  const tieneExperiencia = form.hasAdvisoryExperience === "si";
  const atiendePresencial =
    form.sessionModality === "in_person" || form.sessionModality === "both";

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-sm font-semibold">
          ¿Actualmente ejerces tu profesión o especialidad? <span className="text-red-500">*</span>
        </Label>
        <RadioRow
          name="practiceStatus"
          value={form.practiceStatus}
          onPick={(v) => onChange("practiceStatus", v)}
          options={[
            { value: "active", label: "Sí, actualmente" },
            { value: "past", label: "He ejercido, pero actualmente no" },
            { value: "not_yet", label: "Aún no" },
          ]}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold">
          ¿Tienes experiencia dando asesorías, consultas o acompañamiento en tu área?{" "}
          <span className="text-red-500">*</span>
        </Label>
        <RadioRow
          name="hasAdvisoryExperience"
          value={form.hasAdvisoryExperience}
          onPick={(v) => onChange("hasAdvisoryExperience", v)}
          options={[{ value: "si", label: "Sí" }, { value: "no", label: "No" }]}
        />
      </div>

      {tieneExperiencia && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold">¿Qué tipo de asesoría has brindado?</Label>
          <Textarea
            rows={3}
            value={form.advisoryExperienceDetail}
            onChange={(e) => onChange("advisoryExperienceDetail", e.target.value)}
            placeholder="Cuéntanos qué has hecho y a quiénes has acompañado..."
          />
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-sm font-semibold">
          ¿Tus sesiones pueden ser presenciales y online? <span className="text-red-500">*</span>
        </Label>
        <RadioRow
          name="sessionModality"
          value={form.sessionModality}
          onPick={(v) => onChange("sessionModality", v)}
          options={[
            { value: "online", label: "Solo online" },
            { value: "in_person", label: "Solo presenciales" },
            { value: "both", label: "Presenciales y online" },
          ]}
        />
      </div>

      {atiendePresencial && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Ciudad y zona de atención presencial</Label>
          <Input
            value={form.inPersonArea}
            onChange={(e) => onChange("inPersonArea", e.target.value)}
            placeholder="Indica dónde puedes atender"
          />
        </div>
      )}
    </div>
  );
}

/** Motivación, propósito y metas. */
function PurposeBlock({ form, onChange }: BlockProps) {
  const campos: { key: string; label: string; placeholder: string }[] = [
    {
      key: "motivation",
      label: "¿Qué te interesa de entrar a Inteira?",
      placeholder: "Cuéntanos qué te motiva, qué te gustaría aportar y qué esperas de Inteira...",
    },
    {
      key: "personalPurpose",
      label: "¿Cuál es tu propósito personal?",
      placeholder: "Cuéntanos qué da sentido a lo que haces y cómo quieres ayudar a otras personas...",
    },
    {
      key: "personalGoals",
      label: "¿Cuáles son tus metas personales y profesionales?",
      placeholder: "Comparte las metas que deseas alcanzar...",
    },
    {
      key: "platformObjectives",
      label: "¿Qué objetivos te gustaría lograr al formar parte de Inteira?",
      placeholder: "Escribe tus objetivos concretos dentro de la comunidad...",
    },
  ];
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Queremos conocer qué te motiva.</p>
      {campos.map((c) => (
        <div key={c.key} className="space-y-2">
          <Label className="text-sm font-semibold">
            {c.label} <span className="text-red-500">*</span>
          </Label>
          <Textarea
            rows={3}
            value={form[c.key] ?? ""}
            onChange={(e) => onChange(c.key, e.target.value)}
            placeholder={c.placeholder}
          />
        </div>
      ))}
    </div>
  );
}

const RELIGION_OPTIONS = [
  "Cristiana católica",
  "Cristiana evangélica o protestante",
  "Otra",
  "Ninguna",
  "Prefiero no responder",
];

const BIBLE_VERSIONS = [
  "Reina-Valera 1960",
  "Nueva Versión Internacional",
  "Biblia de Jerusalén",
  "Nueva Biblia de las Américas",
  "Otra",
  "No conozco la versión",
  "Prefiero no responder",
];

/**
 * Creencias y comunidad. Bloque opcional y privado: sin el consentimiento
 * explícito no se muestra ni se envía nada, no aparece en el perfil público y
 * no es criterio de aprobación.
 */
function BeliefsBlock({
  form, onChange, consent, setConsent,
}: BlockProps & { consent: boolean; setConsent: (v: boolean) => void }) {
  const leeBiblia = form.readsBible === "si_regularmente" || form.readsBible === "si_ocasionalmente";
  const versionOtra = form.bibleVersion === "Otra";
  const comparteIglesia = form.churchStatus === "member";

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Preguntas opcionales y privadas.</p>

      <label className="flex items-start gap-2.5 text-sm cursor-pointer rounded-xl border border-border p-3 bg-muted/20">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 accent-primary w-4 h-4 flex-shrink-0"
        />
        <span className="text-muted-foreground leading-snug">
          Deseo responder voluntariamente sobre mis creencias y autorizo su uso privado
          para conocerme mejor, según el{" "}
          <a href="/privacidad" target="_blank" className="text-primary underline">aviso de privacidad</a>.
        </span>
      </label>

      {!consent ? (
        <p className="text-xs text-muted-foreground">
          Si no marcas esta opción, puedes omitir el bloque. Tus respuestas no se
          mostrarán en el perfil público.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">¿Cuál es tu religión?</Label>
            <Select value={form.religion} onValueChange={(v) => onChange("religion", v)}>
              <SelectTrigger><SelectValue placeholder="Selecciona una opción" /></SelectTrigger>
              <SelectContent>
                {RELIGION_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">¿Lees la Biblia?</Label>
            <RadioRow
              name="readsBible"
              value={form.readsBible}
              onPick={(v) => onChange("readsBible", v)}
              options={[
                { value: "si_regularmente", label: "Sí, regularmente" },
                { value: "si_ocasionalmente", label: "Sí, ocasionalmente" },
                { value: "no", label: "No" },
                { value: "prefiero_no_responder", label: "Prefiero no responder" },
              ]}
            />
          </div>

          {leeBiblia && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">¿Cuál Biblia lees?</Label>
              <Select value={form.bibleVersion} onValueChange={(v) => onChange("bibleVersion", v)}>
                <SelectTrigger><SelectValue placeholder="Selecciona la versión o traducción" /></SelectTrigger>
                <SelectContent>
                  {BIBLE_VERSIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
              {versionOtra && (
                <Input
                  value={form.bibleVersionOther}
                  onChange={(e) => onChange("bibleVersionOther", e.target.value)}
                  placeholder="Escribe la versión que lees"
                />
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-semibold">¿A qué iglesia perteneces?</Label>
            <Textarea
              rows={2}
              value={form.church}
              disabled={!comparteIglesia}
              onChange={(e) => { onChange("church", e.target.value); onChange("churchStatus", "member"); }}
              placeholder="Escribe el nombre de tu iglesia o comunidad de fe, si deseas compartirlo..."
            />
            <RadioRow
              name="churchStatus"
              value={form.churchStatus}
              onPick={(v) => { onChange("churchStatus", v); if (v !== "member") onChange("church", ""); }}
              options={[
                { value: "member", label: "Comparto mi iglesia" },
                { value: "none", label: "No pertenezco a una iglesia" },
                { value: "prefer_not", label: "Prefiero no responder" },
              ]}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Estas respuestas no son un requisito de aprobación.
          </p>
        </>
      )}
    </div>
  );
}

/** Las tres confirmaciones obligatorias antes de enviar. */
function ConfirmationBlock({
  acceptTerms, setAcceptTerms,
  acceptPrivacy, setAcceptPrivacy,
  confirmIdentity, setConfirmIdentity,
}: {
  acceptTerms: boolean; setAcceptTerms: (v: boolean) => void;
  acceptPrivacy: boolean; setAcceptPrivacy: (v: boolean) => void;
  confirmIdentity: boolean; setConfirmIdentity: (v: boolean) => void;
}) {
  const items: { checked: boolean; set: (v: boolean) => void; label: React.ReactNode }[] = [
    {
      checked: acceptTerms, set: setAcceptTerms,
      label: <>Acepto los <a href="/terminos" target="_blank" className="text-primary underline">términos y condiciones</a> de inteira para asesores.</>,
    },
    {
      checked: acceptPrivacy, set: setAcceptPrivacy,
      label: <>He leído el <a href="/privacidad" target="_blank" className="text-primary underline">aviso de privacidad</a>.</>,
    },
    {
      checked: confirmIdentity, set: setConfirmIdentity,
      label: <>Confirmo que los datos, documentos y fotografía corresponden a mi persona.</>,
    },
  ];
  return (
    <div className="space-y-3 rounded-xl border border-border p-4 bg-muted/20">
      <p className="text-sm font-semibold">Revisa y envía tu solicitud</p>
      {items.map((it, i) => (
        <label key={i} className="flex items-start gap-2.5 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={it.checked}
            onChange={(e) => it.set(e.target.checked)}
            className="mt-0.5 accent-primary w-4 h-4 flex-shrink-0"
          />
          <span className="text-muted-foreground leading-snug">{it.label}</span>
        </label>
      ))}
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
    // Residencia
    country: "",
    state: "",
    city: "",
    // Experiencia y modalidad
    practiceStatus: "",
    hasAdvisoryExperience: "",
    advisoryExperienceDetail: "",
    sessionModality: "",
    inPersonArea: "",
    // Propósito
    motivation: "",
    personalPurpose: "",
    personalGoals: "",
    platformObjectives: "",
    // Creencias y comunidad (opcional)
    religion: "",
    readsBible: "",
    bibleVersion: "",
    bibleVersionOther: "",
    church: "",
    churchStatus: "",
  });

  // Consentimiento del bloque de creencias
  const [beliefsConsent, setBeliefsConsent] = useState(false);

  // Confirmaciones del paso final
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [confirmIdentity, setConfirmIdentity] = useState(false);

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
    if (!form.country) return toast.error("Selecciona el país donde vives");
    if (!form.state.trim()) return toast.error("Indica tu estado, provincia o región");
    if (!form.city.trim()) return toast.error("Selecciona tu ciudad o municipio");
    if (!form.practiceStatus) return toast.error("Indícanos si ejerces actualmente tu profesión");
    if (!form.hasAdvisoryExperience) return toast.error("Indícanos si tienes experiencia dando asesorías");
    if (!form.sessionModality) return toast.error("Indica en qué modalidad puedes atender");
    if (!form.motivation.trim()) return toast.error("Cuéntanos qué te interesa de entrar a Inteira");
    if (!form.personalPurpose.trim()) return toast.error("Cuéntanos cuál es tu propósito personal");
    if (!form.personalGoals.trim()) return toast.error("Comparte tus metas personales y profesionales");
    if (!form.platformObjectives.trim()) return toast.error("Escribe tus objetivos dentro de Inteira");
    if (!acceptTerms || !acceptPrivacy || !confirmIdentity) {
      return toast.error("Debes aceptar las tres confirmaciones antes de enviar");
    }

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

        country: form.country || undefined,
        state: form.state.trim() || undefined,
        city: form.city.trim() || undefined,

        practiceStatus: (form.practiceStatus || undefined) as "active" | "past" | "not_yet" | undefined,
        hasAdvisoryExperience: form.hasAdvisoryExperience
          ? form.hasAdvisoryExperience === "si"
          : undefined,
        advisoryExperienceDetail: form.advisoryExperienceDetail.trim() || undefined,
        sessionModality: (form.sessionModality || undefined) as "online" | "in_person" | "both" | undefined,
        inPersonArea: form.inPersonArea.trim() || undefined,

        motivation: form.motivation.trim() || undefined,
        personalPurpose: form.personalPurpose.trim() || undefined,
        personalGoals: form.personalGoals.trim() || undefined,
        platformObjectives: form.platformObjectives.trim() || undefined,

        acceptedTerms: acceptTerms && acceptPrivacy && confirmIdentity,

        beliefsConsent,
        religion: beliefsConsent ? (form.religion || undefined) : undefined,
        readsBible: beliefsConsent ? (form.readsBible || undefined) : undefined,
        bibleVersion: beliefsConsent
          ? (form.bibleVersion === "Otra"
              ? (form.bibleVersionOther.trim() || "Otra")
              : (form.bibleVersion || undefined))
          : undefined,
        church: beliefsConsent ? (form.church.trim() || undefined) : undefined,
        churchStatus: beliefsConsent
          ? ((form.churchStatus || undefined) as "member" | "none" | "prefer_not" | undefined)
          : undefined,
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
            <a href="https://inteira.mx/">
              <Button className="bg-primary hover:bg-primary/90 text-white">Volver al inicio</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }
  const isSubmitting = uploading || registerMutation.isPending || registerNewMutation.isPending;

  // ── Secciones del formulario ────────────────────────────────────────────────
  // En el orden exacto del documento de registro de asesor. Una sola
  // definición para las dos presentaciones (embebida en la landing y página
  // completa): antes el formulario estaba escrito dos veces y cada campo nuevo
  // había que ponerlo en ambos lados.
  interface Section {
    id: string;
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    content: React.ReactNode;
  }

  const sections: Section[] = [];

  // 1 · Cuenta de acceso — solo si aún no tiene sesión
  if (!isAuthenticated) {
    sections.push({
      id: "cuenta",
      icon: <Shield className="w-5 h-5 text-primary" />,
      title: "Crea tu cuenta",
      subtitle: "Ingresa tu email para registrarte",
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="r-email">Email <span className="text-red-500">*</span></Label>
            <Input
              id="r-email" type="email" placeholder="tu@email.com"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="r-password">Contraseña <span className="text-red-500">*</span></Label>
              <Input
                id="r-password" type="password" placeholder="Mínimo 8 caracteres"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-password2">Confirmar contraseña <span className="text-red-500">*</span></Label>
              <Input
                id="r-password2" type="password" placeholder="Repite tu contraseña"
                value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <a href={getLoginUrl()} className="text-primary underline">Inicia sesión</a>{" "}
            y vuelve a este formulario.
          </p>
        </div>
      ),
    });
  }

  // 2 · Datos personales y ubicación
  sections.push({
    id: "personales",
    icon: <User className="w-5 h-5 text-primary" />,
    title: "Datos personales",
    content: (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="r-firstName">Nombre <span className="text-red-500">*</span></Label>
            <Input id="r-firstName" placeholder="Nombre de pila"
              value={form.firstName} onChange={(e) => handleChange("firstName", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-lastName">Apellido <span className="text-red-500">*</span></Label>
            <Input id="r-lastName" placeholder="Apellido"
              value={form.lastName} onChange={(e) => handleChange("lastName", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="r-username">Nombre de usuario <span className="text-red-500">*</span></Label>
            <Input id="r-username" placeholder="@usuario"
              value={form.username} onChange={(e) => handleChange("username", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-email2">Correo electrónico</Label>
            <Input
              id="r-email2" type="email" placeholder="correo@ejemplo.com"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              disabled={isAuthenticated}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Género</Label>
          <div className="flex flex-wrap gap-6 pt-1">
            {["Masculino", "Femenino", "Prefiero no decir"].map((g) => (
              <label key={g} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="gender" value={g} checked={form.gender === g}
                  onChange={() => handleChange("gender", g)} className="accent-primary" />
                <span className="text-sm text-foreground">{g}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Ubicación de residencia — país, estado y ciudad encadenados */}
        <LocationSelect
          country={form.country}
          state={form.state}
          city={form.city}
          onChange={(field, value) => handleChange(field, value)}
        />
        <p className="text-xs text-muted-foreground">
          Tu residencia puede ser distinta del país que emitió tu documento de identidad.
        </p>
      </div>
    ),
  });

  // 3 · Especialidad y formación
  sections.push({
    id: "especialidad",
    icon: <Briefcase className="w-5 h-5 text-primary" />,
    title: "Especialidad profesional",
    content: (
      <div className="space-y-4">
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
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            La categoría bajo la que aparecerás en la plataforma para los usuarios.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="r-bio">Descripción profesional <span className="text-red-500">*</span></Label>
          <Textarea
            id="r-bio" rows={4}
            placeholder="Describe tu experiencia, enfoque y cómo puedes ayudar a tus clientes..."
            value={form.bio} onChange={(e) => handleChange("bio", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="r-years">Años de experiencia</Label>
          <Input
            id="r-years" type="number" min="0" max="60" placeholder="Ej: 5"
            value={form.yearsOfExperience}
            onChange={(e) => handleChange("yearsOfExperience", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="r-education">Formación académica</Label>
          <Textarea
            id="r-education" rows={3}
            placeholder="Ej: Licenciatura en Psicología, UNAM. Maestría en Psicoterapia..."
            value={form.education} onChange={(e) => handleChange("education", e.target.value)}
          />
        </div>
      </div>
    ),
  });

  // 4 · Experiencia y modalidad
  sections.push({
    id: "experiencia",
    icon: <Clock className="w-5 h-5 text-primary" />,
    title: "Experiencia y modalidad",
    content: <ExperienceBlock form={form} onChange={handleChange} />,
  });

  // 5 · Interés, propósito y objetivos
  sections.push({
    id: "proposito",
    icon: <Compass className="w-5 h-5 text-primary" />,
    title: "Sobre ti y tu propósito",
    content: <PurposeBlock form={form} onChange={handleChange} />,
  });

  // 6 · Creencias y comunidad
  sections.push({
    id: "creencias",
    icon: <Heart className="w-5 h-5 text-primary" />,
    title: "Creencias y comunidad",
    content: (
      <BeliefsBlock
        form={form} onChange={handleChange}
        consent={beliefsConsent} setConsent={setBeliefsConsent}
      />
    ),
  });

  // 7 · Documentos de verificación
  sections.push({
    id: "documentos",
    icon: <Camera className="w-5 h-5 text-primary" />,
    title: "Documentos de verificación",
    subtitle: "Revisados por el equipo de inteira antes de aprobar tu perfil.",
    content: (
      <div className="space-y-5">
        {/* Foto de perfil */}
        <div className="space-y-2">
          <div className="flex items-start gap-4">
            {photoPreview && (
              <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-border">
                <img src={photoPreview} alt="Vista previa" className="w-full h-full object-cover object-top" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <FileUploadField
                label="Foto de perfil"
                description="JPG, PNG o WEBP — máximo 5 MB"
                accept="image/jpeg,image/png,image/webp"
                file={profilePhoto}
                onChange={handlePhotoChange}
                required
              />
            </div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-800 leading-snug">
              Solo fotografías profesionales de la persona que se registra. Rostro
              visible, buena iluminación y foto nítida. No se aceptan logos, dibujos,
              fotos grupales ni imágenes de otra persona.
            </p>
          </div>
        </div>

        {/* País del documento de identidad */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">
            País del documento de identidad <span className="text-red-500">*</span>
          </Label>
          <Select
            value={form.documentNationality}
            onValueChange={(v) => handleChange("documentNationality", v)}
          >
            <SelectTrigger><SelectValue placeholder="Selecciona el país del documento" /></SelectTrigger>
            <SelectContent>
              {["México","Colombia","Argentina","Chile","Perú","Venezuela","Ecuador","Bolivia","Paraguay","Uruguay","Costa Rica","Guatemala","Honduras","El Salvador","Nicaragua","Panamá","Cuba","República Dominicana","España","Estados Unidos","Otro"].map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cédula profesional — con confirmación, es el error más común */}
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

        {/* Número de cédula profesional */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Label htmlFor="r-licenseNumber" className="text-sm font-semibold">
              Número de cédula profesional
            </Label>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
              Opcional — da más confianza
            </span>
          </div>
          <Input
            id="r-licenseNumber" placeholder="Ej: 12345678 — Cédula SEP (no CURP)"
            value={form.licenseNumber}
            onChange={(e) => handleChange("licenseNumber", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Este es el número de cédula profesional emitido por la SEP que certifica tu
            título universitario — <strong>no es tu CURP ni tu cédula de identidad personal</strong>.
            Puedes verificarlo en{" "}
            <a href="https://cedulaprofesional.sep.gob.mx" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              cedulaprofesional.sep.gob.mx
            </a>
          </p>
        </div>

        {/* Certificaciones y títulos */}
        <FileUploadField
          label="Certificaciones y títulos"
          description="PDF, JPG o PNG — máximo 10 MB (opcional)"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          file={certifications}
          onChange={setCertifications}
        />
      </div>
    ),
  });

  // 8 · Envío y confirmación
  sections.push({
    id: "envio",
    icon: <CheckCircle2 className="w-5 h-5 text-primary" />,
    title: "Revisa y envía tu solicitud",
    subtitle: "Revisa tus respuestas y archivos antes de enviar.",
    content: (
      <ConfirmationBlock
        acceptTerms={acceptTerms} setAcceptTerms={setAcceptTerms}
        acceptPrivacy={acceptPrivacy} setAcceptPrivacy={setAcceptPrivacy}
        confirmIdentity={confirmIdentity} setConfirmIdentity={setConfirmIdentity}
      />
    ),
  });

  // Modal de confirmación de la cédula profesional, común a las dos vistas
  const licenseConfirmModal = showLicenseConfirm ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h3 className="font-bold text-base" style={{ fontFamily: "Poppins, sans-serif" }}>
          Confirma tu documento
        </h3>
        <p className="text-sm text-muted-foreground">
          Este campo es exclusivamente para tu <strong>CÉDULA PROFESIONAL</strong> que
          acredita tu título universitario. No es para tu documento de identidad
          ciudadana (INE, pasaporte, cédula de ciudadanía).
        </p>
        <div className="flex gap-2 justify-end pt-2">
          <Button
            type="button" variant="ghost" size="sm"
            onClick={() => { setPendingLicenseFile(null); setShowLicenseConfirm(false); }}
          >
            Cambiar documento
          </Button>
          <Button
            type="button" size="sm"
            className="bg-primary hover:bg-primary/90 text-white border-0"
            onClick={() => { setProfessionalLicense(pendingLicenseFile); setPendingLicenseFile(null); setShowLicenseConfirm(false); }}
          >
            Sí, es mi cédula profesional
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  const submitButton = (
    <Button
      type="submit" disabled={isSubmitting}
      className="w-full bg-primary hover:bg-primary/90 text-white h-12 text-base font-semibold rounded-xl border-0"
    >
      {isSubmitting ? (
        <span className="flex items-center gap-2">
          <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
          {uploading ? "Subiendo archivos..." : "Enviando solicitud..."}
        </span>
      ) : "Enviar solicitud"}
    </Button>
  );

  // ── Vista embebida (dentro de la landing) ─────────────────────────────────
  if (embedded) return (
    <>
      <form onSubmit={handleSubmit} className="space-y-7">
        {sections.map((s, i) => (
          <div key={s.id} className={i > 0 ? "pt-6 border-t border-border space-y-4" : "space-y-4"}>
            <div>
              <p className="text-sm font-semibold text-foreground">{s.title}</p>
              {s.subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5">{s.subtitle}</p>
              )}
            </div>
            {s.content}
          </div>
        ))}
        <div className="pt-2">{submitButton}</div>
      </form>
      {licenseConfirmModal}
    </>
  );

  // ── Página completa ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-muted/20">
      {/* Encabezado */}
      <div className="border-b border-border bg-background">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <a href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Inicio
          </a>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Poppins, sans-serif" }}>
            Registro de asesor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Completa el formulario para unirte a la red de asesores de inteira.
            Tu solicitud será revisada por nuestro equipo.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {sections.map((s, i) => (
            <Card key={s.id} className="border-border">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {s.icon}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-foreground" style={{ fontFamily: "Poppins, sans-serif" }}>
                      <span className="text-muted-foreground font-normal mr-1.5">{i + 1}.</span>
                      {s.title}
                    </h2>
                    {s.subtitle && (
                      <p className="text-xs text-muted-foreground mt-0.5">{s.subtitle}</p>
                    )}
                  </div>
                </div>
                {s.content}
              </CardContent>
            </Card>
          ))}

          <div className="pb-10">{submitButton}</div>
        </form>
      </div>

      {licenseConfirmModal}
    </div>
  );
}
