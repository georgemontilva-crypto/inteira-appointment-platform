import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import RegisterProfessional from "./RegisterProfessional";

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg:        "#F2F0ED",
  warm:      "#A7774E",
  cool:      "#829BBF",
  brand:     "#5B6A57",
  nude:      "#CBADA6",
  olive:     "#A3A884",
  text:      "#2C2C2C",
  textMuted: "#6B6259",
};

/* ─── Video Modal ─── */
function VideoModal({ videoUrl, onComplete }: { videoUrl: string; onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [canClose, setCanClose] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const TOTAL = 225; // 3:45

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        const next = p + 1;
        if (next >= TOTAL) {
          clearInterval(intervalRef.current!);
          setCanClose(true);
          return TOTAL;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, []);

  const pct = Math.round((progress / TOTAL) * 100);
  const remaining = TOTAL - progress;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  const embedUrl = videoUrl || "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&modestbranding=1";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.92)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 760 }}>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 12, textAlign: "center", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Por favor ve el video completo antes de continuar
        </p>
        <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 12, overflow: "hidden", background: "#0a0a0a" }}>
          <iframe
            src={embedUrl}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
            allow="autoplay; encrypted-media"
            allowFullScreen
            title="Video de bienvenida Inteira"
          />
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: C.warm, fontSize: 13, fontWeight: 600 }}>
              {canClose ? "¡Video completado!" : `Progreso: ${pct}%`}
            </span>
            {!canClose && (
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                Tiempo restante: {mins}:{secs.toString().padStart(2, "0")}
              </span>
            )}
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 6, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${C.brand}, ${C.warm})`,
                borderRadius: 6,
                transition: "width 0.9s linear",
              }}
            />
          </div>
        </div>

        {canClose ? (
          <button
            onClick={onComplete}
            style={{
              marginTop: 24,
              width: "100%",
              padding: "14px",
              background: `linear-gradient(135deg, ${C.brand}, ${C.warm})`,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            Acceder al contenido →
          </button>
        ) : (
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 12, marginTop: 20 }}>
            El botón de acceso se habilitará al terminar el video.
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Section wrapper ─── */
function Section({ id, children, style }: { id?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <section id={id} style={{ fontFamily: "'Poppins', sans-serif", ...style }}>
      {children}
    </section>
  );
}

/* ─── Hero ─── */
function Hero({ bannerUrl }: { bannerUrl: string | null }) {
  const scroll = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const bgStyle: React.CSSProperties = bannerUrl
    ? {
        backgroundImage: `linear-gradient(145deg, rgba(91,106,87,0.85) 0%, rgba(167,119,78,0.7) 100%), url(${bannerUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        background: `linear-gradient(145deg, ${C.brand} 0%, #7a8c76 40%, #9aaa96 70%, ${C.olive} 100%)`,
      };

  return (
    <Section
      style={{
        minHeight: "100vh",
        ...bgStyle,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 24px 60px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: "-10%", right: "-5%", width: 500, height: 500, borderRadius: "50%", background: `rgba(167,119,78,0.1)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-15%", left: "-8%", width: 400, height: 400, borderRadius: "50%", background: `rgba(130,155,191,0.1)`, pointerEvents: "none" }} />

      <div style={{ maxWidth: 1100, width: "100%", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 60, alignItems: "center" }}>
          <div style={{ flex: "1 1 500px" }}>
            <span style={{ display: "inline-block", background: `rgba(242,240,237,0.18)`, color: "#F2F0ED", fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", padding: "6px 14px", borderRadius: 20, marginBottom: 20, border: `1px solid rgba(242,240,237,0.25)` }}>
              Plataforma para profesionales del bienestar
            </span>
            <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 800, color: "#fff", lineHeight: 1.15, marginBottom: 20 }}>
              Transforma tu práctica.<br />
              <span style={{ color: C.nude }}>
                Conecta con quienes te necesitan.
              </span>
            </h1>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.72)", lineHeight: 1.7, marginBottom: 40, maxWidth: 520 }}>
              Inteira es la comunidad donde los profesionales del bienestar mental, emocional y espiritual construyen una práctica sostenible, con propósito y acompañamiento real.
            </p>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <button
                onClick={() => scroll("#registro")}
                style={{ padding: "14px 28px", background: C.warm, color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Poppins', sans-serif" }}
              >
                Quiero ser parte →
              </button>
              <button
                onClick={() => scroll("#identidad")}
                style={{ padding: "14px 28px", background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "'Poppins', sans-serif" }}
              >
                Conocer más
              </button>
            </div>
          </div>

          <div style={{ flex: "0 1 auto", display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { value: "60%", label: "Comisión para el profesional", sub: "en cada sesión completada" },
              { value: "50 min", label: "Duración estándar de sesión", sub: "flexible según tu modalidad" },
              { value: "Lunes", label: "Día de pago semanal", sub: "sin complicaciones ni esperas" },
            ].map((s) => (
              <div key={s.value} style={{ background: "rgba(242,240,237,0.1)", border: `1px solid rgba(242,240,237,0.18)`, borderRadius: 14, padding: "20px 28px", backdropFilter: "blur(8px)", minWidth: 220 }}>
                <p style={{ fontSize: 36, fontWeight: 800, color: C.nude, margin: 0 }}>{s.value}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: "4px 0 2px" }}>{s.label}</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", margin: 0 }}>{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ─── Identidad ─── */
function Identidad() {
  const noSomos = [
    "Un directorio de profesionales de salud convencional",
    "Una plataforma que solo cobra y desaparece",
    "Un espacio donde eres un número más",
    "Una empresa que prioriza cantidad sobre calidad",
    "Un sistema que ignora tu bienestar como profesional",
  ];
  const siSomos = [
    "Una comunidad de profesionales comprometidos con el bienestar integral",
    "Un ecosistema de apoyo, formación y crecimiento continuo",
    "Un espacio donde tu voz y tu historia importan",
    "Una plataforma construida desde y para el propósito",
    "Un equipo que camina contigo, no solo detrás de ti",
  ];
  const areas = [
    "Psicología y salud mental", "Coaching de vida", "Terapia espiritual",
    "Nutrición holística", "Meditación y mindfulness", "Acompañamiento en duelo",
    "Terapia de pareja", "Bienestar emocional", "Consejería familiar",
  ];

  return (
    <Section id="identidad" style={{ padding: "80px 24px", background: C.bg }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <span style={{ display: "inline-block", background: `rgba(163,168,132,0.18)`, color: C.brand, fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", padding: "5px 14px", borderRadius: 20, marginBottom: 14 }}>
            Nuestra Identidad
          </span>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, color: C.brand, margin: 0 }}>
            Sabemos lo que somos.<br />Y lo que no somos.
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, marginBottom: 56 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, border: `1px solid rgba(203,173,166,0.3)` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(220,60,60,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#c0392b" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#c0392b", margin: 0 }}>Lo que NO somos</h3>
            </div>
            {noSomos.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <span style={{ color: "#c0392b", fontSize: 16, flexShrink: 0 }}>✕</span>
                <p style={{ fontSize: 14, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>{t}</p>
              </div>
            ))}
          </div>

          <div style={{ background: "#fff", borderRadius: 16, padding: 32, border: `1px solid ${C.olive}40` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: `rgba(91,106,87,0.1)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={C.brand} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: C.brand, margin: 0 }}>Lo que SÍ somos</h3>
            </div>
            {siSomos.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <span style={{ color: C.warm, fontSize: 16, flexShrink: 0 }}>✓</span>
                <p style={{ fontSize: 14, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>{t}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: C.brand, marginBottom: 20 }}>Áreas de práctica que acompañamos</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {areas.map((a) => (
              <span key={a} style={{ background: "#fff", border: `1px solid ${C.olive}`, color: C.brand, fontSize: 13, fontWeight: 500, padding: "8px 16px", borderRadius: 20 }}>{a}</span>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ─── Historia ─── */
function Historia() {
  return (
    <Section id="historia" style={{ padding: "80px 24px", background: "#fff" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={{ display: "inline-block", background: `rgba(163,168,132,0.18)`, color: C.brand, fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", padding: "5px 14px", borderRadius: 20, marginBottom: 14 }}>
            Nuestra Historia
          </span>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, color: C.brand, margin: 0 }}>
            Todo comenzó con una pregunta honesta
          </h2>
        </div>

        <blockquote style={{ borderLeft: `4px solid ${C.warm}`, paddingLeft: 24, margin: "0 0 32px", background: `rgba(167,119,78,0.06)`, borderRadius: "0 12px 12px 0", padding: "20px 24px" }}>
          <p style={{ fontSize: 18, fontStyle: "italic", color: C.brand, lineHeight: 1.7, margin: 0, fontWeight: 500 }}>
            "¿Por qué los profesionales del bienestar que más cuidan a otros son los que menos tienen herramientas para cuidarse a sí mismos?"
          </p>
        </blockquote>

        <p style={{ fontSize: 15, color: C.textMuted, lineHeight: 1.8, marginBottom: 20 }}>
          Inteira nació de la necesidad real de crear un puente entre quienes tienen el conocimiento y vocación para sanar, y quienes buscan ese acompañamiento con urgencia. Nos dimos cuenta de que el problema no era la falta de buenos profesionales; era la falta de un espacio digno, coherente y humano donde pudieran ejercer.
        </p>

        <p style={{ fontSize: 15, color: C.textMuted, lineHeight: 1.8, marginBottom: 32 }}>
          Durante meses conversamos con terapeutas, coaches, psicólogos y guías espirituales que trabajaban desde sus casas, sin estructura, sin visibilidad y sin comunidad. Escuchamos historias de agotamiento, de clientes no confiables, de plataformas que prometían mucho y cumplían poco. Esas historias se convirtieron en el mapa de lo que Inteira quería ser.
        </p>

        <div style={{ background: `linear-gradient(135deg, rgba(91,106,87,0.06), rgba(163,168,132,0.1))`, borderRadius: 16, padding: 32, marginBottom: 32 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: C.warm, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Una historia que nos marcó</p>
          <p style={{ fontSize: 15, color: C.text, lineHeight: 1.8, margin: 0 }}>
            Una de las primeras profesionales que se unió a Inteira era terapeuta holística. Llevaba tres años trabajando sola, sin certeza de cuántos clientes tendría cada semana. "Vivía con miedo de que mi trabajo no alcanzara para pagar la renta", nos dijo. Hoy, seis meses dentro de la plataforma, tiene agenda completa y por primera vez pudo tomarse vacaciones. Esa transformación es la razón por la que existimos.
          </p>
        </div>

        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: `linear-gradient(135deg, ${C.brand}, ${C.warm})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <span style={{ fontSize: 24, color: "white", fontWeight: 800 }}>"</span>
          </div>
          <p style={{ fontSize: 17, fontStyle: "italic", color: C.brand, lineHeight: 1.7, maxWidth: 600, margin: "0 auto 16px", fontWeight: 500 }}>
            Creamos Inteira para que ningún profesional del bienestar tenga que elegir entre su vocación y su estabilidad. Los dos pueden coexistir, y es nuestra misión demostrarlo.
          </p>
          <p style={{ fontSize: 13, fontWeight: 600, color: C.warm, margin: 0 }}>— Fundadora, Inteira</p>
        </div>
      </div>
    </Section>
  );
}

/* ─── Misión / Visión / Valores ─── */
function MisionValores() {
  const valores = [
    { icon: "🌱", title: "Crecimiento continuo", desc: "Creemos que siempre hay más por aprender y más por dar." },
    { icon: "🤝", title: "Comunidad real", desc: "Construimos relaciones genuinas, no solo conexiones transaccionales." },
    { icon: "💚", title: "Bienestar integral", desc: "Cuidamos a quienes cuidan. Tu salud importa tanto como la de tus clientes." },
    { icon: "🔑", title: "Transparencia radical", desc: "Sin letra pequeña. Lo que prometemos, lo cumplimos." },
    { icon: "🌿", title: "Propósito sobre profit", desc: "Medimos el éxito en transformaciones, no solo en números." },
    { icon: "⚡", title: "Excelencia con calidez", desc: "Alto estándar profesional con un trato profundamente humano." },
    { icon: "🕊️", title: "Libertad con estructura", desc: "Tú decides cómo ejerces; nosotros ponemos el marco que lo hace posible." },
    { icon: "📖", title: "Formación permanente", desc: "El conocimiento es el mejor activo de un profesional del bienestar." },
  ];

  return (
    <Section id="mision" style={{ padding: "80px 24px", background: C.bg }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <span style={{ display: "inline-block", background: `rgba(163,168,132,0.18)`, color: C.brand, fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", padding: "5px 14px", borderRadius: 20, marginBottom: 14 }}>
            Misión, Visión y Valores
          </span>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, color: C.brand, margin: 0 }}>
            Lo que nos mueve cada día
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 56 }}>
          <div style={{ background: C.brand, borderRadius: 16, padding: 32, color: "#fff" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.olive, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>Misión</p>
            <p style={{ fontSize: 16, lineHeight: 1.7, margin: 0, color: "rgba(255,255,255,0.88)" }}>
              Empoderar a los profesionales del bienestar con herramientas, comunidad y tecnología para que puedan ejercer con dignidad, impacto y estabilidad.
            </p>
          </div>
          <div style={{ background: `linear-gradient(135deg, ${C.warm}, #c49060)`, borderRadius: 16, padding: 32, color: "#fff" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>Visión</p>
            <p style={{ fontSize: 16, lineHeight: 1.7, margin: 0, color: "rgba(255,255,255,0.88)" }}>
              Ser el ecosistema de referencia en Latinoamérica donde el bienestar integral es accesible, sostenible y transformador, tanto para quien lo busca como para quien lo facilita.
            </p>
          </div>
        </div>

        <h3 style={{ fontSize: 20, fontWeight: 700, color: C.brand, textAlign: "center", marginBottom: 28 }}>Nuestros 8 valores</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 16 }}>
          {valores.map((v) => (
            <div key={v.title} style={{ background: "#fff", borderRadius: 14, padding: "22px 20px", border: `1px solid ${C.olive}40` }}>
              <span style={{ fontSize: 28, display: "block", marginBottom: 12 }}>{v.icon}</span>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.brand, margin: "0 0 8px" }}>{v.title}</p>
              <p style={{ fontSize: 13, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ─── Biblia ─── */
function Biblia() {
  const cards = [
    {
      title: "Nuestra Biblia de Marca",
      desc: "Cada profesional de Inteira recibe acceso a nuestra guía completa de identidad, comunicación y valores. No es solo una marca; es una forma de ser en el mundo del bienestar.",
      icon: "📘",
      tag: "Documento fundacional",
    },
    {
      title: "Guía de Comunicación",
      desc: "Aprende cómo presentarte, comunicar tu valor y conectar auténticamente con tus clientes. Incluye plantillas, ejemplos y lenguaje alineado con los valores de Inteira.",
      icon: "✍️",
      tag: "Herramienta práctica",
    },
    {
      title: "Código de Ética Profesional",
      desc: "El marco que define cómo operamos juntos: respeto, confidencialidad, honestidad y excelencia. Es el compromiso que une a toda nuestra comunidad.",
      icon: "⚖️",
      tag: "Marco de conducta",
    },
  ];

  return (
    <Section style={{ padding: "80px 24px", background: "#fff" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={{ display: "inline-block", background: `rgba(163,168,132,0.18)`, color: C.brand, fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", padding: "5px 14px", borderRadius: 20, marginBottom: 14 }}>
            La Biblia Inteira
          </span>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, color: C.brand, margin: 0 }}>
            El marco que da coherencia a todo
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {cards.map((c) => (
            <div key={c.title} style={{ background: C.bg, borderRadius: 16, padding: 32, border: `1px solid ${C.olive}50` }}>
              <span style={{ fontSize: 36, display: "block", marginBottom: 16 }}>{c.icon}</span>
              <span style={{ display: "inline-block", background: `rgba(130,155,191,0.15)`, color: C.cool, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", padding: "4px 10px", borderRadius: 20, marginBottom: 12 }}>{c.tag}</span>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: C.brand, margin: "0 0 12px" }}>{c.title}</h3>
              <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6, margin: 0 }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ─── Modelo de Trabajo ─── */
function ModeloTrabajo() {
  return (
    <Section id="modelo" style={{ padding: "80px 24px", background: C.bg }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <span style={{ display: "inline-block", background: `rgba(163,168,132,0.18)`, color: C.brand, fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", padding: "5px 14px", borderRadius: 20, marginBottom: 14 }}>
            Modelo de Trabajo
          </span>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, color: C.brand, margin: 0 }}>
            Claro, justo y predecible
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginBottom: 40 }}>
          {[
            { value: "60%", color: C.brand, label: "Para el profesional", sub: "De cada sesión cobrada. El 40% restante sostiene la plataforma, el soporte y la comunidad." },
            { value: "Lunes", color: C.warm, label: "Día de pago semanal", sub: "Recibes tu saldo acumulado cada lunes. Sin demoras, sin misterios." },
            { value: "50'", color: C.cool, label: "Sesión estándar", sub: "Puedes configurar formatos de 30, 50 o 80 minutos según tu práctica." },
          ].map((s) => (
            <div key={s.value} style={{ background: "#fff", borderRadius: 16, padding: 32, border: `1px solid ${C.olive}40`, textAlign: "center" }}>
              <div style={{ fontSize: 48, fontWeight: 900, color: s.color, lineHeight: 1, marginBottom: 8 }}>{s.value}</div>
              <p style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 8 }}>{s.label}</p>
              <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5, margin: 0 }}>{s.sub}</p>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: 20, fontWeight: 700, color: C.brand, textAlign: "center", marginBottom: 24 }}>Niveles de membresía</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 32, border: `2px solid ${C.olive}50` }}>
            <span style={{ display: "inline-block", background: `rgba(163,168,132,0.15)`, color: C.brand, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", padding: "4px 12px", borderRadius: 20, marginBottom: 16 }}>Nivel Básico</span>
            <p style={{ fontSize: 28, fontWeight: 800, color: C.brand, margin: "0 0 4px" }}>Gratuito</p>
            <p style={{ fontSize: 13, color: C.nude, marginBottom: 24 }}>Para comenzar sin riesgo</p>
            {[
              "Perfil público en la plataforma",
              "Agenda de citas automatizada",
              "Hasta 10 sesiones activas por mes",
              "Soporte por correo electrónico",
              "Acceso a recursos básicos de la comunidad",
              "Pago semanal automatizado",
            ].map((f) => (
              <div key={f} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <span style={{ color: C.warm, fontSize: 15, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 14, color: C.textMuted }}>{f}</span>
              </div>
            ))}
          </div>

          <div style={{ background: `linear-gradient(145deg, ${C.brand}, #7a8c76)`, borderRadius: 20, padding: 32, border: `2px solid ${C.olive}`, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 16, right: 16, background: C.warm, color: "#fff", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", padding: "4px 10px", borderRadius: 20 }}>Recomendado</div>
            <span style={{ display: "inline-block", background: `rgba(242,240,237,0.2)`, color: C.bg, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", padding: "4px 12px", borderRadius: 20, marginBottom: 16 }}>Nivel Pro</span>
            <p style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>$299 MXN/mes</p>
            <p style={{ fontSize: 13, color: C.nude, marginBottom: 24 }}>Para crecer sin límites</p>
            {[
              "Todo lo del nivel Básico",
              "Sesiones ilimitadas por mes",
              "Perfil destacado en búsquedas",
              "Acceso completo a formación y talleres",
              "Comunidad Pro exclusiva",
              "Soporte prioritario 7 días",
              "Estadísticas avanzadas de tu práctica",
              "Acceso a la Biblia Inteira completa",
            ].map((f) => (
              <div key={f} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <span style={{ color: C.nude, fontSize: 15, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.82)" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ─── Comunidad ─── */
function Comunidad() {
  const medioPlazoPlazo = [
    "Grupos de supervisión entre pares para profesionales activos",
    "Talleres mensuales de formación continua gratuitos",
    "Red de referidos entre profesionales de distintas áreas",
    "Espacio de apoyo emocional para profesionales de bienestar",
  ];
  const largoPlazoPlazo = [
    "Certificación Inteira como sello de calidad reconocido",
    "Conferencias y retiros anuales para la comunidad",
    "Co-creación de programas de bienestar empresarial",
    "Fondo de ayuda y becas para profesionales en formación",
    "Expansión a 10 países de Latinoamérica para 2027",
  ];

  return (
    <Section id="comunidad" style={{ padding: "80px 24px", background: "#fff" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <span style={{ display: "inline-block", background: `rgba(163,168,132,0.18)`, color: C.brand, fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", padding: "5px 14px", borderRadius: 20, marginBottom: 14 }}>
            Comunidad Inteira
          </span>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, color: C.brand, marginBottom: 16 }}>
            Más que una plataforma. Un hogar profesional.
          </h2>
          <p style={{ fontSize: 16, color: C.textMuted, maxWidth: 600, margin: "0 auto", lineHeight: 1.7 }}>
            Estamos construyendo algo grande. Esto es lo que viene para los profesionales que se unan hoy.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          <div style={{ background: C.bg, borderRadius: 20, padding: 32, border: `1px solid ${C.olive}50` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: `rgba(163,168,132,0.2)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 18 }}>🌿</span>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: C.warm, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Objetivos a mediano plazo</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.brand, margin: 0 }}>Próximos 12 meses</p>
              </div>
            </div>
            {medioPlazoPlazo.map((o) => (
              <div key={o} style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>🌱</span>
                <p style={{ fontSize: 14, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>{o}</p>
              </div>
            ))}
          </div>

          <div style={{ background: `linear-gradient(145deg, ${C.brand}, #7a8c76)`, borderRadius: 20, padding: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(242,240,237,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 18 }}>🚀</span>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: C.nude, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Objetivos a largo plazo</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0 }}>Visión 2027</p>
              </div>
            </div>
            {largoPlazoPlazo.map((o) => (
              <div key={o} style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>⭐</span>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.78)", margin: 0, lineHeight: 1.5 }}>{o}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ─── Registro ─── */
function SeccionRegistro() {
  return (
    <section id="registro">
      <RegisterProfessional />
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer style={{ background: C.brand, padding: "48px 24px 32px", fontFamily: "'Poppins', sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 40, justifyContent: "space-between", marginBottom: 40 }}>
          <div style={{ flex: "1 1 260px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${C.warm}, #c49060)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/></svg>
              </div>
              <span style={{ fontWeight: 700, fontSize: 18, color: "#fff" }}>Inteira</span>
            </div>
            <p style={{ fontSize: 13, color: C.nude, lineHeight: 1.7, margin: 0, maxWidth: 260 }}>
              La plataforma de bienestar integral que conecta profesionales comprometidos con quienes los necesitan.
            </p>
          </div>
          <div style={{ flex: "0 1 auto" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: C.olive, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>Profesionales</p>
            {["Nuestra Identidad", "Modelo de Trabajo", "Comunidad", "Únete"].map((l) => (
              <a key={l} href="#" style={{ display: "block", fontSize: 13, color: C.nude, textDecoration: "none", marginBottom: 8 }}>{l}</a>
            ))}
          </div>
          <div style={{ flex: "0 1 auto" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: C.olive, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>Legal</p>
            {[{ l: "Términos de servicio", h: "/terminos" }, { l: "Privacidad", h: "/privacidad" }].map(({ l, h }) => (
              <a key={l} href={h} style={{ display: "block", fontSize: 13, color: C.nude, textDecoration: "none", marginBottom: 8 }}>{l}</a>
            ))}
          </div>
        </div>
        <div style={{ borderTop: `1px solid rgba(255,255,255,0.1)`, paddingTop: 24, textAlign: "center" }}>
          <p style={{ fontSize: 12, color: `rgba(203,173,166,0.5)`, margin: 0 }}>
            © {new Date().getFullYear()} Inteira. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Main Page ─── */
export default function ProfessionalsLanding() {
  const [videoWatched, setVideoWatched] = useState(false);

  const { data: siteConfig } = trpc.public.getSiteConfig.useQuery(
    { keys: ["professionals_video_url", "professionals_banner_url"] },
    { staleTime: 5 * 60 * 1000 }
  );

  const videoUrl = siteConfig?.professionals_video_url ?? "";
  const bannerUrl = siteConfig?.professionals_banner_url ?? null;

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {!videoWatched && <VideoModal videoUrl={videoUrl} onComplete={() => setVideoWatched(true)} />}

      <div style={{ opacity: videoWatched ? 1 : 0, transition: "opacity 0.5s ease", pointerEvents: videoWatched ? "auto" : "none", background: C.bg }}>
        <Hero bannerUrl={bannerUrl} />
        <Identidad />
        <Historia />
        <MisionValores />
        <Biblia />
        <ModeloTrabajo />
        <Comunidad />
        <SeccionRegistro />
        <Footer />
      </div>
    </>
  );
}
