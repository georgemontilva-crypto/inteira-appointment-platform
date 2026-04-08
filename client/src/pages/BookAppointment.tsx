import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PRICING } from "@/lib/pricing";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useRoute, useLocation } from "wouter";
import DashboardLayout from "../components/DashboardLayout";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import {
  Clock, Video, CheckCircle2, Calendar as CalendarIcon,
  AlertCircle, Star, Wallet,
} from "lucide-react";
import { format, addMinutes, isBefore, startOfDay } from "date-fns";
import { es } from "date-fns/locale";


export default function BookAppointment() {
  const [, params] = useRoute("/agendar/:id");
  const [, navigate] = useLocation();
  const professionalId = parseInt(params?.id ?? "0");

  const { isAuthenticated, loading } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<"basic" | "premium">("basic");

  const [notes, setNotes] = useState("");
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [step, setStep] = useState<"date" | "time" | "confirm" | "done">("date");
  const [confirmedVideoLink, setConfirmedVideoLink] = useState<string | null>(null);

  const SESSION_INFO = {
    basic:   { label: "Sesión Básica",   duration: "60 min", credits: PRICING.SESSION_BASIC_MXN  },
    premium: { label: "Sesión Premium",  duration: "90 min", credits: PRICING.SESSION_PREMIUM_MXN },
  } as const;
  const SESSION_DURATION_MINUTES = { basic: 60, premium: 90 } as const;

  // Wallet query for credit balance indicator
  const { data: wallet } = trpc.user.getWallet.useQuery(undefined, { enabled: isAuthenticated });
  const SESSION_COST = SESSION_INFO[sessionType].credits;
  const hasEnoughCredits = (wallet?.balance ?? 0) >= SESSION_COST;

  const { data: professional } = trpc.professional.getById.useQuery(
    { id: professionalId },
    { enabled: professionalId > 0 }
  );

  const { data: availableSlots, isLoading: loadingSlots } = trpc.appointment.getAvailableSlots.useQuery(
    {
      professionalId,
      date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : "",
      sessionType,
      timezoneOffset: new Date().getTimezoneOffset() * -1,
    },
    { enabled: !!selectedDate && professionalId > 0 }
  );

  const bookMutation = trpc.appointment.scheduleAppointment.useMutation({
    onSuccess: (data) => {
      setConfirmedVideoLink((data as any)?.videoCallLink ?? null);
      setStep("done");
      toast.success("¡Cita agendada exitosamente!");
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message ?? "Error al agendar la cita");
    },
  });

  const handleSessionTypeChange = (type: "basic" | "premium") => {
    setSessionType(type);
    setSelectedSlot(null);
    if (selectedDate) setStep("time");
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setPolicyAccepted(false);
    if (date) setStep("time");
  };

  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot);
    setStep("confirm");
  };

  const handleConfirm = () => {
    if (!selectedDate || !selectedSlot) return;
    const [hours, minutes] = selectedSlot.split(":").map(Number);
    const appointmentDate = new Date(selectedDate);
    appointmentDate.setHours(hours, minutes, 0, 0);

    bookMutation.mutate({
      professionalId,
      appointmentDate: appointmentDate.toISOString(),
      sessionType,
      notes: notes || undefined,
    });
  };

  // Disable past dates and dates less than 30 minutes from now
  const disabledDays = (date: Date) => {
    const minDate = addMinutes(new Date(), 30);
    return isBefore(startOfDay(date), startOfDay(minDate));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-sm w-full mx-4">
          <CardContent className="p-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-primary mx-auto" />
            <h2 className="text-xl font-bold">Inicia sesión para agendar</h2>
            <p className="text-muted-foreground text-sm">Necesitas una cuenta para agendar citas con especialistas.</p>
            <a href={getLoginUrl()}>
              <Button className="w-full gradient-brand text-white border-0">Iniciar sesión</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-10 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "Poppins, sans-serif" }}>
                ¡Cita confirmada!
              </h2>
              <p className="text-muted-foreground">
                Tu cita ha sido agendada exitosamente. Recibirás un email de confirmación con el enlace de videollamada.
              </p>
            </div>
            {selectedDate && selectedSlot && (
              <div className="bg-primary/5 rounded-xl p-4 text-left space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  <span>{format(selectedDate, "EEEE d 'de' MMMM yyyy", { locale: es })}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>{selectedSlot} hrs</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Video className="w-4 h-4 text-primary" />
                  <span>Videollamada integrada</span>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <Link href="/dashboard" className="flex-1">
                <Button className="w-full gradient-brand text-white border-0">
                  Ir a mi dashboard
                </Button>
              </Link>
              <Link href="/especialidades" className="flex-1">
                <Button variant="outline" className="w-full border-primary/30 text-primary">
                  Ver más especialistas
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="container py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>Agendar cita</h1>
          {professional && (
            <p className="text-sm text-muted-foreground mt-1">
              con {professional.user?.name ?? `Especialista #${professional.id}`}
            </p>
          )}
        </div>
        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-8">
          {["Fecha", "Hora", "Confirmar"].map((label, i) => {
            const stepKeys = ["date", "time", "confirm"];
            const currentIdx = stepKeys.indexOf(step);
            const isActive = i === currentIdx;
            const isDone = i < currentIdx;
            return (
              <div key={i} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isActive ? "gradient-brand text-white" :
                  isDone ? "bg-emerald-100 text-emerald-700" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : <span>{i + 1}</span>}
                  {label}
                </div>
                {i < 2 && <div className="w-8 h-0.5 bg-border" />}
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main flow */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            {/* Session type selector */}
            <Card className="border-border mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Video className="w-5 h-5 text-primary" />
                  Tipo de sesión
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  {(["basic", "premium"] as const).map((type) => {
                    const info = SESSION_INFO[type];
                    return (
                      <div
                        key={type}
                        onClick={() => handleSessionTypeChange(type)}
                        style={{
                          padding: "16px", borderRadius: "12px", cursor: "pointer",
                          border: sessionType === type ? "2px solid #607562" : "1px solid #e0e8e0",
                          background: sessionType === type ? "#eef2ee" : "#fff",
                        }}
                      >
                        <p style={{ fontWeight: 600, color: "#333", margin: 0 }}>{info.label}</p>
                        <p style={{ fontSize: "13px", color: "#666", margin: "4px 0" }}>{info.duration}</p>
                        <p style={{ fontSize: "15px", fontWeight: 600, color: "#607562", margin: 0 }}>{info.credits} créditos</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Date + Time side by side */}
            <Card className="border-border mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  Selecciona fecha y hora
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-start">
                  {/* Calendar */}
                  <div>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      disabled={disabledDays}
                      locale={es}
                      className="rounded-xl border border-border"
                    />
                    <p className="text-xs text-muted-foreground text-center mt-3">
                      Las citas deben agendarse con al menos 30 minutos de anticipación
                    </p>
                  </div>

                  {/* Slots */}
                  <div>
                    {!selectedDate ? (
                      <p className="text-sm text-muted-foreground pt-4">
                        Selecciona una fecha para ver los horarios disponibles
                      </p>
                    ) : loadingSlots ? (
                      <div className="grid grid-cols-2 gap-2">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
                        ))}
                      </div>
                    ) : !availableSlots || availableSlots.length === 0 ? (
                      <div className="text-center py-8">
                        <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground">No hay horarios disponibles para esta fecha</p>
                        <p className="text-sm text-muted-foreground mt-1">Selecciona otro día</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-muted-foreground mb-3">
                          Horarios para el {format(selectedDate, "d 'de' MMMM", { locale: es })}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {availableSlots.map((slot) => (
                            <button
                              key={slot}
                              onClick={() => handleSlotSelect(slot)}
                              className={`py-2 px-3 rounded-lg text-sm font-medium transition-all border ${
                                selectedSlot === slot
                                  ? "gradient-brand text-white border-transparent shadow-md"
                                  : "border-border hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Confirm */}
            {selectedDate && selectedSlot && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Video className="w-5 h-5 text-primary" />
                    Confirmar cita
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Notas para el especialista (opcional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Describe brevemente el motivo de tu consulta..."
                      className="w-full rounded-xl border border-border p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary min-h-[100px] bg-background"
                    />
                  </div>

                  {/* Política de cancelación */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800">⚠️ Política de cancelación</p>
                        <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                          Puedes cancelar sin costo hasta 4 horas antes de tu cita.<br />
                          Si cancelas con menos de 4 horas o no te presentas, perderás los créditos de esta sesión.
                        </p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={policyAccepted}
                        onChange={(e) => setPolicyAccepted(e.target.checked)}
                        className="w-4 h-4 rounded border-amber-400 accent-amber-600"
                      />
                      <span className="text-sm text-amber-800 font-medium">
                        Entendido — acepto la política de cancelación
                      </span>
                    </label>
                  </div>

                  <Button
                    onClick={handleConfirm}
                    disabled={bookMutation.isPending || !policyAccepted || !hasEnoughCredits}
                    className="w-full gradient-brand text-white border-0 shadow-md shadow-primary/30 h-12 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bookMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Agendando...
                      </div>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Confirmar cita
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar: Professional summary */}
          <div className="order-1 lg:order-2">
            {professional && (
              <Card className="border-border lg:sticky lg:top-6">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                      {professional.user?.name?.charAt(0) ?? "P"}
                    </div>
                    <div>
                      <p className="font-bold">{professional.user?.name ?? `Especialista #${professional.id}`}</p>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-accent text-accent" />
                        <span className="text-xs">{professional.averageRating ?? "5.0"}</span>
                        <span className="text-xs text-muted-foreground">({professional.totalReviews ?? 0})</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-primary/5 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wide">Resumen de cita</p>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span>{SESSION_INFO[sessionType].label}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-primary" />
                        <span>{SESSION_INFO[sessionType].duration} · {SESSION_INFO[sessionType].credits} créditos</span>
                      </div>
                      {selectedDate && (
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarIcon className="w-4 h-4 text-primary" />
                          <span>{format(selectedDate, "d 'de' MMMM yyyy", { locale: es })}</span>
                        </div>
                      )}
                      {selectedSlot && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-primary" />
                          <span>{selectedSlot} hrs</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <Video className="w-4 h-4 text-primary" />
                        <span>Videollamada integrada</span>
                      </div>
                    </div>

                  {/* Wallet / credit balance indicator */}
                  {isAuthenticated && (
                    <div className={`rounded-xl p-3 border ${
                      hasEnoughCredits
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-red-50 border-red-200"
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Wallet className={`w-4 h-4 ${hasEnoughCredits ? "text-emerald-600" : "text-red-500"}`} />
                        <span className={`text-xs font-semibold ${hasEnoughCredits ? "text-emerald-700" : "text-red-600"}`}>
                          Tu saldo
                        </span>
                      </div>
                      <p className={`text-lg font-bold ${hasEnoughCredits ? "text-emerald-700" : "text-red-600"}`}>
                        {(wallet?.balance ?? 0).toLocaleString("es-MX")} créditos
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Costo de sesión: <span className="font-semibold">{SESSION_COST} créditos</span>
                      </p>
                      {!hasEnoughCredits && (
                        <Link href="/planes">
                          <p className="text-xs text-red-600 font-semibold mt-1 underline cursor-pointer">
                            Comprar créditos
                          </p>
                        </Link>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    <p className="flex items-start gap-1">
                      <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      Las citas deben agendarse con al menos 30 minutos de anticipación.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
