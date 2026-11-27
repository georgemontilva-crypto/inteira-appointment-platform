import { useMemo } from "react";
import { formatLocation } from "@shared/locations";
import type { AgendaSlot } from "@/components/BookingSheet";
import { MapPin, Star, Video } from "lucide-react";

/**
 * Lista de horarios agrupada por hora, como en la agenda de una especialidad.
 *
 * Cada fila dice quién atiende, cómo (online, presencial o las dos) y cuánto
 * cuesta. En la búsqueda general también muestra la especialidad.
 */
export function SlotList({
  slots,
  costoDe,
  onElegir,
  mostrarEspecialidad = false,
}: {
  slots: AgendaSlot[];
  costoDe: (tier: string) => number;
  onElegir: (slot: AgendaSlot) => void;
  mostrarEspecialidad?: boolean;
}) {
  const porHora = useMemo(() => {
    const grupos: { hora: string; slots: AgendaSlot[] }[] = [];
    for (const slot of slots) {
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.hora === slot.time) ultimo.slots.push(slot);
      else grupos.push({ hora: slot.time, slots: [slot] });
    }
    return grupos;
  }, [slots]);

  return (
    <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
      {porHora.map((grupo) =>
        grupo.slots.map((slot, i) => {
          const ubicacion = formatLocation(slot.country, slot.state);
          const mods = slot.modalities ?? ["online"];
          const presencial = mods.includes("in_person");
          const online = mods.includes("online");
          return (
            <button
              key={`${grupo.hora}-${slot.professionalId}`}
              onClick={() => onElegir(slot)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
            >
              {/* Hora: solo en la primera fila de cada grupo */}
              <div className="w-[56px] flex-shrink-0">
                {i === 0 ? (
                  <>
                    <span className="block font-semibold tabular-nums">{grupo.hora}</span>
                    <span className="block text-[11px] text-muted-foreground">{slot.durationMinutes} min</span>
                  </>
                ) : (
                  <span className="block text-[11px] text-muted-foreground/60">—</span>
                )}
              </div>

              {slot.photo ? (
                <img src={slot.photo} alt="" className="w-10 h-10 rounded-full object-cover object-top flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full gradient-brand flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {slot.professionalName.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="font-medium text-primary truncate">{slot.professionalName}</p>
                {mostrarEspecialidad && slot.specialtyName && (
                  <p className="text-[11px] font-medium text-foreground/70 truncate">{slot.specialtyName}</p>
                )}
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground min-w-0">
                  {slot.averageRating != null && slot.totalReviews > 0 && (
                    <span className="flex items-center gap-0.5 flex-shrink-0">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {slot.averageRating.toFixed(1)}
                    </span>
                  )}
                  {online && (
                    <span className="flex items-center gap-0.5 flex-shrink-0" title="Online">
                      <Video className="w-3 h-3" />
                      {/* Con las dos modalidades basta el ícono: el espacio es
                          para la ciudad del consultorio. */}
                      {!presencial && "Online"}
                    </span>
                  )}
                  {presencial && (
                    <span className="flex items-center gap-0.5 text-primary min-w-0" title="Presencial">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{slot.clinicCity ?? "Presencial"}</span>
                    </span>
                  )}
                  {!presencial && ubicacion && <span className="truncate">{ubicacion}</span>}
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <span className="block text-[12px] font-medium whitespace-nowrap">
                  {costoDe(slot.tier).toLocaleString("es-MX")} cr.
                </span>
                <span
                  className={`block text-[10px] font-semibold uppercase tracking-wide ${
                    slot.tier === "pro" ? "text-primary" : "text-muted-foreground/70"
                  }`}
                >
                  {slot.tier === "pro" ? "Pro" : "Básico"}
                </span>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
