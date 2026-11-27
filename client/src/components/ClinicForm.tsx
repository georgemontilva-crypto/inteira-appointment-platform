import { useEffect, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LocationSelect } from "@/components/LocationSelect";
import { MAX_DOC_BYTES, MAX_PHOTO_BYTES } from "@/lib/upload";
import { Check, FileText, ImagePlus, Upload, X } from "lucide-react";

/** Un archivo recién elegido (File) o uno que ya estaba subido (URL). */
export type ArchivoOUrl = File | string;

export interface ClinicDraft {
  name: string;
  address: string;
  country: string;
  state: string;
  city: string;
  photos: ArchivoOUrl[];
  addressProof: ArchivoOUrl | null;
  sanitaryLicense: ArchivoOUrl | null;
  noLicenseRequired: boolean;
}

export const MIN_FOTOS_CONSULTORIO = 3;
export const MAX_FOTOS_CONSULTORIO = 10;

export function borradorConsultorioVacio(base?: Partial<ClinicDraft>): ClinicDraft {
  return {
    name: "",
    address: "",
    country: "",
    state: "",
    city: "",
    photos: [],
    addressProof: null,
    sanitaryLicense: null,
    noLicenseRequired: false,
    ...base,
  };
}

/** Borrador a partir del consultorio guardado, para editarlo en el panel. */
export function borradorDesdeConsultorio(c: any): ClinicDraft {
  return borradorConsultorioVacio({
    name: c?.name ?? "",
    address: c?.address ?? "",
    country: c?.country ?? "",
    state: c?.state ?? "",
    city: c?.city ?? "",
    photos: Array.isArray(c?.photos) ? c.photos : [],
    addressProof: c?.addressProofUrl ?? null,
    sanitaryLicense: c?.sanitaryLicenseUrl ?? null,
    noLicenseRequired: Boolean(c?.noLicenseRequired),
  });
}

/** Primer problema del borrador, o null si está completo. */
export function validarConsultorio(d: ClinicDraft): string | null {
  if (d.address.trim().length < 8) return "Escribe la dirección completa del consultorio";
  if (!d.country) return "Selecciona el país del consultorio";
  if (!d.state.trim()) return "Indica el estado del consultorio";
  if (!d.city.trim()) return "Selecciona la ciudad del consultorio";
  if (d.photos.length < MIN_FOTOS_CONSULTORIO) {
    return `Sube al menos ${MIN_FOTOS_CONSULTORIO} fotos del consultorio`;
  }
  if (!d.addressProof) return "Falta el comprobante de domicilio del consultorio";
  if (!d.noLicenseRequired && !d.sanitaryLicense) {
    return "Sube la licencia o aviso sanitario, o marca que tu especialidad no lo requiere";
  }
  const grande = [
    ...d.photos.map((f) => ({ f, max: MAX_PHOTO_BYTES, label: "Una foto del consultorio" })),
    { f: d.addressProof, max: MAX_DOC_BYTES, label: "El comprobante de domicilio" },
    { f: d.sanitaryLicense, max: MAX_DOC_BYTES, label: "La licencia sanitaria" },
  ].find((x) => x.f instanceof File && x.f.size > x.max);
  if (grande) {
    return `${grande.label} pesa ${((grande.f as File).size / 1024 / 1024).toFixed(1)} MB. El máximo es ${grande.max / 1024 / 1024} MB.`;
  }
  return null;
}

/** Sube lo que falte y devuelve lo que espera el servidor. */
export async function subirConsultorio(
  d: ClinicDraft,
  subir: (f: File) => Promise<string>
) {
  const aUrl = async (x: ArchivoOUrl | null) => (x == null ? null : typeof x === "string" ? x : subir(x));
  const photos: string[] = [];
  for (const p of d.photos) {
    const url = await aUrl(p);
    if (url) photos.push(url);
  }
  return {
    name: d.name.trim() || undefined,
    address: d.address.trim(),
    country: d.country || undefined,
    state: d.state.trim() || undefined,
    city: d.city.trim() || undefined,
    photos,
    addressProofUrl: (await aUrl(d.addressProof)) as string,
    sanitaryLicenseUrl: d.noLicenseRequired ? null : await aUrl(d.sanitaryLicense),
    noLicenseRequired: d.noLicenseRequired,
  };
}

/** Miniatura de un File o de una URL, liberando el objectURL al salir. */
function useVistaPrevia(x: ArchivoOUrl) {
  const url = useMemo(() => (typeof x === "string" ? x : URL.createObjectURL(x)), [x]);
  useEffect(() => {
    if (typeof x !== "string") return () => URL.revokeObjectURL(url);
  }, [x, url]);
  return url;
}

function Miniatura({ archivo, onQuitar, disabled }: { archivo: ArchivoOUrl; onQuitar: () => void; disabled?: boolean }) {
  const src = useVistaPrevia(archivo);
  return (
    <div className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted">
      <img src={src} alt="Foto del consultorio" className="w-full h-full object-cover" />
      {!disabled && (
        <button
          type="button"
          onClick={onQuitar}
          aria-label="Quitar foto"
          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function nombreDe(x: ArchivoOUrl): string {
  if (typeof x !== "string") return x.name;
  try {
    return decodeURIComponent(new URL(x).pathname.split("/").pop() ?? "archivo");
  } catch {
    return "archivo subido";
  }
}

function CampoDocumento({
  label,
  descripcion,
  valor,
  onCambio,
  disabled,
}: {
  label: string;
  descripcion: string;
  valor: ArchivoOUrl | null;
  onCambio: (v: ArchivoOUrl | null) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold">{label}</Label>
      <p className="text-xs text-muted-foreground">{descripcion}</p>
      {valor ? (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5">
          <FileText className="w-4 h-4 text-primary flex-shrink-0" />
          {typeof valor === "string" ? (
            <a href={valor} target="_blank" rel="noopener noreferrer" className="text-sm truncate flex-1 underline-offset-2 hover:underline">
              {nombreDe(valor)}
            </a>
          ) : (
            <span className="text-sm truncate flex-1">{nombreDe(valor)}</span>
          )}
          <Check className="w-4 h-4 text-primary flex-shrink-0" />
          {!disabled && (
            <button type="button" onClick={() => onCambio(null)} aria-label={`Quitar ${label}`} className="text-muted-foreground hover:text-red-500">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => ref.current?.click()}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          Subir archivo (foto o PDF)
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onCambio(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/**
 * Datos del consultorio para atención presencial.
 *
 * Lo usan el registro (los archivos se suben al enviar) y el panel del asesor
 * (se suben al guardar). Pide lo que se revisa para aprobarlo: dirección,
 * fotos del lugar, comprobante de domicilio y licencia sanitaria cuando
 * aplica a la especialidad.
 */
export function ClinicForm({
  value,
  onChange,
  disabled,
}: {
  value: ClinicDraft;
  onChange: (d: ClinicDraft) => void;
  disabled?: boolean;
}) {
  const fotosRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof ClinicDraft>(k: K, v: ClinicDraft[K]) => onChange({ ...value, [k]: v });
  const faltanFotos = Math.max(0, MIN_FOTOS_CONSULTORIO - value.photos.length);

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">Nombre del consultorio (opcional)</Label>
        <Input
          value={value.name}
          disabled={disabled}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Ej. Consultorio Integral Roma"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">
          Dirección completa <span className="text-red-500">*</span>
        </Label>
        <Textarea
          rows={2}
          value={value.address}
          disabled={disabled}
          onChange={(e) => set("address", e.target.value)}
          placeholder="Calle, número, interior, colonia y código postal"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">
          Ubicación <span className="text-red-500">*</span>
        </Label>
        <LocationSelect
          country={value.country}
          state={value.state}
          city={value.city}
          disabled={disabled}
          onChange={(campo, v) => {
            // Cambiar de país o estado deja sin sentido lo que estaba debajo.
            if (campo === "country") onChange({ ...value, country: v, state: "", city: "" });
            else if (campo === "state") onChange({ ...value, state: v, city: "" });
            else onChange({ ...value, city: v });
          }}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold">
          Fotos del consultorio <span className="text-red-500">*</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          Entre {MIN_FOTOS_CONSULTORIO} y {MAX_FOTOS_CONSULTORIO}: fachada o entrada, sala de espera y
          el espacio donde atiendes. Son las que verán las personas en tu perfil.
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {value.photos.map((f, i) => (
            <Miniatura
              key={typeof f === "string" ? f : `${f.name}-${f.size}-${i}`}
              archivo={f}
              disabled={disabled}
              onQuitar={() => set("photos", value.photos.filter((_, j) => j !== i))}
            />
          ))}
          {value.photos.length < MAX_FOTOS_CONSULTORIO && !disabled && (
            <button
              type="button"
              onClick={() => fotosRef.current?.click()}
              className="aspect-square rounded-xl border border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              <ImagePlus className="w-5 h-5" />
              <span className="text-[11px]">Agregar</span>
            </button>
          )}
        </div>
        {faltanFotos > 0 && (
          <p className="text-[11px] text-amber-700">
            {faltanFotos === 1 ? "Falta 1 foto" : `Faltan ${faltanFotos} fotos`}
          </p>
        )}
        <input
          ref={fotosRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const nuevas = Array.from(e.target.files ?? []);
            set("photos", [...value.photos, ...nuevas].slice(0, MAX_FOTOS_CONSULTORIO));
            e.target.value = "";
          }}
        />
      </div>

      <CampoDocumento
        label="Comprobante de domicilio *"
        descripcion="Recibo de luz, agua o teléfono, o contrato de renta del consultorio, con la misma dirección."
        valor={value.addressProof}
        disabled={disabled}
        onCambio={(v) => set("addressProof", v)}
      />

      <div className="space-y-2">
        {!value.noLicenseRequired && (
          <CampoDocumento
            label="Licencia o aviso de funcionamiento sanitario *"
            descripcion="El documento que autoriza el funcionamiento del consultorio."
            valor={value.sanitaryLicense}
            disabled={disabled}
            onCambio={(v) => set("sanitaryLicense", v)}
          />
        )}
        <label className="flex items-start gap-2.5 text-sm cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
            checked={value.noLicenseRequired}
            disabled={disabled}
            onChange={(e) =>
              onChange({ ...value, noLicenseRequired: e.target.checked, sanitaryLicense: e.target.checked ? null : value.sanitaryLicense })
            }
          />
          <span className="text-muted-foreground leading-snug">
            Mi especialidad no requiere licencia sanitaria para atender en consultorio.
          </span>
        </label>
      </div>
    </div>
  );
}
