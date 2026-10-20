import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight, Loader2, Star, X } from "lucide-react";
import { formatLocation } from "@shared/locations";
import { toast } from "sonner";

export interface AgendaSlot {
  time: string;              // "09:00"
  durationMinutes: number;
  professionalId: number;
  professionalSlug: string | null;
  professionalName: string;
  photo: string | null;
  tier: string;
  yearsOfExperience: number | null;
  averageRating: number | null;
  totalReviews: number;
  country: string | null;
  state: string | null;
}

/** "09:00" sobre un día dado, en hora local. */
export function slotToDate(day: Date, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0, 0);
}

/**
 * Confirmación antes de apartar la cita.
 *
 * Se resume lo que se va a reservar, se avisa del costo y de la política de
 * cancelación, y no se habilita el botón hasta que la persona confirma que la
 * entendió: apartar consume créditos y conviene que nadie lo haga por accidente.
 */
export function BookingSheet({
  slot,
  day,
  sessionType,
  creditCost,
  onClose,
  onBooked,
}: {
  slot: AgendaSlot;
  day: Date;
  sessionType: "basic" | "premium";
  creditCost: number;
  onClose: () => void;
  onBooked: () => void;
}) {
  const [entendido, setEntendido] = useState(false);
  const inicio = slotToDate(day, slot.time);

  const agendar = trpc.appointment.scheduleAppointment.useMutation({
    onSuccess: () => {
      toast.success("Cita apartada. Te enviamos los detalles por correo.");
      onBooked();
    },
    onError: (err: any) =>
      toast.error(err?.message ?? "No se pudo apartar la cita", { duration: 8000 }),
  });

  const ubicacion = formatLocation(slot.country, slot.state);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-background w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="font-bold text-lg" style={{ fontFamily: "Poppins, sans-serif" }}>
            Confirma tu cita
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-5">
          {/* Asesor */}
          <div className="flex items-center gap-3">
            {slot.photo ? (
              <img
                src={slot.photo}
                alt={slot.professionalName}
                className="w-14 h-14 rounded-xl object-cover object-top flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl gradient-brand flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                {slot.professionalName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold truncate">{slot.professionalName}</p>
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                {slot.averageRating != null && slot.totalReviews > 0 && (
                  <span className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {slot.averageRating.toFixed(1)}
                  </span>
                )}
                {slot.yearsOfExperience ? <span>{slot.yearsOfExperience} años</span> : null}
              </div>
              {ubicacion && (
                <p className="text-[11px] text-muted-foreground truncate">{ubicacion}</p>
              )}
            </div>
          </div>

          {/* Detalle de la cita */}
          <dl className="rounded-xl border border-border divide-y divide-border text-sm">
            <div className="flex justify-between gap-4 px-4 py-2.5">
              <dt className="text-muted-foreground">Fecha</dt>
              <dd className="font-medium text-right capitalize">
                {format(inicio, "EEEE d 'de' MMMM", { locale: es })}
              </dd>
            </div>
            <div className="flex justify-between gap-4 px-4 py-2.5">
              <dt className="text-muted-foreground">Hora</dt>
              <dd className="font-medium">
                {format(inicio, "HH:mm")} · {slot.durationMinutes} min
              </dd>
            </div>
            <div className="flex justify-between gap-4 px-4 py-2.5">
              <dt className="text-muted-foreground">Sesión</dt>
              <dd className="font-medium">
                {sessionType === "premium" ? "Premium" : "Básica"}
              </dd>
            </div>
            <div className="flex justify-between gap-4 px-4 py-2.5">
              <dt className="text-muted-foreground">Costo</dt>
              <dd className="font-semibold">{creditCost.toLocaleString("es-MX")} créditos</dd>
            </div>
          </dl>

          {slot.professionalSlug && (
            <Link
              href={`/profesional/${slot.professionalSlug}`}
              className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm hover:bg-muted/40 transition-colors"
            >
              <span>Ver el perfil de {slot.professionalName.split(" ")[0]}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          )}

          {/* Política de cancelación */}
          <div className="rounded-xl bg-muted/40 p-4 space-y-3">
            <p className="text-[13px] text-muted-foreground leading-snug">
              Los créditos quedan retenidos al apartar y se cobran cuando la sesión
              ocurre. Puedes cancelar sin costo hasta 4 horas antes; después de ese
              plazo la sesión consume los créditos.
            </p>
            <label className="flex items-start gap-2.5 text-sm cursor-pointer">
              <span
                className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                  entendido ? "bg-primary border-primary" : "border-border bg-background"
                }`}
              >
                {entendido && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
              </span>
              <input
                type="checkbox"
                className="sr-only"
                checked={entendido}
                onChange={(e) => setEntendido(e.target.checked)}
              />
              <span className="text-muted-foreground leading-snug">
                Entiendo la política de cancelación.
              </span>
            </label>
          </div>

          <Button
            className="w-full h-12 text-base"
            disabled={!entendido || agendar.isPending}
            onClick={() =>
              agendar.mutate({
                professionalId: slot.professionalId,
                appointmentDate: inicio.toISOString(),
                sessionType,
                timezoneOffset: -new Date().getTimezoneOffset(),
              })
            }
          >
            {agendar.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Apartando…
              </>
            ) : (
              "Apartar cita"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
