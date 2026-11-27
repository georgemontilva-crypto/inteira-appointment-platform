import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, MapPin, X } from "lucide-react";

/**
 * El asesor escribe el código de 4 dígitos que le da el cliente al llegar al
 * consultorio. Es lo que prueba que la cita presencial ocurrió y libera el
 * pago al terminar la sesión.
 */
export function CheckinDialog({
  cita,
  onClose,
  onDone,
}: {
  cita: { id: number; userName?: string | null };
  onClose: () => void;
  onDone: () => void;
}) {
  const [digitos, setDigitos] = useState(["", "", "", ""]);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const confirmar = trpc.appointment.confirmCheckin.useMutation({
    onSuccess: () => {
      toast.success("Llegada registrada. El pago se libera al terminar la sesión.");
      onDone();
    },
    onError: (e) => {
      toast.error(e.message, { duration: 7000 });
      setDigitos(["", "", "", ""]);
      refs.current[0]?.focus();
    },
  });

  const codigo = digitos.join("");

  const escribir = (i: number, v: string) => {
    const solo = v.replace(/\D/g, "");
    // Pegar los 4 dígitos de una vez también funciona.
    if (solo.length > 1) {
      const nuevos = solo.slice(0, 4).split("");
      setDigitos([0, 1, 2, 3].map((k) => nuevos[k] ?? ""));
      refs.current[Math.min(nuevos.length, 3)]?.focus();
      return;
    }
    const nuevos = [...digitos];
    nuevos[i] = solo;
    setDigitos(nuevos);
    if (solo && i < 3) refs.current[i + 1]?.focus();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-background w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
                Registrar llegada
              </h2>
              {cita.userName && <p className="text-xs text-muted-foreground">{cita.userName}</p>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-full hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground leading-snug">
          Pídele a tu cliente el código de 4 dígitos que aparece en su cita.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (codigo.length === 4) confirmar.mutate({ appointmentId: cita.id, code: codigo });
          }}
          className="space-y-5"
        >
          <div className="flex justify-center gap-2.5">
            {digitos.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                value={d}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={4}
                aria-label={`Dígito ${i + 1}`}
                onChange={(e) => escribir(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !digitos[i] && i > 0) refs.current[i - 1]?.focus();
                }}
                className="w-14 h-16 text-center text-2xl font-bold rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 tabular-nums"
              />
            ))}
          </div>

          <Button type="submit" className="w-full h-12 text-base" disabled={codigo.length !== 4 || confirmar.isPending}>
            {confirmar.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verificando…
              </>
            ) : (
              "Confirmar llegada"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
