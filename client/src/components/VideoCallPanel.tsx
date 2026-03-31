// client/src/components/VideoCallPanel.tsx
import { useEffect, useRef, useState, useCallback } from "react";
import DailyIframe, { DailyCall } from "@daily-co/daily-js";

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
  appointmentId,
  professionalName,
  startTime,
  endTime,
  onLeave,
}: VideoCallPanelProps) {
  const callRef = useRef<DailyCall | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<{ sender: string; text: string; time: string }[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const timeLeft = useCountdown(endTime);

  const initCall = useCallback(async () => {
    if (!containerRef.current || callRef.current) return;
    const call = DailyIframe.createCallObject({
      url: roomUrl,
      dailyConfig: { experimentalChromeVideoMuteLightOff: true },
    });
    callRef.current = call;

    call.on("app-message", (e: any) => {
      if (e?.data?.type === "chat") {
        setMessages((prev) => [...prev, {
          sender: e.data.sender,
          text: e.data.text,
          time: new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
        }]);
      }
    });

    call.on("left-meeting", () => { onLeave?.(); });

    await call.join({ url: roomUrl });
    setJoined(true);
  }, [roomUrl, onLeave]);

  useEffect(() => {
    initCall();
    return () => {
      callRef.current?.destroy();
      callRef.current = null;
    };
  }, [initCall]);

  const toggleMic = () => {
    callRef.current?.setLocalAudio(muted);
    setMuted(!muted);
  };

  const toggleCam = () => {
    callRef.current?.setLocalVideo(camOff);
    setCamOff(!camOff);
  };

  const sendMessage = () => {
    if (!msgInput.trim() || !callRef.current) return;
    callRef.current.sendAppMessage({
      type: "chat",
      sender: "Tú",
      text: msgInput.trim(),
    }, "*");
    setMessages((prev) => [...prev, {
      sender: "Tú",
      text: msgInput.trim(),
      time: new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
    }]);
    setMsgInput("");
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
            background: joined ? "#607562" : "#666",
            boxShadow: joined ? "0 0 0 3px rgba(96,117,98,0.3)" : "none",
          }} />
          <span style={{ color: "#c8d4c8", fontSize: "13px", fontWeight: 500 }}>
            {professionalName}
          </span>
        </div>
        <span style={{
          color: "#93a295",
          fontSize: "12px",
          background: "#1a1f1a",
          padding: "4px 10px",
          borderRadius: "20px",
          border: "1px solid #2e362e",
        }}>
          {timeLeft}
        </span>
      </div>

      {/* Video area */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        {!joined && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: "12px",
          }}>
            <div style={{
              width: "40px", height: "40px", borderRadius: "50%",
              border: "2px solid #607562",
              borderTopColor: "transparent",
              animation: "spin 0.8s linear infinite",
            }} />
            <span style={{ color: "#93a295", fontSize: "13px" }}>Conectando...</span>
          </div>
        )}
      </div>

      {/* Chat panel */}
      {chatOpen && (
        <div style={{
          height: "200px",
          background: "#232823",
          borderTop: "1px solid #2e362e",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}>
          <div style={{
            flex: 1, overflowY: "auto",
            padding: "10px 12px",
            display: "flex", flexDirection: "column", gap: "8px",
          }}>
            {messages.length === 0 && (
              <span style={{ color: "#666", fontSize: "12px", textAlign: "center", marginTop: "16px" }}>
                Sin mensajes aún
              </span>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "11px", color: "#607562", fontWeight: 500 }}>{m.sender}</span>
                  <span style={{ fontSize: "10px", color: "#555" }}>{m.time}</span>
                </div>
                <span style={{ fontSize: "13px", color: "#c8d4c8" }}>{m.text}</span>
              </div>
            ))}
          </div>
          <div style={{
            padding: "8px 12px",
            borderTop: "1px solid #2e362e",
            display: "flex", gap: "8px",
          }}>
            <input
              value={msgInput}
              onChange={(e) => setMsgInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Escribe un mensaje..."
              style={{
                flex: 1, background: "#1a1f1a", border: "1px solid #2e362e",
                borderRadius: "8px", padding: "6px 10px",
                color: "#c8d4c8", fontSize: "13px", outline: "none",
              }}
            />
            <button
              onClick={sendMessage}
              style={{
                background: "#607562", border: "none", borderRadius: "8px",
                padding: "6px 12px", color: "#fff", fontSize: "13px", cursor: "pointer",
              }}
            >
              ↑
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
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
        {/* Mic */}
        <button onClick={toggleMic} title={muted ? "Activar micrófono" : "Silenciar"} style={{
          width: "40px", height: "40px", borderRadius: "50%",
          background: muted ? "#3d1a1a" : "#2e362e",
          border: `1px solid ${muted ? "#7a2a2a" : "#3d4d3d"}`,
          color: muted ? "#e57373" : "#93a295",
          cursor: "pointer", fontSize: "16px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {muted ? "🔇" : "🎤"}
        </button>

        {/* Cam */}
        <button onClick={toggleCam} title={camOff ? "Activar cámara" : "Apagar cámara"} style={{
          width: "40px", height: "40px", borderRadius: "50%",
          background: camOff ? "#3d1a1a" : "#2e362e",
          border: `1px solid ${camOff ? "#7a2a2a" : "#3d4d3d"}`,
          color: camOff ? "#e57373" : "#93a295",
          cursor: "pointer", fontSize: "16px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {camOff ? "🚫" : "📷"}
        </button>

        {/* Chat */}
        <button onClick={() => setChatOpen(!chatOpen)} title="Chat" style={{
          width: "40px", height: "40px", borderRadius: "50%",
          background: chatOpen ? "#1e2e1e" : "#2e362e",
          border: `1px solid ${chatOpen ? "#607562" : "#3d4d3d"}`,
          color: chatOpen ? "#607562" : "#93a295",
          cursor: "pointer", fontSize: "16px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          💬
        </button>

        {/* Leave */}
        <button
          onClick={() => { callRef.current?.leave(); onLeave?.(); }}
          title="Salir de la sesión"
          style={{
            width: "40px", height: "40px", borderRadius: "50%",
            background: "#7a2020", border: "1px solid #9e2a2a",
            color: "#fff", cursor: "pointer", fontSize: "16px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          ✕
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
