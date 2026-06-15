import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import {
  DollarSign, Clock, Calendar, X, Check,
  Brain, Heart, Leaf, Sun, Users, BookOpen,
  Scale, Sprout, Star, Shield,
  Target, Compass, MessageCircle,
  HeartHandshake, Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import { Link } from "wouter";
import RegisterProfessional from "./RegisterProfessional";

// ─── Palette ─────────────────────────────────────────────────────────────────
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

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

// ─── Image Placeholder ────────────────────────────────────────────────────────
function ImgPlaceholder({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div className={`bg-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 p-6 ${className}`}>
      <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
        <ImageIcon className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-gray-500 text-sm font-medium text-center">{label}</p>
      <p className="text-gray-400 text-xs">(subir desde admin)</p>
    </div>
  );
}

const LS_KEY = "inteira_video_completed";

// ─── Video Modal ──────────────────────────────────────────────────────────────
function VideoModal({
  videoUrl, bgImageUrl, onComplete, canSkip,
}: {
  videoUrl: string;
  bgImageUrl: string | null;
  onComplete: () => void;
  canSkip: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [videoCompleted, setVideoCompleted] = useState(false);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const { currentTime, duration } = videoRef.current;
    if (duration > 0) {
      setProgress((currentTime / duration) * 100);
      setRemaining(Math.max(0, duration - currentTime));
    }
  };

  const handleEnded = () => {
    setVideoCompleted(true);
    setProgress(100);
    setRemaining(0);
  };

  const mins = remaining !== null ? Math.floor(remaining / 60) : null;
  const secs = remaining !== null ? Math.floor(remaining % 60) : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "'Poppins', sans-serif",
        backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: bgImageUrl ? undefined : C.bg,
      }}
    >
      {bgImageUrl && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(242,240,237,0.82)" }} />
      )}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 760,
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 8px 40px rgba(91,106,87,0.15)",
          padding: "32px",
        }}
      >
        <p style={{ color: "#3d2e22", fontSize: 15, fontWeight: 700, marginBottom: 4, textAlign: "center" }}>
          Bienvenida/o a Inteira
        </p>
        <p style={{ color: C.brand, fontSize: 12, marginBottom: 20, textAlign: "center" }}>
          Por favor ve el video completo antes de continuar
        </p>

        <video
          key={videoUrl}
          ref={videoRef}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          controls
          autoPlay
          muted
          playsInline
          style={{ width: "100%", borderRadius: 12 }}
        >
          <source src={videoUrl} />
        </video>

        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: C.warm, fontSize: 13, fontWeight: 600 }}>
              {videoCompleted ? "¡Video completado!" : `Progreso: ${Math.round(progress)}%`}
            </span>
            {!videoCompleted && mins !== null && secs !== null && (
              <span style={{ color: C.textMuted, fontSize: 12 }}>
                Tiempo restante: {mins}:{secs.toString().padStart(2, "0")}
              </span>
            )}
          </div>
          <div style={{ height: 6, background: "#e0dbd5", borderRadius: 6, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: C.warm,
                borderRadius: 6,
                transition: "width 0.5s linear",
              }}
            />
          </div>
        </div>

        {videoCompleted ? (
          <button
            onClick={onComplete}
            style={{
              marginTop: 24,
              width: "100%",
              padding: "14px",
              background: C.warm,
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
          <>
            <p style={{ textAlign: "center", color: C.textMuted, fontSize: 12, marginTop: 20, opacity: 0.7 }}>
              El botón de acceso se habilitará al terminar el video.
            </p>
            {canSkip && (
              <button
                onClick={onComplete}
                style={{
                  marginTop: 12,
                  width: "100%",
                  padding: "12px",
                  background: "transparent",
                  color: C.textMuted,
                  border: `1px solid #d4cdc7`,
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                Ya vi este video — omitir →
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero({ bannerUrl }: { bannerUrl: string | null }) {
  const scroll = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section
      className="min-h-[90vh] flex items-center"
      style={{ background: C.bg, fontFamily: "Poppins, sans-serif" }}
    >
      <div className="max-w-6xl mx-auto px-6 py-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left: texto */}
          <motion.div {...fadeUp} className="space-y-6">
            <span
              className="inline-block text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full"
              style={{ background: `${C.brand}15`, color: C.brand }}
            >
              Plataforma para profesionales del bienestar
            </span>

            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight" style={{ color: C.text }}>
              Transforma tu práctica.{" "}
              <span style={{ color: C.warm }}>Conecta con quienes te necesitan.</span>
            </h1>

            <p className="text-lg leading-relaxed max-w-lg" style={{ color: C.textMuted }}>
              Inteira es la comunidad donde los profesionales del bienestar mental, emocional y
              espiritual construyen una práctica sostenible, con propósito y acompañamiento real.
            </p>

            <div className="flex gap-4 flex-wrap">
              <button
                onClick={() => scroll("registro")}
                className="px-8 py-4 rounded-xl font-bold text-white text-base transition-opacity hover:opacity-90"
                style={{ background: C.warm }}
              >
                Quiero ser parte →
              </button>
              <button
                onClick={() => scroll("identidad")}
                className="px-8 py-4 rounded-xl font-semibold text-base transition-colors hover:bg-black/5"
                style={{ border: `2px solid ${C.brand}`, color: C.brand }}
              >
                Conocer más
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                { icon: <DollarSign className="w-4 h-4" />, value: "60%",     label: "Comisión para ti",  sub: "por sesión completada" },
                { icon: <Clock       className="w-4 h-4" />, value: "50 min", label: "Sesión estándar",   sub: "flexible a tu práctica" },
                { icon: <Calendar    className="w-4 h-4" />, value: "Lunes",  label: "Día de pago",       sub: "sin demoras ni misterios" },
              ].map((s) => (
                <div key={s.value} className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: "#e8e3dd" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                    style={{ background: `${C.brand}15`, color: C.brand }}>
                    {s.icon}
                  </div>
                  <p className="text-xl font-extrabold" style={{ color: C.warm }}>{s.value}</p>
                  <p className="text-xs font-semibold mt-0.5" style={{ color: C.text }}>{s.label}</p>
                  <p className="text-xs" style={{ color: C.textMuted }}>{s.sub}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: imagen */}
          <motion.div {...fadeUp} transition={{ delay: 0.15, duration: 0.5 }}>
            {bannerUrl ? (
              <div className="aspect-[4/5] rounded-2xl overflow-hidden">
                <img src={bannerUrl} alt="Hero Inteira" className="w-full h-full object-cover" />
              </div>
            ) : (
              <ImgPlaceholder label="Imagen hero" className="aspect-[4/5]" />
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Identidad ────────────────────────────────────────────────────────────────
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
    { label: "Psicología y salud mental", icon: <Brain        className="w-4 h-4" />, color: "#829BBF" },
    { label: "Coaching de vida",          icon: <Target       className="w-4 h-4" />, color: "#A7774E" },
    { label: "Terapia espiritual",        icon: <Sun          className="w-4 h-4" />, color: "#C49060" },
    { label: "Nutrición holística",       icon: <Leaf         className="w-4 h-4" />, color: "#5B6A57" },
    { label: "Meditación y mindfulness",  icon: <Sparkles     className="w-4 h-4" />, color: "#829BBF" },
    { label: "Acompañamiento en duelo",   icon: <Heart        className="w-4 h-4" />, color: "#CBADA6" },
    { label: "Terapia de pareja",         icon: <HeartHandshake className="w-4 h-4" />, color: "#A7774E" },
    { label: "Bienestar emocional",       icon: <Shield       className="w-4 h-4" />, color: "#A3A884" },
    { label: "Consejería familiar",       icon: <Users        className="w-4 h-4" />, color: "#5B6A57" },
  ];

  return (
    <section id="identidad" className="py-24 bg-white" style={{ fontFamily: "Poppins, sans-serif" }}>
      <div className="max-w-6xl mx-auto px-6">

        <motion.div {...fadeUp} className="text-center mb-16">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full mb-4"
            style={{ background: `${C.brand}12`, color: C.brand }}>
            Nuestra Identidad
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold" style={{ color: C.brand }}>
            Sabemos lo que somos.<br />Y lo que no somos.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mb-16">
          {/* Listas NO / SÍ */}
          <motion.div {...fadeUp} className="space-y-5">
            <div className="bg-red-50 rounded-2xl p-7 border border-red-100">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                  <X className="w-4 h-4 text-red-600" />
                </div>
                <h3 className="font-bold text-red-700">Lo que NO somos</h3>
              </div>
              {noSomos.map((t, i) => (
                <div key={i} className="flex gap-3 mb-3">
                  <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm" style={{ color: C.textMuted }}>{t}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl p-7 border" style={{ background: `${C.brand}07`, borderColor: `${C.olive}40` }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: `${C.brand}20` }}>
                  <Check className="w-4 h-4" style={{ color: C.brand }} />
                </div>
                <h3 className="font-bold" style={{ color: C.brand }}>Lo que SÍ somos</h3>
              </div>
              {siSomos.map((t, i) => (
                <div key={i} className="flex gap-3 mb-3">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: C.warm }} />
                  <p className="text-sm" style={{ color: C.textMuted }}>{t}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Imagen placeholder */}
          <motion.div {...fadeUp} transition={{ delay: 0.15, duration: 0.5 }}>
            <ImgPlaceholder label="Imagen identidad" className="aspect-square" />
          </motion.div>
        </div>

        {/* Áreas grid */}
        <motion.div {...fadeUp}>
          <h3 className="text-xl font-bold text-center mb-6" style={{ color: C.brand }}>
            Áreas de práctica que acompañamos
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {areas.map((a) => (
              <div key={a.label} className="bg-white rounded-xl p-4 border flex items-center gap-3 shadow-sm"
                style={{ borderColor: "#e8e3dd" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${a.color}18`, color: a.color }}>
                  {a.icon}
                </div>
                <span className="text-xs font-medium leading-snug" style={{ color: C.text }}>{a.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Historia ─────────────────────────────────────────────────────────────────
function Historia() {
  return (
    <section id="historia" className="py-24" style={{ background: "#f5f0eb", fontFamily: "Poppins, sans-serif" }}>
      <div className="max-w-6xl mx-auto px-6">

        <motion.div {...fadeUp} className="text-center mb-16">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full mb-4"
            style={{ background: `${C.brand}12`, color: C.brand }}>
            Nuestra Historia
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold" style={{ color: C.brand }}>
            Todo comenzó con una pregunta honesta
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Texto */}
          <motion.div {...fadeUp} className="space-y-6">
            <div className="relative">
              <span
                className="absolute -top-4 -left-2 text-8xl font-serif leading-none select-none"
                style={{ color: C.warm, opacity: 0.35 }}
              >"</span>
              <blockquote className="pl-6 border-l-4 py-4" style={{ borderColor: C.warm }}>
                <p className="text-xl italic font-medium leading-relaxed" style={{ color: C.brand }}>
                  ¿Por qué los profesionales del bienestar que más cuidan a otros son los que menos
                  tienen herramientas para cuidarse a sí mismos?
                </p>
              </blockquote>
            </div>

            <p className="text-base leading-relaxed" style={{ color: C.textMuted }}>
              Inteira nació de la necesidad real de crear un puente entre quienes tienen el conocimiento y
              vocación para sanar, y quienes buscan ese acompañamiento con urgencia. Nos dimos cuenta de que
              el problema no era la falta de buenos profesionales; era la falta de un espacio digno, coherente
              y humano donde pudieran ejercer.
            </p>

            <p className="text-base leading-relaxed" style={{ color: C.textMuted }}>
              Durante meses conversamos con terapeutas, coaches, psicólogos y guías espirituales que trabajaban
              desde sus casas, sin estructura, sin visibilidad y sin comunidad. Esas historias se convirtieron
              en el mapa de lo que Inteira quería ser.
            </p>

            {/* Anécdota */}
            <div className="rounded-2xl p-6 border-l-4 bg-white" style={{ borderColor: C.warm }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: C.warm }}>
                Una historia que nos marcó
              </p>
              <p className="text-sm leading-relaxed" style={{ color: C.text }}>
                Una de las primeras profesionales que se unió a Inteira era terapeuta holística. Llevaba tres
                años trabajando sola, sin certeza de cuántos clientes tendría cada semana. "Vivía con miedo de
                que mi trabajo no alcanzara para pagar la renta", nos dijo. Hoy, seis meses dentro de la
                plataforma, tiene agenda completa y por primera vez pudo tomarse vacaciones.
              </p>
            </div>

            <div className="text-center py-2">
              <p className="text-lg italic font-medium leading-relaxed max-w-lg mx-auto mb-3"
                style={{ color: C.brand }}>
                "Creamos Inteira para que ningún profesional del bienestar tenga que elegir entre su vocación
                y su estabilidad."
              </p>
              <p className="text-sm font-semibold" style={{ color: C.warm }}>— Fundadora, Inteira</p>
            </div>
          </motion.div>

          {/* Imagen fundadora */}
          <motion.div {...fadeUp} transition={{ delay: 0.15, duration: 0.5 }}>
            <ImgPlaceholder label="Foto de la fundadora" className="aspect-[3/4]" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Misión / Visión / Valores ─────────────────────────────────────────────────
function MisionValores() {
  const valores = [
    { icon: <Sprout   className="w-5 h-5" />, title: "Crecimiento continuo",   desc: "Creemos que siempre hay más por aprender y más por dar." },
    { icon: <Users    className="w-5 h-5" />, title: "Comunidad real",          desc: "Construimos relaciones genuinas, no solo conexiones transaccionales." },
    { icon: <Heart    className="w-5 h-5" />, title: "Bienestar integral",      desc: "Cuidamos a quienes cuidan. Tu salud importa tanto como la de tus clientes." },
    { icon: <Shield   className="w-5 h-5" />, title: "Transparencia radical",   desc: "Sin letra pequeña. Lo que prometemos, lo cumplimos." },
    { icon: <Target   className="w-5 h-5" />, title: "Propósito sobre profit",  desc: "Medimos el éxito en transformaciones, no solo en números." },
    { icon: <Star     className="w-5 h-5" />, title: "Excelencia con calidez",  desc: "Alto estándar profesional con un trato profundamente humano." },
    { icon: <Compass  className="w-5 h-5" />, title: "Libertad con estructura", desc: "Tú decides cómo ejerces; nosotros ponemos el marco que lo hace posible." },
    { icon: <BookOpen className="w-5 h-5" />, title: "Formación permanente",    desc: "El conocimiento es el mejor activo de un profesional del bienestar." },
  ];

  return (
    <section id="mision" className="py-24 bg-white" style={{ fontFamily: "Poppins, sans-serif" }}>
      <div className="max-w-6xl mx-auto px-6">

        <motion.div {...fadeUp} className="text-center mb-16">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full mb-4"
            style={{ background: `${C.brand}12`, color: C.brand }}>
            Misión, Visión y Valores
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold" style={{ color: C.brand }}>
            Lo que nos mueve cada día
          </h2>
        </motion.div>

        <motion.div {...fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-16">
          <div className="rounded-2xl p-8 text-white" style={{ background: C.brand }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.olive }}>Misión</p>
            <p className="text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.88)" }}>
              Empoderar a los profesionales del bienestar con herramientas, comunidad y tecnología para que
              puedan ejercer con dignidad, impacto y estabilidad.
            </p>
          </div>
          <div className="rounded-2xl p-8 text-white" style={{ background: `linear-gradient(135deg, ${C.warm}, #c49060)` }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.6)" }}>Visión</p>
            <p className="text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.88)" }}>
              Ser el ecosistema de referencia en Latinoamérica donde el bienestar integral es accesible,
              sostenible y transformador, tanto para quien lo busca como para quien lo facilita.
            </p>
          </div>
        </motion.div>

        <h3 className="text-xl font-bold text-center mb-8" style={{ color: C.brand }}>Nuestros 8 valores</h3>
        <motion.div {...fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {valores.map((v) => (
            <div key={v.title} className="rounded-2xl p-5 border"
              style={{ background: "#f0f3ef", borderColor: `${C.olive}30` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${C.brand}15`, color: C.brand }}>
                {v.icon}
              </div>
              <p className="text-sm font-bold mb-2" style={{ color: C.brand }}>{v.title}</p>
              <p className="text-xs leading-relaxed" style={{ color: C.textMuted }}>{v.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Biblia ───────────────────────────────────────────────────────────────────
function Biblia() {
  const cards = [
    {
      icon: <BookOpen      className="w-6 h-6" />,
      stat: "1 Guía",
      title: "Nuestra Biblia de Marca",
      desc: "Cada profesional de Inteira recibe acceso a nuestra guía completa de identidad, comunicación y valores.",
      tag: "Documento fundacional",
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      stat: "100+ Recursos",
      title: "Guía de Comunicación",
      desc: "Aprende cómo presentarte, comunicar tu valor y conectar auténticamente con tus clientes.",
      tag: "Herramienta práctica",
    },
    {
      icon: <Scale         className="w-6 h-6" />,
      stat: "Código ético",
      title: "Código de Ética Profesional",
      desc: "El marco que define cómo operamos juntos: respeto, confidencialidad, honestidad y excelencia.",
      tag: "Marco de conducta",
    },
  ];

  return (
    <section className="py-24" style={{ background: C.brand, fontFamily: "Poppins, sans-serif" }}>
      <div className="max-w-6xl mx-auto px-6">

        <motion.div {...fadeUp} className="text-center mb-16">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full mb-4"
            style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)" }}>
            La Biblia Inteira
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            El marco que da coherencia a todo
          </h2>
        </motion.div>

        <motion.div {...fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {cards.map((c) => (
            <div key={c.title} className="rounded-2xl p-8"
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 text-white"
                style={{ background: "rgba(255,255,255,0.15)" }}>
                {c.icon}
              </div>
              <p className="text-2xl font-extrabold text-white mb-1">{c.stat}</p>
              <span className="inline-block text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mb-4"
                style={{ background: `${C.warm}50`, color: C.nude }}>
                {c.tag}
              </span>
              <h3 className="text-base font-bold text-white mb-3">{c.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>{c.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Modelo de Trabajo ────────────────────────────────────────────────────────
function ModeloTrabajo() {
  return (
    <section id="modelo" className="py-24 bg-white" style={{ fontFamily: "Poppins, sans-serif" }}>
      <div className="max-w-6xl mx-auto px-6">

        <motion.div {...fadeUp} className="text-center mb-16">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full mb-4"
            style={{ background: `${C.brand}12`, color: C.brand }}>
            Modelo de Trabajo
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold" style={{ color: C.brand }}>
            Claro, justo y predecible
          </h2>
        </motion.div>

        <motion.div {...fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
          {[
            { icon: <DollarSign className="w-7 h-7" />, value: "60%",    label: "Para el profesional",  sub: "De cada sesión cobrada. El 40% restante sostiene la plataforma." },
            { icon: <Calendar   className="w-7 h-7" />, value: "Lunes",  label: "Día de pago semanal",  sub: "Recibes tu saldo acumulado cada lunes. Sin demoras ni misterios." },
            { icon: <Clock      className="w-7 h-7" />, value: "50 min", label: "Sesión estándar",      sub: "Puedes configurar formatos de 30, 50 o 80 minutos según tu práctica." },
          ].map((s) => (
            <div key={s.value} className="rounded-2xl p-8 text-center border" style={{ borderColor: "#e8e3dd" }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: `${C.warm}15`, color: C.warm }}>
                {s.icon}
              </div>
              <p className="text-4xl font-black mb-2" style={{ color: C.warm }}>{s.value}</p>
              <p className="text-sm font-semibold mb-2" style={{ color: C.text }}>{s.label}</p>
              <p className="text-xs leading-relaxed" style={{ color: C.textMuted }}>{s.sub}</p>
            </div>
          ))}
        </motion.div>

        <h3 className="text-xl font-bold text-center mb-8" style={{ color: C.brand }}>Niveles de membresía</h3>
        <motion.div {...fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Básico */}
          <div className="rounded-2xl p-8 border-2" style={{ borderColor: `${C.olive}50` }}>
            <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4"
              style={{ background: `${C.olive}20`, color: C.brand }}>
              Nivel Básico
            </span>
            <p className="text-3xl font-extrabold mb-1" style={{ color: C.brand }}>Gratuito</p>
            <p className="text-sm mb-6" style={{ color: C.nude }}>Para comenzar sin riesgo</p>
            {[
              "Perfil público en la plataforma",
              "Agenda de citas automatizada",
              "Hasta 10 sesiones activas por mes",
              "Soporte por correo electrónico",
              "Acceso a recursos básicos de la comunidad",
              "Pago semanal automatizado",
            ].map((f) => (
              <div key={f} className="flex gap-3 mb-3">
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: C.warm }} />
                <span className="text-sm" style={{ color: C.textMuted }}>{f}</span>
              </div>
            ))}
          </div>

          {/* Pro */}
          <div className="rounded-2xl p-8 text-white relative overflow-hidden"
            style={{ background: `linear-gradient(145deg, ${C.brand}, #7a8c76)`, border: `2px solid ${C.olive}` }}>
            <div className="absolute top-4 right-4 text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full text-white"
              style={{ background: C.warm }}>
              Recomendado
            </div>
            <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4"
              style={{ background: "rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.85)" }}>
              Nivel Pro
            </span>
            <p className="text-3xl font-extrabold mb-1">$299 MXN/mes</p>
            <p className="text-sm mb-6" style={{ color: C.nude }}>Para crecer sin límites</p>
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
              <div key={f} className="flex gap-3 mb-3">
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: C.nude }} />
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.82)" }}>{f}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Comunidad ────────────────────────────────────────────────────────────────
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
    <section id="comunidad" className="py-24" style={{ background: C.bg, fontFamily: "Poppins, sans-serif" }}>
      <div className="max-w-6xl mx-auto px-6">

        <motion.div {...fadeUp} className="text-center mb-16">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full mb-4"
            style={{ background: `${C.brand}12`, color: C.brand }}>
            Comunidad Inteira
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4" style={{ color: C.brand }}>
            Más que una plataforma. Un hogar profesional.
          </h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: C.textMuted }}>
            Estamos construyendo algo grande. Esto es lo que viene para los profesionales que se unan hoy.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-16">
          <motion.div {...fadeUp} className="space-y-5">
            <ImgPlaceholder label="Imagen comunidad — próximos 12 meses" className="aspect-video" />
            <div className="rounded-2xl p-7 border bg-white" style={{ borderColor: `${C.olive}40` }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: C.warm }}>Próximos 12 meses</p>
              <h3 className="font-bold mb-4" style={{ color: C.brand }}>Objetivos a mediano plazo</h3>
              {medioPlazoPlazo.map((o) => (
                <div key={o} className="flex gap-3 mb-3">
                  <Sprout className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: C.brand }} />
                  <p className="text-sm" style={{ color: C.textMuted }}>{o}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.1, duration: 0.5 }} className="space-y-5">
            <ImgPlaceholder label="Imagen comunidad — Visión 2027" className="aspect-video" />
            <div className="rounded-2xl p-7 text-white"
              style={{ background: `linear-gradient(145deg, ${C.brand}, #7a8c76)` }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: C.nude }}>Visión 2027</p>
              <h3 className="font-bold text-white mb-4">Objetivos a largo plazo</h3>
              {largoPlazoPlazo.map((o) => (
                <div key={o} className="flex gap-3 mb-3">
                  <Star className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: C.nude }} />
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>{o}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Quote final */}
        <motion.div {...fadeUp} className="text-center py-6">
          <p className="text-xl italic font-medium max-w-2xl mx-auto mb-4" style={{ color: C.brand }}>
            "Construimos Inteira para que el bienestar de quien cuida sea tan importante como el de quien es cuidado."
          </p>
          <p className="text-sm font-semibold" style={{ color: C.warm }}>— Equipo Inteira</p>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Sección Registro ─────────────────────────────────────────────────────────
function SeccionRegistro() {
  return (
    <section id="unete" className="py-16 px-6 bg-white" style={{ fontFamily: "Poppins, sans-serif" }}>
      <div className="max-w-4xl mx-auto">
        <motion.div {...fadeUp} className="text-center mb-10">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.warm }}>
            Únete a Inteira
          </span>
          <h2 className="text-3xl font-semibold mt-2" style={{ color: "#3d2e22" }}>
            Regístrate como profesional
          </h2>
          <p className="mt-2" style={{ color: C.textMuted }}>
            Completa el formulario y nos pondremos en contacto contigo muy pronto.
          </p>
        </motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.1, duration: 0.5 }}>
          <RegisterProfessional embedded />
        </motion.div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="py-8 md:py-12" style={{ backgroundColor: "#607562" }}>
      <div className="container">
        {/* Desktop footer grid */}
        <div className="hidden md:grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="mb-4">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663083109800/hvpTFzVHTUDdmneoDhwUNk/logo-blanco_886f1d65.webp"
                alt="Inteira"
                className="h-8 w-auto object-contain"
              />
            </div>
            <p className="text-sm text-white/75">
              Plataforma de consultas con especialistas en línea. Conectamos personas con profesionales de confianza.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm text-white">Especialidades</h4>
            <ul className="space-y-2 text-sm text-white/75">
              <li><a href="#" className="hover:text-white transition-colors">Psicología</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Legal</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Finanzas</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Emprendimiento</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm text-white">Plataforma</h4>
            <ul className="space-y-2 text-sm text-white/75">
              <li><a href="#como-funciona" className="hover:text-white transition-colors">Cómo funciona</a></li>
              <li><a href="#planes" className="hover:text-white transition-colors">Planes</a></li>
              <li><Link href="/registro-profesional"><span className="hover:text-white transition-colors cursor-pointer">Soy profesional</span></Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm text-white">Legal</h4>
            <ul className="space-y-2 text-sm text-white/75">
              <li><Link href="/terminos"><span className="hover:text-white transition-colors cursor-pointer">Términos de uso</span></Link></li>
              <li><Link href="/privacidad"><span className="hover:text-white transition-colors cursor-pointer">Privacidad</span></Link></li>
              <li><a href="mailto:soporte@inteira.mx" className="hover:text-white transition-colors">Contacto</a></li>
            </ul>
          </div>
        </div>

        {/* Mobile footer: compact logo + links */}
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-5">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663083109800/hvpTFzVHTUDdmneoDhwUNk/logo-blanco_886f1d65.webp"
              alt="Inteira"
              className="h-7 w-auto object-contain"
            />
            <a href="https://inteira.app" className="text-xs text-white/70 hover:text-white transition-colors">
              inteira.app
            </a>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">Áreas</p>
              <ul className="space-y-1.5 text-xs text-white/75">
                <li><a href="#" className="hover:text-white">Psicología</a></li>
                <li><a href="#" className="hover:text-white">Legal</a></li>
                <li><a href="#" className="hover:text-white">Finanzas</a></li>
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">App</p>
              <ul className="space-y-1.5 text-xs text-white/75">
                <li><a href="#como-funciona" className="hover:text-white">Cómo funciona</a></li>
                <li><Link href="/planes"><span className="hover:text-white cursor-pointer">Planes</span></Link></li>
                <li><Link href="/registro-profesional"><span className="hover:text-white cursor-pointer">Profesionales</span></Link></li>
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">Legal</p>
              <ul className="space-y-1.5 text-xs text-white/75">
                <li><Link href="/terminos"><span className="hover:text-white cursor-pointer">Términos</span></Link></li>
                <li><Link href="/privacidad"><span className="hover:text-white cursor-pointer">Privacidad</span></Link></li>
                <li><a href="mailto:soporte@inteira.mx" className="hover:text-white">Contacto</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 pt-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs md:text-sm text-white/70">
            © {new Date().getFullYear()} Inteira. Todos los derechos reservados.
          </p>
          <p className="hidden md:block text-sm text-white/70">
            <a href="https://inteira.app" className="hover:text-white transition-colors">inteira.app</a>
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProfessionalsLanding() {
  const [videoWatched, setVideoWatched] = useState(false);
  const hasWatchedBefore = typeof window !== "undefined" && !!localStorage.getItem(LS_KEY);

  const handleVideoComplete = () => {
    localStorage.setItem(LS_KEY, "1");
    setVideoWatched(true);
  };

  const { data: siteConfig, isLoading: configLoading } = trpc.public.getSiteConfig.useQuery(
    { keys: ["professionals_video_url", "professionals_banner_url", "professionals_video_bg_url"] },
    { staleTime: 5 * 60 * 1000 }
  );

  const videoUrl   = siteConfig?.professionals_video_url   ?? "";
  const bannerUrl  = siteConfig?.professionals_banner_url  ?? null;
  const videoBgUrl = siteConfig?.professionals_video_bg_url ?? null;

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {!videoWatched && !configLoading && (
        <VideoModal
          videoUrl={videoUrl}
          bgImageUrl={videoBgUrl}
          onComplete={handleVideoComplete}
          canSkip={hasWatchedBefore}
        />
      )}

      <div
        className="scroll-smooth"
        style={{
          opacity: videoWatched ? 1 : 0,
          transition: "opacity 0.5s ease",
          pointerEvents: videoWatched ? "auto" : "none",
        }}
      >
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
