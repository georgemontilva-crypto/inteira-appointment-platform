import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { trpc } from "@/lib/trpc";
import { parseLocalDate } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ExternalLink, FileText, Loader2, MapPin, RotateCcw, XCircle } from "lucide-react";

type Estado = "pending" | "approved" | "rejected";

const ETIQUETA: Record<Estado, { texto: string; clase: string }> = {
  pending: { texto: "Por revisar", clase: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { texto: "Aprobado", clase: "bg-green-100 text-green-800 border-green-200" },
  rejected: { texto: "Rechazado", clase: "bg-red-100 text-red-800 border-red-200" },
};

/**
 * Pestaña "Consultorios" del admin.
 *
 * Arriba, las citas presenciales que terminaron sin código de llegada: no se
 * pagan solas y hay que decidir si se dieron (se cobra y se paga al asesor) o
 * no (se reembolsa). Abajo, los consultorios para aprobar o rechazar, con sus
 * fotos y documentos, y el enlace de Maps que el admin también puede editar.
 */
export function AdminClinics() {
  const [filtro, setFiltro] = useState<Estado | "todos">("pending");
  const utils = trpc.useUtils();

  const { data: consultorios, isLoading } = trpc.admin.listClinics.useQuery(
    filtro === "todos" ? undefined : { status: filtro }
  );
  const { data: revisiones } = trpc.admin.listInPersonReviews.useQuery();

  const resolver = trpc.admin.resolveInPersonAppointment.useMutation({
    onSuccess: (_r, v) => {
      toast.success(v.decision === "held" ? "Cita confirmada y pago liberado" : "Créditos devueltos al cliente");
      utils.admin.listInPersonReviews.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      {/* Citas presenciales sin código */}
      {(revisiones?.length ?? 0) > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Citas presenciales sin llegada registrada</h2>
            <p className="text-sm text-muted-foreground">
              El asesor no ingresó el código del cliente. No se pagan solas: confirma si la sesión se dio o
              devuelve los créditos.
            </p>
          </div>
          <div className="space-y-2">
            {revisiones!.map((c: any) => (
              <div key={c.id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0 text-sm">
                  <p className="font-medium">
                    {c.userName ?? c.userEmail} con {c.professionalName ?? c.professionalEmail}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {format(parseLocalDate(c.appointmentDate), "EEEE d MMM · HH:mm", { locale: es })} · {c.clinicAddress}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={resolver.isPending}
                    onClick={() => resolver.mutate({ appointmentId: c.id, decision: "refund" })}
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    Reembolsar
                  </Button>
                  <Button
                    size="sm"
                    disabled={resolver.isPending}
                    onClick={() => resolver.mutate({ appointmentId: c.id, decision: "held" })}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Sí se dio
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Consultorios */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Consultorios</h2>
            <p className="text-sm text-muted-foreground">
              Las citas presenciales solo se ofrecen con el consultorio aprobado.
            </p>
          </div>
          <div className="flex gap-1 p-1 rounded-xl bg-muted w-fit">
            {([
              { v: "pending", l: "Por revisar" },
              { v: "approved", l: "Aprobados" },
              { v: "rejected", l: "Rechazados" },
              { v: "todos", l: "Todos" },
            ] as const).map((o) => (
              <button
                key={o.v}
                onClick={() => setFiltro(o.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filtro === o.v ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (consultorios?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-8 text-center">
            {filtro === "pending" ? "No hay consultorios por revisar." : "No hay consultorios en esta lista."}
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {consultorios!.map((c) => (
              <TarjetaConsultorio key={c.id} c={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TarjetaConsultorio({ c }: { c: any }) {
  const utils = trpc.useUtils();
  const [motivo, setMotivo] = useState("");
  const [rechazando, setRechazando] = useState(false);
  const [maps, setMaps] = useState<string>(c.mapsUrl ?? "");

  const revisar = trpc.admin.reviewClinic.useMutation({
    onSuccess: (_r, v) => {
      toast.success(v.decision === "approved" ? "Consultorio aprobado" : "Consultorio rechazado");
      setRechazando(false);
      setMotivo("");
      utils.admin.listClinics.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const guardarMaps = trpc.admin.setClinicMapsUrl.useMutation({
    onSuccess: () => {
      toast.success("Enlace de Maps guardado");
      utils.admin.listClinics.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const estado = ETIQUETA[c.status as Estado];
  const direccion = [c.address, c.city, c.state, c.country].filter(Boolean).join(", ");

  return (
    <article className="rounded-2xl border border-border bg-card overflow-hidden">
      {c.photos?.length > 0 && (
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {c.photos.map((src: string) => (
            <a key={src} href={src} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
              <img src={src} alt="" className="h-28 w-36 object-cover" loading="lazy" />
            </a>
          ))}
        </div>
      )}

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold truncate">{c.professionalName ?? c.professionalEmail}</p>
            <p className="text-xs text-muted-foreground truncate">{c.professionalEmail}</p>
          </div>
          <Badge className={`border text-[11px] ${estado.clase}`}>{estado.texto}</Badge>
        </div>

        <p className="flex items-start gap-1.5 text-sm">
          <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <span>
            {c.name && <span className="font-medium">{c.name} · </span>}
            {direccion}
          </span>
        </p>

        <div className="flex flex-wrap gap-2">
          <Documento url={c.addressProofUrl} etiqueta="Comprobante de domicilio" />
          {c.noLicenseRequired ? (
            <span className="text-xs text-muted-foreground rounded-lg border border-dashed px-2.5 py-1.5">
              Declara que no requiere licencia sanitaria
            </span>
          ) : (
            <Documento url={c.sanitaryLicenseUrl} etiqueta="Licencia sanitaria" />
          )}
          <span className="text-xs text-muted-foreground rounded-lg border px-2.5 py-1.5">
            {c.photos?.length ?? 0} fotos
          </span>
        </div>

        {c.status === "rejected" && c.rejectionReason && (
          <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">Motivo: {c.rejectionReason}</p>
        )}

        {/* Revisión */}
        {c.status !== "approved" && !rechazando && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setRechazando(true)}>
              <XCircle className="w-3.5 h-3.5 mr-1.5" />
              Rechazar
            </Button>
            <Button
              size="sm"
              className="flex-1"
              disabled={revisar.isPending}
              onClick={() => revisar.mutate({ professionalId: c.professionalId, decision: "approved" })}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Aprobar
            </Button>
          </div>
        )}
        {c.status === "approved" && !rechazando && (
          <button onClick={() => setRechazando(true)} className="text-xs text-red-600 hover:underline">
            Retirar aprobación
          </button>
        )}
        {rechazando && (
          <div className="space-y-2">
            <Textarea
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Qué tiene que corregir (lo ve el asesor). Ej.: el comprobante no coincide con la dirección."
            />
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="flex-1" onClick={() => setRechazando(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                disabled={!motivo.trim() || revisar.isPending}
                onClick={() =>
                  revisar.mutate({ professionalId: c.professionalId, decision: "rejected", reason: motivo.trim() })
                }
              >
                Confirmar rechazo
              </Button>
            </div>
          </div>
        )}

        {/* Maps: también lo puede poner o corregir el admin */}
        {c.status === "approved" && (
          <div className="pt-2 border-t border-border space-y-1.5">
            <p className="text-xs font-medium">Enlace de Google Maps</p>
            <div className="flex gap-2">
              <Input
                value={maps}
                onChange={(e) => setMaps(e.target.value)}
                placeholder="https://maps.app.goo.gl/…"
                className="h-9 text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-9"
                disabled={guardarMaps.isPending || maps.trim() === (c.mapsUrl ?? "")}
                onClick={() => guardarMaps.mutate({ professionalId: c.professionalId, mapsUrl: maps.trim() || null })}
              >
                Guardar
              </Button>
            </div>
            {c.mapsUrl && (
              <a href={c.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                Abrir en Maps <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function Documento({ url, etiqueta }: { url: string | null; etiqueta: string }) {
  if (!url) {
    return <span className="text-xs text-red-600 rounded-lg border border-red-200 px-2.5 py-1.5">Falta: {etiqueta}</span>;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs rounded-lg border px-2.5 py-1.5 hover:bg-muted transition-colors"
    >
      <FileText className="w-3.5 h-3.5 text-primary" />
      {etiqueta}
      <ExternalLink className="w-3 h-3 text-muted-foreground" />
    </a>
  );
}
