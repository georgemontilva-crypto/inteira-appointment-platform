import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowLeft, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { useState, useEffect } from "react";

// Mapa de nombre de plan → productType de Stripe
const PLAN_PRODUCT_MAP: Record<string, string> = {
  "Plan Básico": "plan_basic",
  "Plan Pro": "plan_pro",
  "Sesión Básica": "individual_basic",
  "Sesión Premium": "individual_premium",
  "Prueba $20": "test_20",
};

async function redirectToStripeCheckout(productType: string) {
  const res = await fetch("/api/stripe/create-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productType }),
  });
  const data = await res.json();
  if (data.url) {
    window.location.href = data.url;
  } else {
    throw new Error(data.error ?? "Error desconocido");
  }
}

const PLANS = [
  {
    id: "basico",
    name: "Plan Básico",
    price: "$980",
    period: "MXN/mes",
    savings: "Ahorra 30% vs compra individual",
    popular: false,
    features: [
      "980 créditos mensuales",
      "Equivalente a 4 asesorías básicas",
      "Vigencia de 60 días",
      "Acceso a todas las especialidades",
      "Soporte por email",
    ],
  },
  {
    id: "pro",
    name: "Plan Pro",
    price: "$2,500",
    period: "MXN/mes",
    savings: "Ahorra 52% vs compra individual",
    popular: true,
    features: [
      "2,500 créditos mensuales",
      "Equivalente a 2 asesorías premium",
      "Vigencia de 60 días",
      "Acceso prioritario a expertos",
      "Soporte 24/7 prioritario",
      "Acceso a comunidad exclusiva",
    ],
  },
];

const INDIVIDUAL = [
  {
    name: "Sesión Básica",
    price: "$350",
    description: "1 sesión · 60 min · Zoom o Meet",
  },
  {
    name: "Sesión Premium",
    price: "$1,250",
    description: "1 sesión · 90 min · Experto de alto nivel",
  },
];

const FAQ = [
  {
    q: "¿Qué son los créditos?",
    a: "Los créditos son la moneda interna de Inteira. Cada sesión consume créditos según su tipo: una sesión básica cuesta 350 créditos y una premium cuesta 1,250 créditos.",
  },
  {
    q: "¿Qué pasa si no uso todos mis créditos?",
    a: "Los créditos tienen una vigencia de 60 días desde la fecha de compra del plan. Los créditos no utilizados dentro de ese período no se acumulan para el siguiente mes.",
  },
  {
    q: "¿Puedo cancelar mi suscripción en cualquier momento?",
    a: "Sí. Puedes cancelar tu suscripción en cualquier momento desde tu panel de usuario. El plan permanecerá activo hasta el final del período pagado.",
  },
  {
    q: "¿Cómo se realizan las sesiones?",
    a: "Las sesiones se realizan por videollamada a través de Zoom o Google Meet. Al confirmar tu cita, recibirás el enlace de acceso directamente en la plataforma.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((v) => !v)}
      className="w-full text-left border border-border rounded-xl p-4 md:p-5 active:scale-[0.99] transition-transform"
    >
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-semibold text-sm">{q}</h4>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </div>
      {open && (
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{a}</p>
      )}
    </button>
  );
}

export default function Plans() {
  const { isAuthenticated, user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [, navigate] = useLocation();

  // Detectar retorno de Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      toast.success("¡Pago exitoso! Tus créditos serán acreditados en breve.");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("payment") === "cancelled") {
      toast.info("Pago cancelado.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleSelectPlan = async (planName: string) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    const productType = PLAN_PRODUCT_MAP[planName];
    if (!productType) {
      toast.error("Tipo de plan no reconocido");
      return;
    }
    if (!user?.id) {
      toast.error("Error de sesión. Vuelve a iniciar sesión.");
      return;
    }
    setLoadingPlan(planName);
    try {
      await redirectToStripeCheckout(productType);
    } catch (err) {
      toast.error("Error al iniciar el pago. Intenta de nuevo.");
      console.error("[Stripe]", err);
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      {/* ── Header ── */}
      <div className="gradient-hero text-white pt-safe">
        <div className="container py-8 md:py-12">
          <Link href="/">
            <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 mb-4 -ml-2 active:scale-95 transition-transform">
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="text-sm">Volver</span>
            </Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
            Planes y precios
          </h1>
          <p className="text-white/80 mt-1.5 text-sm md:text-base">
            Sin contratos. Cancela cuando quieras.
          </p>
        </div>
      </div>

      <div className="container py-6 md:py-12 space-y-8 md:space-y-12">

        {/* ── Suscripciones ── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4 md:text-center md:mb-8">
            Suscripciones Mensuales
          </p>
          <div className="grid md:grid-cols-2 gap-4 md:gap-8 md:max-w-3xl md:mx-auto">
            {PLANS.map((plan) => (
              <Card
                key={plan.id}
                className={`relative border-2 transition-all active:scale-[0.99] ${
                  plan.popular
                    ? "border-primary shadow-lg shadow-primary/20 md:scale-105"
                    : "border-border md:hover:border-primary/30 md:hover:shadow-xl md:hover:-translate-y-1"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="gradient-brand text-white border-0 px-3 py-0.5 text-xs shadow-md">
                      Mas popular
                    </Badge>
                  </div>
                )}
                <CardContent className="p-5 md:p-8">
                  {/* Price row */}
                  <div className="flex items-start justify-between md:block mb-4">
                    <div>
                      <h3 className="text-base md:text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
                        {plan.name}
                      </h3>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl md:text-4xl font-bold text-primary" style={{ fontFamily: "Poppins, sans-serif" }}>
                          {plan.price}
                        </span>
                        <span className="text-muted-foreground text-xs md:text-sm">{plan.period}</span>
                      </div>
                      <p className="text-xs text-primary font-medium mt-0.5">{plan.savings}</p>
                    </div>
                  </div>

                  <ul className="space-y-2 md:space-y-3 mb-5">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2 text-xs md:text-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleSelectPlan(plan.name)}
                    disabled={loadingPlan === plan.name}
                    className={`w-full text-sm active:scale-95 transition-transform ${
                      plan.popular
                        ? "gradient-brand text-white border-0 shadow-md shadow-primary/30"
                        : "border-primary/30 text-primary hover:bg-primary/5"
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {loadingPlan === plan.name ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Redirigiendo...
                      </>
                    ) : (
                      `Comenzar con ${plan.name}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Compra Individual ── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4 md:text-center md:mb-8">
            Compra Individual
          </p>
          <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-6 md:max-w-2xl md:mx-auto">
            {INDIVIDUAL.map((item) => (
              <Card
                key={item.name}
                className="border border-border active:scale-[0.99] transition-transform md:hover:border-primary/30 md:hover:shadow-md"
              >
                <CardContent className="p-4 md:p-6">
                  <h4 className="font-semibold text-sm md:text-base">{item.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                  <div className="mt-3 mb-4">
                    <span className="text-xl md:text-2xl font-bold text-primary" style={{ fontFamily: "Poppins, sans-serif" }}>
                      {item.price}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">MXN</span>
                  </div>
                  <Button
                    onClick={() => handleSelectPlan(item.name)}
                    disabled={loadingPlan === item.name}
                    variant="outline"
                    className="w-full border-primary/30 text-primary hover:bg-primary/5 text-xs active:scale-95 transition-transform"
                    size="sm"
                  >
                    {loadingPlan === item.name ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                        Redirigiendo...
                      </>
                    ) : (
                      "Comprar sesión"
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Paquete de prueba (solo admins) ── */}
        {user?.role === "admin" && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4 md:text-center md:mb-8">
              Prueba interna
            </p>
            <div className="md:max-w-xs md:mx-auto">
              <Card className="border border-dashed border-amber-400 bg-amber-50/50">
                <CardContent className="p-4 md:p-6">
                  <h4 className="font-semibold text-sm md:text-base">Prueba $20</h4>
                  <p className="text-xs text-muted-foreground mt-1">Paquete de prueba — 20 créditos</p>
                  <div className="mt-3 mb-4">
                    <span className="text-xl md:text-2xl font-bold text-amber-600" style={{ fontFamily: "Poppins, sans-serif" }}>
                      $20
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">MXN</span>
                  </div>
                  <Button
                    onClick={() => handleSelectPlan("Prueba $20")}
                    disabled={loadingPlan === "Prueba $20"}
                    variant="outline"
                    className="w-full border-amber-400 text-amber-700 hover:bg-amber-50 text-xs active:scale-95 transition-transform"
                    size="sm"
                  >
                    {loadingPlan === "Prueba $20" ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                        Redirigiendo...
                      </>
                    ) : (
                      "Comprar (prueba)"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── FAQ ── */}
        <div className="md:max-w-2xl md:mx-auto">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4 md:text-center md:mb-8">
            Preguntas frecuentes
          </p>
          <div className="space-y-2 md:space-y-4">
            {FAQ.map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
