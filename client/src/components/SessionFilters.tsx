import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MapPin, Moon, SlidersHorizontal, Sun, Sunrise, Video, X } from "lucide-react";

export type FiltroModalidad = "any" | "online" | "in_person";
export type Franja = "todo" | "manana" | "tarde" | "noche";

export interface Filtros {
  modalidad: FiltroModalidad;
  franja: Franja;
  /** Solo en la búsqueda general */
  especialidadId?: number | null;
}

export const FILTROS_INICIALES: Filtros = { modalidad: "any", franja: "todo", especialidadId: null };

const FRANJAS: { v: Franja; label: string; detalle: string; Icon: typeof Sun }[] = [
  { v: "todo", label: "Todo el día", detalle: "", Icon: Sun },
  { v: "manana", label: "Mañana", detalle: "antes de 12:00", Icon: Sunrise },
  { v: "tarde", label: "Tarde", detalle: "12:00 a 18:00", Icon: Sun },
  { v: "noche", label: "Noche", detalle: "desde 18:00", Icon: Moon },
];

/** Deja solo los horarios de la franja elegida ("09:00" → hora 9). */
export function enFranja(hora: string, franja: Franja): boolean {
  if (franja === "todo") return true;
  const h = Number(hora.split(":")[0]);
  if (franja === "manana") return h < 12;
  if (franja === "tarde") return h >= 12 && h < 18;
  return h >= 18;
}

export function contarFiltros(f: Filtros): number {
  return (f.modalidad !== "any" ? 1 : 0) + (f.franja !== "todo" ? 1 : 0) + (f.especialidadId ? 1 : 0);
}

/** Botón "Filtrar" con el número de filtros activos. */
export function BotonFiltrar({ filtros, onClick }: { filtros: Filtros; onClick: () => void }) {
  const n = contarFiltros(filtros);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 h-10 px-4 rounded-full border text-sm font-medium transition-colors ${
        n > 0 ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:border-primary/40"
      }`}
    >
      <SlidersHorizontal className="w-4 h-4" />
      Filtrar
      {n > 0 && (
        <span className="min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center">
          {n}
        </span>
      )}
    </button>
  );
}

/** Pastillas de los filtros activos, cada una se quita sola. */
export function FiltrosActivos({
  filtros,
  onChange,
  nombreEspecialidad,
}: {
  filtros: Filtros;
  onChange: (f: Filtros) => void;
  nombreEspecialidad?: string | null;
}) {
  const pastillas: { key: string; label: string; quitar: Filtros }[] = [];
  if (filtros.modalidad !== "any") {
    pastillas.push({
      key: "m",
      label: filtros.modalidad === "online" ? "Online" : "Presencial",
      quitar: { ...filtros, modalidad: "any" },
    });
  }
  if (filtros.franja !== "todo") {
    pastillas.push({
      key: "f",
      label: FRANJAS.find((x) => x.v === filtros.franja)?.label ?? "",
      quitar: { ...filtros, franja: "todo" },
    });
  }
  if (filtros.especialidadId && nombreEspecialidad) {
    pastillas.push({ key: "e", label: nombreEspecialidad, quitar: { ...filtros, especialidadId: null } });
  }
  if (pastillas.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {pastillas.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => onChange(p.quitar)}
          className="inline-flex items-center gap-1 h-7 pl-3 pr-2 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/15"
        >
          {p.label}
          <X className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  );
}

/**
 * Hoja de filtros: modalidad, franja horaria y, en la búsqueda general,
 * especialidad. Se edita una copia y se aplica al confirmar, para que la
 * lista de abajo no salte con cada toque.
 */
export function FiltrosSheet({
  abierto,
  filtros,
  onAplicar,
  onCerrar,
  especialidades,
  mostrarPresencial = true,
}: {
  abierto: boolean;
  filtros: Filtros;
  onAplicar: (f: Filtros) => void;
  onCerrar: () => void;
  /** Si viene, se muestra el filtro por especialidad */
  especialidades?: { id: number; name: string }[];
  /** Ocultar "Presencial" cuando no hay ningún consultorio aprobado */
  mostrarPresencial?: boolean;
}) {
  const [borrador, setBorrador] = useState(filtros);
  useEffect(() => {
    if (abierto) setBorrador(filtros);
  }, [abierto, filtros]);

  const opcion = (activa: boolean) =>
    `flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
      activa ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
    }`;

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          key="filtros"
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
          initial="cerrado"
          animate="abierto"
          exit="cerrado"
          variants={{ cerrado: {}, abierto: {} }}
        >
          <motion.div
            className="absolute inset-0 bg-black/50"
            onClick={onCerrar}
            variants={{ cerrado: { opacity: 0 }, abierto: { opacity: 1 } }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            role="dialog"
            aria-label="Filtros"
            className="relative bg-background w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[88vh] overflow-y-auto"
            variants={{ cerrado: { y: "100%" }, abierto: { y: 0 } }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h2 className="font-bold text-lg" style={{ fontFamily: "Poppins, sans-serif" }}>
                Filtrar sesiones
              </h2>
              <button onClick={onCerrar} aria-label="Cerrar" className="p-1.5 rounded-full hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 pb-5 space-y-6">
              <section className="space-y-2">
                <p className="text-sm font-semibold">Modalidad</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { v: "any", label: "Todas", Icon: SlidersHorizontal },
                    { v: "online", label: "Online", Icon: Video },
                    ...(mostrarPresencial ? [{ v: "in_person", label: "Presencial", Icon: MapPin } as const] : []),
                  ] as const).map(({ v, label, Icon }) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={borrador.modalidad === v}
                      onClick={() => setBorrador({ ...borrador, modalidad: v })}
                      className={`${opcion(borrador.modalidad === v)} flex-col justify-center py-3`}
                    >
                      <Icon className={`w-4 h-4 ${borrador.modalidad === v ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <p className="text-sm font-semibold">Horario</p>
                <div className="grid grid-cols-2 gap-2">
                  {FRANJAS.map(({ v, label, detalle, Icon }) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={borrador.franja === v}
                      onClick={() => setBorrador({ ...borrador, franja: v })}
                      className={opcion(borrador.franja === v)}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${borrador.franja === v ? "text-primary" : "text-muted-foreground"}`} />
                      <span>
                        <span className="block text-sm font-medium">{label}</span>
                        {detalle && <span className="block text-[11px] text-muted-foreground">{detalle}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {especialidades && especialidades.length > 0 && (
                <section className="space-y-2">
                  <p className="text-sm font-semibold">Especialidad</p>
                  <div className="flex flex-wrap gap-2">
                    {[{ id: 0, name: "Todas" }, ...especialidades].map((e) => {
                      const activa = (borrador.especialidadId ?? 0) === e.id;
                      return (
                        <button
                          key={e.id}
                          type="button"
                          aria-pressed={activa}
                          onClick={() => setBorrador({ ...borrador, especialidadId: e.id || null })}
                          className={`h-9 px-3.5 rounded-full border text-sm transition-colors ${
                            activa ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40"
                          }`}
                        >
                          {e.name}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={() => setBorrador({ ...FILTROS_INICIALES })}
                >
                  Limpiar
                </Button>
                <Button
                  className="flex-[2] h-12 text-base"
                  onClick={() => {
                    onAplicar(borrador);
                    onCerrar();
                  }}
                >
                  Ver sesiones
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
