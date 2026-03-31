// client/src/components/VideoCallPanel.tsx
import { useEffect, useRef, useState } from "react";

interface VideoCallPanelProps {
  roomUrl: string;
  appointmentId: number;
  professionalName: string;
  startTime: Date;
  endTime: Date;
  onLeave?: () => void;
}

function useCountdown(endTime: Date) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const tick = () => {
      const diff = endTime.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Sesión finalizada"); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}:${s.toString().padStart(2, "0")} restantes`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);
  return timeLeft;
}

export function VideoCallPanel({
  roomUrl,
  professionalName,
  endTime,
  onLeave,
}: VideoCallPanelProps) {
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeLeft = useCountdown(endTime);

  // Construir URL con parámetros para ocultar UI de Daily
  const embedUrl = `${roomUrl}?embed&showLeaveButton=false&showFullscreenButton=false&userName=${encodeURIComponent(professionalName)}`;

  const handleLeave = () => {
    onLeave?.();
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "#1a1f1a",
      borderRadius: "16px",
      overflow: "hidden",
      fontFamily: "system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px",
        background: "#232823",
        borderBottom: "1px solid #2e362e",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "8px", height: "8px", borderRadius: "50%",
            background: "#607562",
            boxShadow: "0 0 0 3px rgba(96,117,98,0.3)",
          }} />
          <span style={{ color: "#c8d4c8", fontSize: "13px", fontWeight: 500 }}>
            {professionalName}
          </span>
        </div>
        <span style={{
          color: "#93a295", fontSize: "12px",
          background: "#1a1f1a", padding: "4px 10px",
          borderRadius: "20px", border: "1px solid #2e362e",
        }}>
          {timeLeft}
        </span>
      </div>

      {/* iframe de Daily embebido */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <iframe
          ref={iframeRef}
          src={embedUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block",
          }}
          title="Videollamada"
        />
      </div>

      {/* Botón salir */}
      <div style={{
        padding: "12px 16px",
        background: "#232823",
        borderTop: "1px solid #2e362e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        flexShrink: 0,
      }}>
        <span style={{ color: "#93a295", fontSize: "12px" }}>
          Los controles de audio/video están dentro de la sala
        </span>
        <button
          onClick={handleLeave}
          style={{
            background: "#7a2020", border: "1px solid #9e2a2a",
            borderRadius: "20px", padding: "8px 20px",
            color: "#fff", fontSize: "13px", cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Salir de la sesión
        </button>
      </div>
    </div>
  );
}
