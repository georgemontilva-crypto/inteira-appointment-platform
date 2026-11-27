import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { DayStrip } from "@/components/DayStrip";
import { BookingSheet, type AgendaSlot } from "@/components/BookingSheet";
import { SlotList } from "@/components/SlotList";
import {
  BotonFiltrar,
  FILTROS_INICIALES,
  FiltrosActivos,
  FiltrosSheet,
  enFranja,
  type Filtros,
} from "@/components/SessionFilters";
import { useCostoSesion } from "@/hooks/useCostoSesion";
import { CalendarX2 } from "lucide-react";

/**
 * Agenda del día para una especialidad: en vez de elegir asesor y después mirar
 * su calendario, se ven de una vez todos los huecos libres de ese día.
 *
 * Las filas se agrupan por hora porque la pregunta que trae a esta pantalla es
 * "¿a qué hora puedo?", no "¿quién hay?". El filtro deja elegir modalidad
 * (online o presencial) y franja del día.
 */
export function SpecialtyAgenda({ slug }: { slug: string }) {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { tipoDe, costoDe, saldo } = useCostoSesion();

  const [day, setDay] = useState(() => new Date());
  const [elegido, setElegido] = useState<AgendaSlot | null>(null);
  const [filtros, setFiltros] = useState<Filtros>({ ...FILTROS_INICIALES });
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  const fechaISO = format(day, "yyyy-MM-dd");
  const tz = -new Date().getTimezoneOffset();

  const { data, isLoading, refetch } = trpc.appointment.getSpecialtyAgenda.useQuery(
    { specialtySlug: slug, date: fechaISO, timezoneOffset: tz, modality: filtros.modalidad },
    { enabled: slug.length > 0 }
  );

  // La franja se aplica aquí: el servidor ya devuelve el día completo.
  const slots = useMemo(
    () => ((data?.slots ?? []) as AgendaSlot[]).filter((s) => enFranja(s.time, filtros.franja)),
    [data, filtros.franja]
  );
  const totalSlots = slots.length;
  const hayFiltros = filtros.modalidad !== "any" || filtros.franja !== "todo";

  // Un día sin horarios no debe ser un callejón sin salida: se buscan los
  // próximos días que sí tienen (con la misma modalidad) y se ofrecen.
  const sinHorarios = !isLoading && totalSlots === 0;
  const { data: proximos } = trpc.appointment.getSpecialtyNextDays.useQuery(
    { specialtySlug: slug, from: fechaISO, days: 14, timezoneOffset: tz, modality: filtros.modalidad },
    { enabled: slug.length > 0 && sinHorarios && filtros.franja === "todo" }
  );
  const diasConHueco = (proximos?.days ?? []).slice(0, 4);

  const abrirSlot = (slot: AgendaSlot) => {
    if (!isAuthenticated) {
      const volver = `/especialidades/${slug}`;
      sessionStorage.setItem("loginReturnTo", volver);
      navigate(getLoginUrl(volver));
      return;
    }
    setElegido(slot);
  };

  return (
    <div className="space-y-4">
      {/* Día */}
      <DayStrip value={day} onChange={setDay} />

      {/* Resumen del día + filtro */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground min-w-0">
          {isLoading
            ? "Buscando horarios…"
            : totalSlots === 0
              ? "Sin horarios libres"
              : `${totalSlots} ${totalSlots === 1 ? "horario" : "horarios"} · ${format(day, "EEE d MMM", { locale: es })}`}
        </p>
        <BotonFiltrar filtros={filtros} onClick={() => setFiltrosAbiertos(true)} />
      </div>
      <FiltrosActivos filtros={filtros} onChange={setFiltros} />

      {/* Agenda */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[72px] rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : totalSlots === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-10 px-5 text-center">
          <CalendarX2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium">
            {hayFiltros ? "No hay horarios con esos filtros" : "No hay horarios para este día"}
          </p>
          {filtros.franja !== "todo" ? (
            <button
              onClick={() => setFiltros({ ...filtros, franja: "todo" })}
              className="mt-3 text-sm text-primary font-medium hover:underline"
            >
              Ver todo el día
            </button>
          ) : diasConHueco.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Los próximos días con horarios libres:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {diasConHueco.map((d) => {
                  const fecha = new Date(d.date + "T00:00:00");
                  return (
                    <button
                      key={d.date}
                      onClick={() => setDay(fecha)}
                      className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-left hover:bg-primary/10 transition-colors"
                    >
                      <span className="block text-sm font-medium capitalize">
                        {format(fecha, "EEE d MMM", { locale: es })}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {d.slots} {d.slots === 1 ? "horario" : "horarios"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">
              {proximos
                ? filtros.modalidad === "in_person"
                  ? "No hay citas presenciales en las próximas dos semanas."
                  : "Tampoco hay en las próximas dos semanas. Prueba con otra especialidad."
                : "Buscando los próximos días con horarios…"}
            </p>
          )}
          {filtros.modalidad !== "any" && (
            <button
              onClick={() => setFiltros({ ...filtros, modalidad: "any" })}
              className="mt-3 block mx-auto text-sm text-primary font-medium hover:underline"
            >
              Ver todas las modalidades
            </button>
          )}
        </div>
      ) : (
        <SlotList slots={slots} costoDe={costoDe} onElegir={abrirSlot} />
      )}

      <FiltrosSheet
        abierto={filtrosAbiertos}
        filtros={filtros}
        onAplicar={setFiltros}
        onCerrar={() => setFiltrosAbiertos(false)}
        mostrarPresencial={data?.hasInPerson ?? true}
      />

      {elegido && (
        <BookingSheet
          slot={elegido}
          day={day}
          sessionType={tipoDe(elegido.tier)}
          creditCost={costoDe(elegido.tier)}
          saldo={saldo}
          onClose={() => setElegido(null)}
          onBooked={() => {
            setElegido(null);
            refetch();
            navigate("/citas");
          }}
        />
      )}
    </div>
  );
}
