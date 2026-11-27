import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import DashboardLayout from "@/components/DashboardLayout";
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
import { ArrowLeft, CalendarX2, Search, X } from "lucide-react";

/** Filtros iniciales desde la URL, para que /sesiones?modalidad=presencial funcione. */
function filtrosDeUrl(): Filtros {
  if (typeof window === "undefined") return { ...FILTROS_INICIALES };
  const q = new URLSearchParams(window.location.search);
  const m = q.get("modalidad");
  return {
    ...FILTROS_INICIALES,
    modalidad: m === "presencial" ? "in_person" : m === "online" ? "online" : "any",
  };
}

/**
 * Buscar sesiones: todos los horarios libres del día, de todas las
 * especialidades, con filtro de modalidad, franja y especialidad, y búsqueda
 * por nombre del especialista.
 *
 * Es para quien sabe cuándo puede pero no necesariamente con quién: abre el
 * día y aparta directo.
 */
export default function SearchSessions() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { tipoDe, costoDe, saldo } = useCostoSesion();

  const [day, setDay] = useState(() => new Date());
  const [filtros, setFiltros] = useState<Filtros>(filtrosDeUrl);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [texto, setTexto] = useState("");
  const [elegido, setElegido] = useState<AgendaSlot | null>(null);

  const { data: especialidades } = trpc.specialty.getAll.useQuery(undefined, { staleTime: 5 * 60_000 });
  const listaEspecialidades = useMemo(
    () =>
      ((especialidades ?? []) as any[])
        .filter((e) => (e.professionalCount ?? 1) > 0)
        .map((e) => ({ id: Number(e.id), name: String(e.name) })),
    [especialidades]
  );

  const fechaISO = format(day, "yyyy-MM-dd");
  const { data, isLoading, refetch } = trpc.appointment.searchSessions.useQuery({
    date: fechaISO,
    specialtyId: filtros.especialidadId ?? undefined,
    modality: filtros.modalidad,
    timezoneOffset: -new Date().getTimezoneOffset(),
  });

  const slots = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return ((data?.slots ?? []) as AgendaSlot[]).filter(
      (s) =>
        enFranja(s.time, filtros.franja) &&
        (!q ||
          s.professionalName.toLowerCase().includes(q) ||
          (s.specialtyName ?? "").toLowerCase().includes(q))
    );
  }, [data, filtros.franja, texto]);

  const nombreEspecialidad = listaEspecialidades.find((e) => e.id === filtros.especialidadId)?.name ?? null;

  const abrirSlot = (slot: AgendaSlot) => {
    if (!isAuthenticated) {
      sessionStorage.setItem("loginReturnTo", "/sesiones");
      navigate(getLoginUrl("/sesiones"));
      return;
    }
    setElegido(slot);
  };

  return (
    <DashboardLayout>
      <div className="bg-white min-h-full">
        <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-6 space-y-4">
          <div>
            <div className="flex items-center gap-3 mb-0.5">
              <button
                onClick={() => navigate("/especialidades")}
                aria-label="Volver a especialidades"
                className="text-gray-400 hover:text-[#5B6A57] flex-shrink-0 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Buscar sesiones</h1>
            </div>
            <p className="text-sm text-gray-400 pl-8">Horarios libres de todas las especialidades</p>
          </div>

          {/* Búsqueda + filtro */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="search"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Especialista o especialidad…"
                className="w-full h-10 pl-9 pr-9 rounded-full text-sm bg-gray-50 border border-gray-200 outline-none focus:ring-2 focus:ring-[#5B6A57]/20 focus:border-[#5B6A57]/40"
              />
              {texto && (
                <button
                  onClick={() => setTexto("")}
                  aria-label="Borrar búsqueda"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <BotonFiltrar filtros={filtros} onClick={() => setFiltrosAbiertos(true)} />
          </div>
          <FiltrosActivos filtros={filtros} onChange={setFiltros} nombreEspecialidad={nombreEspecialidad} />

          <DayStrip value={day} onChange={setDay} />

          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Buscando sesiones…"
              : slots.length === 0
                ? "Sin sesiones libres"
                : `${slots.length} ${slots.length === 1 ? "sesión libre" : "sesiones libres"} · ${format(day, "EEEE d 'de' MMMM", { locale: es })}`}
          </p>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-[72px] rounded-xl bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-12 px-5 text-center">
              <CalendarX2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-medium">No hay sesiones con esa búsqueda este día</p>
              <p className="text-sm text-muted-foreground mt-1">Prueba otro día en la tira de arriba.</p>
              {(texto || filtros.modalidad !== "any" || filtros.franja !== "todo" || filtros.especialidadId) && (
                <button
                  onClick={() => {
                    setTexto("");
                    setFiltros({ ...FILTROS_INICIALES });
                  }}
                  className="mt-3 text-sm text-primary font-medium hover:underline"
                >
                  Quitar filtros
                </button>
              )}
            </div>
          ) : (
            <SlotList slots={slots} costoDe={costoDe} onElegir={abrirSlot} mostrarEspecialidad />
          )}
        </div>
      </div>

      <FiltrosSheet
        abierto={filtrosAbiertos}
        filtros={filtros}
        onAplicar={setFiltros}
        onCerrar={() => setFiltrosAbiertos(false)}
        especialidades={listaEspecialidades}
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
    </DashboardLayout>
  );
}
