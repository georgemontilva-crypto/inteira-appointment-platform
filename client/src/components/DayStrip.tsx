import { useMemo, useRef, useEffect } from "react";
import { addDays, format, isSameDay, isToday } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Tira horizontal de días para elegir la fecha de la agenda.
 *
 * El día seleccionado se marca con el verde de la marca; hoy se distingue con
 * un punto, para que se pueda ubicar sin leer las fechas una por una.
 */
export function DayStrip({
  value,
  onChange,
  days = 21,
  from,
}: {
  value: Date;
  onChange: (date: Date) => void;
  /** Cuántos días mostrar a partir de `from`. */
  days?: number;
  /** Primer día de la tira. Por defecto, hoy. */
  from?: Date;
}) {
  const start = useMemo(() => {
    const d = from ?? new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, [from]);

  const fechas = useMemo(
    () => Array.from({ length: days }, (_, i) => addDays(start, i)),
    [start, days]
  );

  const scroller = useRef<HTMLDivElement>(null);
  const activo = useRef<HTMLButtonElement>(null);

  // Al abrir con una fecha ya elegida, dejarla a la vista sin saltos bruscos.
  useEffect(() => {
    activo.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [value]);

  // El mes solo se repite cuando cambia, para no ensuciar la tira.
  let mesMostrado = "";

  return (
    <div
      ref={scroller}
      className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-4 px-4 py-1"
      style={{ WebkitOverflowScrolling: "touch" }}
      role="tablist"
      aria-label="Elegir día"
    >
      {fechas.map((fecha) => {
        const seleccionado = isSameDay(fecha, value);
        const hoy = isToday(fecha);
        const mes = format(fecha, "MMM", { locale: es });
        const mostrarMes = mes !== mesMostrado;
        if (mostrarMes) mesMostrado = mes;

        return (
          <button
            key={fecha.toISOString()}
            ref={seleccionado ? activo : undefined}
            type="button"
            role="tab"
            aria-selected={seleccionado}
            onClick={() => onChange(fecha)}
            className={`flex-shrink-0 w-[58px] rounded-xl border py-2 transition-colors ${
              seleccionado
                ? "bg-primary border-primary text-primary-foreground"
                : "bg-background border-border hover:border-primary/40"
            }`}
          >
            <span
              className={`block text-[10px] capitalize ${
                seleccionado ? "text-primary-foreground/80" : "text-muted-foreground"
              }`}
            >
              {format(fecha, "EEE", { locale: es })}
            </span>
            <span className="block text-lg font-semibold leading-tight">
              {format(fecha, "d")}
            </span>
            <span
              className={`block text-[10px] capitalize ${
                seleccionado ? "text-primary-foreground/80" : "text-muted-foreground"
              }`}
            >
              {mostrarMes ? mes : hoy ? "hoy" : " "}
            </span>
          </button>
        );
      })}
    </div>
  );
}
