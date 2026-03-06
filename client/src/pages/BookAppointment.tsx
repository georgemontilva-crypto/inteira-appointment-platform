import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useRoute, useLocation } from "wouter";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import {
  ArrowLeft, Clock, Video, CheckCircle2, Calendar as CalendarIcon,
  AlertCircle, Star, Wallet,
} from "lucide-react";
import { format, addHours, isBefore, startOfDay } from "date-fns";
import { es } from "date-fns/locale";

const VIDEO_PROVIDERS = [
  { value: "zoom", label: "Zoom", icon: "🎥" },
  { value: "google_meet", label: "Google Meet", icon: "📹" },
];

export default function BookAppointment() {
  const [, params] = useRoute("/agendar/:id");
  const [, navigate] = useLocation();
  const professionalId = parseInt(params?.id ?? "0");

  const { isAuthenticated, loading } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [videoProvider, setVideoProvider] = useState<"zoom" | "google_meet">("zoom");
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<"date" | "time" | "confirm" | "done">("date");

  // Wallet query for credit balance indicator
  const { data: wallet } = trpc.user.getWallet.useQuery(undefined, { enabled: isAuthenticated });
  const SESSION_COST = 350;
  const hasEnoughCredits = (wallet?.balance ?? 0) >= SESSION_COST;

  const { data: professional } = trpc.professional.getById.useQuery(
    { id: professionalId },
    { enabled: professionalId > 0 }
  );

  const { data: availableSlots, isLoading: loadingSlots } = trpc.appointment.getAvailableSlots.useQuery(
    {
      professionalId,
      date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : "",
    },
    { enabled: !!selectedDate && professionalId > 0 }
  );

  const bookMutation = trpc.appointment.scheduleAppointment.useMutation({
    onSuccess: () => {
      setStep("done");
      toast.success("¡Cita agendada exitosamente!");
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message ?? "Error al agendar la cita");
    },
  });

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedSlot(null);
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
      videoProvider: videoProvider,
      notes: notes || undefined,
    });
  };

  // Disable past dates and dates less than 4 hours from now
  const disabledDays = (date: Date) => {
    const minDate = addHours(new Date(), 4);
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
                  <span>{videoProvider === "zoom" ? "Zoom" : "Google Meet"}</span>
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-hero text-white py-10">
        <div className="container">
          <Button
            variant="ghost"
            className="text-white/80 hover:text-white hover:bg-white/10 mb-4 -ml-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
            Agendar cita
          </h1>
          {professional && (
            <p className="text-white/80 mt-1">
              con {professional.user?.name ?? `Especialista #${professional.id}`}
            </p>
          )}
        </div>
      </div>

      <div className="container py-8">
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
          <div className="lg:col-span-2">
            {/* Step 1: Date */}
            <Card className="border-border mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  Selecciona una fecha
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={disabledDays}
                    locale={es}
                    className="rounded-xl border border-border"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Las citas deben agendarse con al menos 4 horas de anticipación
                </p>
              </CardContent>
            </Card>

            {/* Step 2: Time slots */}
            {selectedDate && (
              <Card className="border-border mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="w-5 h-5 text-primary" />
                    Horarios disponibles para el {format(selectedDate, "d 'de' MMMM", { locale: es })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingSlots ? (
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
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
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
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
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 3: Confirm */}
            {selectedDate && selectedSlot && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Video className="w-5 h-5 text-primary" />
                    Plataforma de videollamada
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {VIDEO_PROVIDERS.map((provider) => (
                      <button
                        key={provider.value}
                        onClick={() => setVideoProvider(provider.value as "zoom" | "google_meet")}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          videoProvider === provider.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <div className="text-2xl mb-1">{provider.icon}</div>
                        <div className="font-medium text-sm">{provider.label}</div>
                      </button>
                    ))}
                  </div>

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

                  <Button
                    onClick={handleConfirm}
                    disabled={bookMutation.isPending}
                    className="w-full gradient-brand text-white border-0 shadow-md shadow-primary/30 h-12 text-base"
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
          <div>
            {professional && (
              <Card className="border-border sticky top-6">
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

                  {selectedDate && (
                    <div className="bg-primary/5 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wide">Resumen de cita</p>
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarIcon className="w-4 h-4 text-primary" />
                        <span>{format(selectedDate, "d 'de' MMMM yyyy", { locale: es })}</span>
                      </div>
                      {selectedSlot && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-primary" />
                          <span>{selectedSlot} hrs</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <Video className="w-4 h-4 text-primary" />
                        <span>{videoProvider === "zoom" ? "Zoom" : "Google Meet"}</span>
                      </div>
                    </div>
                  )}

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
                      Las citas deben agendarse con al menos 4 horas de anticipación.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
