import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  DollarSign, Clock, Calendar, X, Check,
  Brain, Heart, Leaf, Sun, Users, BookOpen,
  Scale, Sprout, Star, Shield,
  Target, Compass, MessageCircle,
  HeartHandshake, Image as ImageIcon,
  CheckCircle2, ArrowRight, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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

// ─── Video Modal ──────────────────────────────────────────────────────────────
function VideoModal({
  videoUrl, bgImageUrl, onComplete,
}: {
  videoUrl: string;
  bgImageUrl: string | null;
  onComplete: () => void;
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
          <p style={{ textAlign: "center", color: C.textMuted, fontSize: 12, marginTop: 20, opacity: 0.7 }}>
            El botón de acceso se habilitará al terminar el video.
          </p>
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
  const { data: specialties } = trpc.specialty.getAll.useQuery();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    profession: "",
    specialtyId: "",
    yearsOfExperience: "",
    bibliaKnowledge: "",
    motivation: "",
    whyJoin: "",
  });

  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const registerMutation = trpc.professional.registerNew.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (err) => toast.error(err.message ?? "Error al enviar la solicitud"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) return toast.error("El nombre es obligatorio");
    if (!form.email.trim())    return toast.error("El email es obligatorio");
    if (!form.specialtyId)     return toast.error("Selecciona tu especialidad");
    if (!form.whyJoin.trim())  return toast.error("Cuéntanos por qué quieres unirte");

    const bio = [
      form.whyJoin,
      form.profession    && `Profesión: ${form.profession}`,
      form.phone         && `Teléfono: ${form.phone}`,
      form.motivation    && `Motivación: ${form.motivation}`,
      form.bibliaKnowledge && `Conocimiento de la Biblia Inteira: ${form.bibliaKnowledge}`,
    ].filter(Boolean).join("\n\n");

    registerMutation.mutate({
      fullName:          form.fullName,
      email:             form.email,
      specialtyId:       parseInt(form.specialtyId),
      bio,
      yearsOfExperience: form.yearsOfExperience ? parseInt(form.yearsOfExperience) : undefined,
      profilePhoto:      "",
      identityDocUrl:    "",
    } as any);
  };

  if (submitted) {
    return (
      <section id="registro" className="py-24 bg-white" style={{ fontFamily: "Poppins, sans-serif" }}>
        <div className="max-w-xl mx-auto px-6 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: `${C.brand}15` }}>
            <CheckCircle2 className="w-10 h-10" style={{ color: C.brand }} />
          </div>
          <h2 className="text-2xl font-extrabold mb-3" style={{ color: C.brand }}>¡Solicitud recibida!</h2>
          <p className="mb-2" style={{ color: C.textMuted }}>
            Gracias por tu interés en unirte a Inteira. El equipo revisará tu solicitud y se pondrá en
            contacto contigo pronto.
          </p>
          <p className="text-sm" style={{ color: C.textMuted }}>
            Recibirás un correo cuando tu cuenta sea aprobada.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="registro" className="py-24 bg-white" style={{ fontFamily: "Poppins, sans-serif" }}>
      <div className="max-w-3xl mx-auto px-6">

        <motion.div {...fadeUp} className="text-center mb-12">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full mb-4"
            style={{ background: `${C.brand}12`, color: C.brand }}>
            Únete a Inteira
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4" style={{ color: C.brand }}>
            Empieza tu camino con nosotros
          </h2>
          <p className="text-base" style={{ color: C.textMuted }}>
            Completa el formulario y nuestro equipo revisará tu solicitud en menos de 48 horas.
          </p>
        </motion.div>

        <motion.div {...fadeUp}>
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Fila 1: Nombre completo | Correo electrónico */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre completo <span className="text-red-500">*</span></Label>
                <Input id="fullName" placeholder="Tu nombre completo"
                  value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico <span className="text-red-500">*</span></Label>
                <Input id="email" type="email" placeholder="tu@email.com"
                  value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
            </div>

            {/* Fila 2: Teléfono | Profesión */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" placeholder="+52 55 0000 0000"
                  value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profession">Profesión</Label>
                <Input id="profession" placeholder="Ej: Psicóloga clínica"
                  value={form.profession} onChange={(e) => set("profession", e.target.value)} />
              </div>
            </div>

            {/* Fila 3: Especialidad | Años de experiencia */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Especialidad en Inteira <span className="text-red-500">*</span></Label>
                <Select value={form.specialtyId} onValueChange={(v) => set("specialtyId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={specialties ? "Selecciona tu especialidad..." : "Cargando..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {(specialties ?? []).map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Años de experiencia</Label>
                <Select value={form.yearsOfExperience} onValueChange={(v) => set("yearsOfExperience", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      { label: "Menos de 1 año", value: "0" },
                      { label: "1 – 2 años",     value: "1" },
                      { label: "3 – 5 años",     value: "3" },
                      { label: "6 – 10 años",    value: "6" },
                      { label: "11 – 15 años",   value: "11" },
                      { label: "Más de 15 años", value: "15" },
                    ].map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fila 4: Conocimiento de la Biblia | Motivación */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Conocimiento de la Biblia Inteira</Label>
                <Select value={form.bibliaKnowledge} onValueChange={(v) => set("bibliaKnowledge", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="si_completa">Sí, la he leído completa</SelectItem>
                    <SelectItem value="parcial">La conozco parcialmente</SelectItem>
                    <SelectItem value="no_lei">No la he leído aún</SelectItem>
                    <SelectItem value="que_es">¿Qué es la Biblia Inteira?</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="motivation">Motivación personal (breve)</Label>
                <Input id="motivation" placeholder="Lo que te mueve a ayudar..."
                  value={form.motivation} onChange={(e) => set("motivation", e.target.value)} />
              </div>
            </div>

            {/* Fila 5: ¿Por qué quieres unirte? */}
            <div className="space-y-2">
              <Label htmlFor="whyJoin">
                ¿Por qué quieres unirte a Inteira? <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="whyJoin"
                placeholder="Cuéntanos tu historia, tus objetivos y cómo Inteira encaja en tu práctica profesional..."
                rows={5}
                value={form.whyJoin}
                onChange={(e) => set("whyJoin", e.target.value)}
              />
            </div>

            <div className="flex justify-center pt-4">
              <Button
                type="submit"
                disabled={registerMutation.isPending}
                className="px-10 py-4 h-auto text-base font-bold text-white rounded-xl border-0 hover:opacity-90 transition-opacity"
                style={{ background: C.warm }}
              >
                {registerMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enviando solicitud...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Enviar solicitud
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="py-12 px-6" style={{ background: C.brand, fontFamily: "Poppins, sans-serif" }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap gap-10 justify-between mb-10">
          <div className="flex-1 min-w-[220px] max-w-[280px]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${C.warm}, #c49060)` }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" />
                </svg>
              </div>
              <span className="font-bold text-lg text-white">Inteira</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: C.nude }}>
              La plataforma de bienestar integral que conecta profesionales comprometidos con quienes los necesitan.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: C.olive }}>
              Profesionales
            </p>
            {["Nuestra Identidad", "Modelo de Trabajo", "Comunidad", "Únete"].map((l) => (
              <a key={l} href="#"
                className="block text-sm mb-2 transition-colors hover:text-white"
                style={{ color: C.nude }}>{l}</a>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: C.olive }}>Legal</p>
            {[{ l: "Términos de servicio", h: "/terminos" }, { l: "Privacidad", h: "/privacidad" }].map(({ l, h }) => (
              <a key={l} href={h}
                className="block text-sm mb-2 transition-colors hover:text-white"
                style={{ color: C.nude }}>{l}</a>
            ))}
          </div>
        </div>
        <div className="border-t pt-6 text-center" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          <p className="text-xs" style={{ color: "rgba(203,173,166,0.5)" }}>
            © {new Date().getFullYear()} Inteira. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProfessionalsLanding() {
  const [videoWatched, setVideoWatched] = useState(false);

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
          onComplete={() => setVideoWatched(true)}
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
