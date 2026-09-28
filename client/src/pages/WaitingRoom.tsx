import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VideoCallPanel } from "@/components/VideoCallPanel";
import { CheckCircle2, Clock, Video, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Sala de entrada. Es el único camino a la videollamada: los correos apuntan
 * aquí y no al enlace de Daily, así que sólo las dos partes de la cita pueden
 * entrar. Al confirmar se registra la llegada, que es lo que después permite
 * distinguir quién asistió y quién no.
 */
export default function WaitingRoom() {
  const [, params] = useRoute("/sala/:id");
  const [, navigate] = useLocation();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const appointmentId = Number(params?.id);

  const [inCall, setInCall] = useState<{ url: string } | null>(null);

  // Sin sesión, al login y de vuelta aquí
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const returnTo = `/sala/${appointmentId}`;
      sessionStorage.setItem("loginReturnTo", returnTo);
      navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [authLoading, isAuthenticated, appointmentId, navigate]);

  const { data, isLoading, error, refetch } = trpc.appointment.getRoomAccess.useQuery(
    { appointmentId },
    {
      enabled: isAuthenticated && Number.isFinite(appointmentId),
      // Refresca para ver llegar a la otra persona sin recargar
      refetchInterval: inCall ? false : 10_000,
    }
  );

  const confirmArrival = trpc.appointment.confirmArrival.useMutation({
    onSuccess: (res) => {
      setInCall({ url: res.roomUrl });
      refetch();
    },
    onError: (err: any) => toast.error(err?.message ?? "No se pudo entrar a la sala"),
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-border">
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
            <p className="font-semibold text-lg">No pudimos abrir la sala</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
            <Button variant="outline" onClick={() => navigate("/citas")}>Ir a mis citas</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  if (inCall) {
    return (
      <VideoCallPanel
        roomUrl={inCall.url}
        appointmentId={appointmentId}
        professionalName={data.otherName}
        selfName={user?.name ?? (data.role === "professional" ? "Profesional" : "Paciente")}
        startTime={new Date(data.startsAt)}
        endTime={new Date(data.endsAt)}
        onLeave={() => {
          setInCall(null);
          navigate(data.role === "professional" ? "/panel-profesional" : "/citas");
        }}
      />
    );
  }

  const start = new Date(data.startsAt);
  const soyProfesional = data.role === "professional";
  const otherLabel = soyProfesional ? "el paciente" : "el especialista";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="max-w-lg w-full border-border">
        <CardContent className="p-7 space-y-6">
          <div className="text-center space-y-1">
            <div className="w-14 h-14 rounded-2xl gradient-brand mx-auto flex items-center justify-center mb-3">
              <Video className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
              Sesión con {data.otherName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {format(start, "EEEE d 'de' MMMM, HH:mm", { locale: es })} · {data.durationMinutes} min
            </p>
          </div>

          {data.isCanceled ? (
            <div className="rounded-xl bg-red-50 text-red-700 p-4 text-sm text-center">
              Esta cita ya fue cerrada y no se puede entrar.
            </div>
          ) : data.isOver ? (
            <div className="rounded-xl bg-muted p-4 text-sm text-center text-muted-foreground">
              La sesión ya terminó. La sala está cerrada.
            </div>
          ) : !data.canEnter ? (
            <div className="rounded-xl bg-amber-50 text-amber-800 p-4 text-sm text-center space-y-1">
              <Clock className="w-5 h-5 mx-auto" />
              <p className="font-medium">Todavía no es hora</p>
              <p>
                La sala abre a las {format(new Date(data.opensAt), "HH:mm", { locale: es })},
                diez minutos antes de empezar.
              </p>
            </div>
          ) : (
            <>
              {/* Estado de llegada de ambos */}
              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${data.myArrivedAt ? "text-emerald-500" : "text-muted-foreground/40"}`} />
                  <div className="text-sm">
                    <p className="font-medium">Tú</p>
                    <p className="text-[12px] text-muted-foreground">
                      {data.myArrivedAt
                        ? `Confirmaste a las ${format(new Date(data.myArrivedAt), "HH:mm")}`
                        : "Aún no has confirmado tu llegada"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${data.otherArrivedAt ? "text-emerald-500" : "text-muted-foreground/40"}`} />
                  <div className="text-sm">
                    <p className="font-medium">{data.otherName}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {data.otherArrivedAt
                        ? `Llegó a las ${format(new Date(data.otherArrivedAt), "HH:mm")}`
                        : `Esperando a ${otherLabel}…`}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                className="w-full h-12 text-base"
                onClick={() => confirmArrival.mutate({ appointmentId })}
                disabled={confirmArrival.isPending}
              >
                {confirmArrival.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Entrando…</>
                ) : (
                  <>Estoy aquí, entrar a la sesión</>
                )}
              </Button>

              <p className="text-[12px] text-muted-foreground text-center leading-relaxed">
                Al entrar queda registrada tu asistencia.
                {soyProfesional
                  ? " Si no ingresas, la sesión se reembolsa al paciente y no se genera pago."
                  : " Si el especialista no ingresa, se te devuelven los créditos automáticamente."}
              </p>
            </>
          )}

          <button
            onClick={() => navigate(soyProfesional ? "/panel-profesional" : "/citas")}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Volver a mis citas
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
