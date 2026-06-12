import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { parseLocalDate } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { VideoCallPanel } from "./VideoCallPanel";
import { Video, X } from "lucide-react";

interface ActiveAppt {
  id: number;
  roomUrl: string;
  professionalName: string;
  startTime: Date;
  endTime: Date;
}

function findActive(appointments: any[]): ActiveAppt | null {
  const now = Date.now();
  const fiveMin = 5 * 60 * 1000;
  const apt = appointments.find((a) => {
    if (a.status !== "scheduled" && a.status !== "in_progress") return false;
    const videoLink = (a as any).videoCallLink ?? (a as any).roomUrl;
    if (!videoLink) return false;
    const start = parseLocalDate(a.appointmentDate).getTime();
    const duration = ((a as any).durationMinutes ?? 60) * 60 * 1000;
    return now >= start - fiveMin && now < start + duration;
  });
  if (!apt) return null;
  const start = parseLocalDate(apt.appointmentDate);
  const end = new Date(start.getTime() + ((apt as any).durationMinutes ?? 60) * 60 * 1000);
  return {
    id: apt.id,
    roomUrl: (apt as any).videoCallLink ?? (apt as any).roomUrl,
    professionalName:
      (apt as any).professionalName ??
      (apt as any).userName ??
      (apt as any).clientName ??
      `Sesión #${apt.id}`,
    startTime: start,
    endTime: end,
  };
}

export default function ActiveSessionBanner() {
  const { user, isAuthenticated } = useAuth();
  const isProfessional = user?.role === "professional";

  const { data: userApts } = trpc.user.getAppointments.useQuery(undefined, {
    enabled: isAuthenticated && !isProfessional,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  const { data: proApts } = trpc.professional.getAppointments.useQuery(undefined, {
    enabled: isAuthenticated && isProfessional,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  const [active, setActive] = useState<ActiveAppt | null>(null);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const [callOpen, setCallOpen] = useState(false);

  useEffect(() => {
    const aptList = isProfessional ? (proApts as any[]) : (userApts as any[]);
    if (!aptList) return;

    const check = () => {
      const found = findActive(aptList);
      setActive((prev) => {
        if (!found) return null;
        if (found.id === dismissed) return null;
        if (prev?.id === found.id) return prev;
        return found;
      });
    };

    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [userApts, proApts, isProfessional, dismissed]);

  if (!active || !isAuthenticated) return null;

  return (
    <>
      <div
        className="fixed top-0 left-0 right-0 z-[55] flex items-center gap-3 px-4 py-2.5 text-white"
        style={{ background: "linear-gradient(90deg,#1a7a1a,#22a022)" }}
      >
        <div
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{ width: 32, height: 32, background: "rgba(255,255,255,0.2)" }}
        >
          <Video className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold leading-tight truncate">
            Tu sesión con {active.professionalName} comienza ahora
          </p>
        </div>

        <button
          onClick={() => setCallOpen(true)}
          className="flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold transition-opacity hover:opacity-90 active:opacity-75"
          style={{ background: "#fff", color: "#1a7a1a" }}
        >
          <Video className="w-3.5 h-3.5" />
          Unirse
        </button>

        <button
          onClick={() => { setDismissed(active.id); setActive(null); }}
          className="flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {callOpen && (
        <VideoCallPanel
          roomUrl={active.roomUrl}
          appointmentId={active.id}
          professionalName={active.professionalName}
          startTime={active.startTime}
          endTime={active.endTime}
          onLeave={() => setCallOpen(false)}
        />
      )}
    </>
  );
}
