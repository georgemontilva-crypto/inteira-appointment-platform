import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { uploadFile } from "@/lib/upload";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ClinicForm,
  borradorConsultorioVacio,
  borradorDesdeConsultorio,
  subirConsultorio,
  validarConsultorio,
  type ClinicDraft,
} from "@/components/ClinicForm";
import { AlertTriangle, CheckCircle2, Clock3, ExternalLink, Loader2, MapPin, Monitor, Users, XCircle } from "lucide-react";

type Modalidad = "online" | "in_person" | "both";

const OPCIONES: { value: Modalidad; label: string; detalle: string; Icon: typeof Monitor }[] = [
  { value: "online", label: "Solo online", detalle: "Videollamada desde la app", Icon: Monitor },
  { value: "in_person", label: "Solo presencial", detalle: "En tu consultorio", Icon: Users },
  { value: "both", label: "Presencial y online", detalle: "Tú eliges en cada horario", Icon: MapPin },
];

/**
 * Pestaña "Consultorio" del panel del asesor.
 *
 * Aquí elige en qué modalidad atiende, registra o corrige su consultorio
 * (que revisamos antes de ofrecer citas presenciales) y, una vez aprobado,
 * agrega el enlace de Google Maps.
 */
export function ClinicPanel() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.professional.getMyClinic.useQuery();
  const consultorio = data?.clinic ?? null;
  const modalidad: Modalidad = data?.sessionModality ?? "online";

  const [borrador, setBorrador] = useState<ClinicDraft>(() => borradorConsultorioVacio());
  const [maps, setMaps] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Al cargar (o tras guardar) el borrador parte de lo guardado.
  useEffect(() => {
    if (consultorio) setBorrador(borradorDesdeConsultorio(consultorio));
    setMaps(consultorio?.mapsUrl ?? "");
  }, [consultorio?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const cambiarModalidad = trpc.professional.setMySessionModality.useMutation({
    onSuccess: (r) => {
      utils.professional.getMyClinic.invalidate();
      if (r.needsClinic) toast.info("Registra tu consultorio abajo para empezar a recibir citas presenciales.");
      else toast.success("Modalidad actualizada");
    },
    onError: (e) => toast.error(e.message),
  });

  const guardarConsultorio = trpc.professional.saveMyClinic.useMutation();
  const guardarMaps = trpc.professional.setMyClinicMapsUrl.useMutation({
    onSuccess: () => {
      toast.success("Enlace de Maps guardado");
      utils.professional.getMyClinic.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const enviar = async () => {
    const problema = validarConsultorio(borrador);
    if (problema) return toast.error(problema);
    setGuardando(true);
    try {
      const payload = await subirConsultorio(borrador, uploadFile);
      const r = await guardarConsultorio.mutateAsync(payload);
      await utils.professional.getMyClinic.invalidate();
      if (r.volvioARevision) {
        toast.info("Cambiaste la dirección o los documentos: tu consultorio volvió a revisión.", { duration: 8000 });
      } else if (r.status === "pending") {
        toast.success("Consultorio enviado. Te avisamos cuando lo revisemos.");
      } else {
        toast.success("Cambios guardados");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar el consultorio", { duration: 8000 });
    } finally {
      setGuardando(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const incluyePresencial = modalidad !== "online";

  return (
    <div className="space-y-5">
      {/* Modalidad */}
      <section className="rounded-2xl border border-border bg-white p-4 sm:p-5 space-y-3">
        <div>
          <h3 className="font-semibold">¿Cómo atiendes?</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Es la etiqueta que ven las personas en tu perfil.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-2">
          {OPCIONES.map(({ value, label, detalle, Icon }) => {
            const activa = modalidad === value;
            return (
              <button
                key={value}
                type="button"
                disabled={cambiarModalidad.isPending}
                onClick={() => !activa && cambiarModalidad.mutate({ modality: value })}
                className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                  activa ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${activa ? "text-primary" : "text-muted-foreground"}`} />
                <span>
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-[11px] text-muted-foreground">{detalle}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {!incluyePresencial ? (
        <p className="text-sm text-muted-foreground px-1">
          Si también atiendes en consultorio, elige "Presencial y online" y registra tu consultorio.
        </p>
      ) : (
        <>
          {/* Estado de la revisión */}
          <EstadoConsultorio consultorio={consultorio} modalidad={modalidad} />

          {/* Formulario */}
          <section className="rounded-2xl border border-border bg-white p-4 sm:p-5 space-y-4">
            <div>
              <h3 className="font-semibold">{consultorio ? "Datos del consultorio" : "Registra tu consultorio"}</h3>
              {consultorio?.status === "approved" && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Puedes cambiar el nombre y las fotos cuando quieras. Si cambias la dirección o los
                  documentos, el consultorio vuelve a revisión y mientras tanto no se ofrecen citas presenciales.
                </p>
              )}
            </div>
            <ClinicForm value={borrador} onChange={setBorrador} disabled={guardando} />
            <Button className="w-full h-11" onClick={enviar} disabled={guardando}>
              {guardando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando…
                </>
              ) : consultorio ? (
                consultorio.status === "rejected" ? "Corregir y reenviar" : "Guardar cambios"
              ) : (
                "Enviar a revisión"
              )}
            </Button>
          </section>

          {/* Maps: solo con el consultorio aprobado */}
          {consultorio?.status === "approved" && (
            <section className="rounded-2xl border border-border bg-white p-4 sm:p-5 space-y-3">
              <div>
                <h3 className="font-semibold">Ubicación en Google Maps</h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                  Aparece como botón "Cómo llegar" en tu perfil y en el correo de cada cita. En Google
                  Maps busca tu consultorio, toca <span className="font-medium">Compartir</span> y luego{" "}
                  <span className="font-medium">Copiar enlace</span>.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={maps}
                  onChange={(e) => setMaps(e.target.value)}
                  placeholder="https://maps.app.goo.gl/…"
                  inputMode="url"
                />
                <Button
                  variant="outline"
                  className="sm:w-auto"
                  disabled={guardarMaps.isPending || maps.trim() === (consultorio.mapsUrl ?? "")}
                  onClick={() => guardarMaps.mutate({ mapsUrl: maps.trim() || null })}
                >
                  {guardarMaps.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar enlace"}
                </Button>
              </div>
              {consultorio.mapsUrl && (
                <a
                  href={consultorio.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  Probar el enlace <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function EstadoConsultorio({ consultorio, modalidad }: { consultorio: any; modalidad: Modalidad }) {
  if (!consultorio) {
    return (
      <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 leading-snug">
          Aún no registras tu consultorio.{" "}
          {modalidad === "in_person"
            ? "Mientras no esté aprobado no se ofrecen citas contigo."
            : "Mientras no esté aprobado solo se ofrecen tus citas online."}
        </p>
      </div>
    );
  }
  if (consultorio.status === "pending") {
    return (
      <div className="flex gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4">
        <Clock3 className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-sky-800 leading-snug">
          Tu consultorio está en revisión. Te avisamos en cuanto lo aprobemos; mientras tanto no se
          ofrecen citas presenciales.
        </p>
      </div>
    );
  }
  if (consultorio.status === "rejected") {
    return (
      <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-red-800 leading-snug">
          <p className="font-medium">No pudimos aprobar tu consultorio.</p>
          {consultorio.rejectionReason && <p className="mt-1">{consultorio.rejectionReason}</p>}
          <p className="mt-1">Corrige lo que se indica y vuelve a enviarlo.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4">
      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
      <p className="text-sm leading-snug">
        Consultorio aprobado. Marca en <span className="font-medium">Disponibilidad</span> qué horarios
        son presenciales para empezar a recibir citas en consultorio.
      </p>
    </div>
  );
}
