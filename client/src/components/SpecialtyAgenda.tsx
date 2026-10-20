import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { PRICING } from "@/lib/pricing";
import { formatLocation } from "@shared/locations";
import { DayStrip } from "@/components/DayStrip";
import { BookingSheet, type AgendaSlot } from "@/components/BookingSheet";
import { CalendarX2, Loader2, Star } from "lucide-react";

type SessionType = "basic" | "premium";

/**
 * Agenda del día para una especialidad: en vez de elegir asesor y después mirar
 * su calendario, se ven de una vez todos los huecos libres de ese día.
 *
 * Las filas se agrupan por hora porque la pregunta que trae a esta pantalla es
 * "¿a qué hora puedo?", no "¿quién hay?".
 */
export function SpecialtyAgenda({ slug }: { slug: string }) {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const [day, setDay] = useState(() => new Date());
  const [sessionType, setSessionType] = useState<SessionType>("basic");
  const [elegido, setElegido] = useState<AgendaSlot | null>(null);

  const fechaISO = format(day, "yyyy-MM-dd");

  const { data, isLoading, refetch } = trpc.appointment.getSpecialtyAgenda.useQuery(
    {
      specialtySlug: slug,
      date: fechaISO,
      sessionType,
      timezoneOffset: -new Date().getTimezoneOffset(),
    },
    { enabled: slug.length > 0 }
  );

  const { data: wallet } = trpc.user.getWallet.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  // Mismo criterio que el servidor en userHasActiveMembership: un lote de plan
  // vigente y con saldo. El wallet no expone un indicador de plan listo.
  const esMiembro = Boolean(
    (wallet as any)?.batches?.some(
      (b: any) =>
        (b.source === "plan_basic" || b.source === "plan_pro") &&
        Number(b.remaining) > 0 &&
        !b.expiredEarly &&
        (!b.expiresAt || new Date(b.expiresAt) > new Date())
    )
  );

  const costo = useMemo(() => {
    if (sessionType === "premium") {
      return esMiembro ? PRICING.SESSION_PREMIUM_MEMBER_MXN : PRICING.SESSION_PREMIUM_MXN;
    }
    return esMiembro ? PRICING.SESSION_BASIC_MEMBER_MXN : PRICING.SESSION_BASIC_MXN;
  }, [sessionType, esMiembro]);

  // Agrupar por hora conservando el orden que ya trae el servidor.
  const porHora = useMemo(() => {
    const grupos: { hora: string; slots: AgendaSlot[] }[] = [];
    for (const slot of (data?.slots ?? []) as AgendaSlot[]) {
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.hora === slot.time) ultimo.slots.push(slot);
      else grupos.push({ hora: slot.time, slots: [slot] });
    }
    return grupos;
  }, [data]);

  const totalSlots = data?.slots.length ?? 0;

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

      {/* Tipo de sesión */}
      <div className="flex gap-2">
        {([
          { value: "basic", label: "Básica", precio: esMiembro ? PRICING.SESSION_BASIC_MEMBER_MXN : PRICING.SESSION_BASIC_MXN },
          { value: "premium", label: "Premium", precio: esMiembro ? PRICING.SESSION_PREMIUM_MEMBER_MXN : PRICING.SESSION_PREMIUM_MXN },
        ] as const).map((opt) => {
          const activo = sessionType === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setSessionType(opt.value)}
              className={`flex-1 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                activo
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <span className="block text-sm font-medium">{opt.label}</span>
              <span className="block text-[11px] text-muted-foreground">
                {opt.precio.toLocaleString("es-MX")} créditos · 60 min
              </span>
            </button>
          );
        })}
      </div>

      {/* Resumen del día */}
      <p className="text-sm text-muted-foreground">
        {isLoading
          ? "Buscando horarios…"
          : totalSlots === 0
            ? "Sin horarios libres"
            : `${totalSlots} ${totalSlots === 1 ? "horario libre" : "horarios libres"} · ${format(day, "EEEE d 'de' MMMM", { locale: es })}`}
      </p>

      {/* Agenda */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[72px] rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : totalSlots === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-14 text-center">
          <CalendarX2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium">No hay horarios para este día</p>
          <p className="text-sm text-muted-foreground mt-1">
            Prueba con otra fecha en la tira de arriba.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
          {porHora.map((grupo) =>
            grupo.slots.map((slot, i) => {
              const ubicacion = formatLocation(slot.country, slot.state);
              return (
                <button
                  key={`${grupo.hora}-${slot.professionalId}`}
                  onClick={() => abrirSlot(slot)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                >
                  {/* Hora: solo en la primera fila de cada grupo */}
                  <div className="w-[62px] flex-shrink-0">
                    {i === 0 ? (
                      <>
                        <span className="block font-semibold tabular-nums">{grupo.hora}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {slot.durationMinutes} min
                        </span>
                      </>
                    ) : (
                      <span className="block text-[11px] text-muted-foreground/60">—</span>
                    )}
                  </div>

                  {slot.photo ? (
                    <img
                      src={slot.photo}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover object-top flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full gradient-brand flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                      {slot.professionalName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-primary truncate">
                      {slot.professionalName}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      {slot.averageRating != null && slot.totalReviews > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {slot.averageRating.toFixed(1)}
                        </span>
                      )}
                      {slot.yearsOfExperience ? <span>{slot.yearsOfExperience} años</span> : null}
                      {ubicacion && <span className="truncate">{ubicacion}</span>}
                    </div>
                  </div>

                  <span className="text-[12px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                    {costo.toLocaleString("es-MX")} cr.
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}

      {elegido && (
        <BookingSheet
          slot={elegido}
          day={day}
          sessionType={sessionType}
          creditCost={costo}
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
