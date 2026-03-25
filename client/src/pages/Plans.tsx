import DashboardLayout from "../components/DashboardLayout";
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
];

const NORMAS = [
  { q: "¿Puedo reprogramar una cita?", a: "Sí, puedes reprogramar con al menos 24 horas de anticipación sin costo." },
  { q: "¿Qué pasa si cancelo tarde?", a: "Las cancelaciones con menos de 24 horas de anticipación consumen el crédito de la sesión." },
  { q: "¿Cómo se realizan las sesiones?", a: "Las sesiones se realizan por videollamada a través de Zoom o Google Meet, según el especialista." },
  { q: "¿Los especialistas están verificados?", a: "Sí, todos los especialistas pasan por un proceso de verificación de credenciales antes de ser aprobados." },
  { q: "¿Puedo solicitar reembolso?", a: "Los créditos no son reembolsables en efectivo, pero pueden usarse en cualquier especialidad disponible." },
];

export default function Plans() {
  const { isAuthenticated, user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

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
    <DashboardLayout>
      <div className="p-4 md:p-6">
        <h1 className="text-xl font-medium text-[#333333] mb-1">Planes y precios</h1>
        <p className="text-sm text-[#93A295] mb-6">Sin contratos. Cancela cuando quieras.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* COLUMNA IZQUIERDA — planes */}
          <div>
            {/* SUSCRIPCIONES */}
            <p className="text-[10px] font-medium text-[#93A295] tracking-widest uppercase mb-4">Suscripciones mensuales</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {PLANS.map((plan) => (
                <div key={plan.id} className={`bg-white rounded-2xl p-5 relative ${plan.popular ? "border-2 border-[#607562]" : "border border-[rgba(96,117,98,0.2)]"}`}>
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#607562] text-white text-[10px] font-medium px-3 py-1 rounded-full whitespace-nowrap">Más popular</span>
                  )}
                  <p className="text-[15px] font-medium text-[#333333] mb-1">{plan.name}</p>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-[28px] font-medium text-[#3d4e3f]">{plan.price}</span>
                    <span className="text-sm text-[#93A295]">MXN/mes</span>
                  </div>
                  <span className="inline-block bg-[rgba(96,117,98,0.1)] text-[#607562] text-[10px] font-medium px-2 py-0.5 rounded-full mb-4">{plan.savings}</span>
                  <ul className="space-y-2 mb-5">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] text-[#555555]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#607562" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0 mt-0.5"><polyline points="20 6 9 17 4 12"/></svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleSelectPlan(plan.name)}
                    disabled={loadingPlan === plan.name}
                    className={`w-full py-2.5 rounded-xl text-[13px] font-medium transition-opacity cursor-pointer border-none ${plan.popular ? "bg-[#607562] text-white hover:opacity-90" : "bg-white text-[#607562] hover:bg-[#f0f4f0]"}`}
                    style={{ border: plan.popular ? "none" : "0.5px solid rgba(96,117,98,0.4)" }}
                  >
                    {loadingPlan === plan.name ? "Procesando..." : `Comenzar con ${plan.name}`}
                  </button>
                </div>
              ))}
            </div>

            {/* COMPRA INDIVIDUAL */}
            <p className="text-[10px] font-medium text-[#93A295] tracking-widest uppercase mb-4">Compra individual</p>
            <div className="grid grid-cols-2 gap-3">
              {INDIVIDUAL.map((item) => (
                <div key={item.name} className="bg-white border border-[rgba(96,117,98,0.15)] rounded-xl p-4">
                  <p className="text-[13px] font-medium text-[#333333] mb-1">{item.name}</p>
                  <p className="text-[11px] text-[#93A295] mb-3 leading-relaxed">{item.description}</p>
                  <p className="text-[20px] font-medium text-[#3d4e3f] mb-3">{item.price} <span className="text-[12px] text-[#93A295] font-normal">MXN</span></p>
                  <button
                    onClick={() => handleSelectPlan(item.name)}
                    disabled={loadingPlan === item.name}
                    className="w-full py-2 rounded-lg text-[12px] font-medium bg-white text-[#607562] hover:bg-[#f0f4f0] transition-colors cursor-pointer"
                    style={{ border: "0.5px solid rgba(96,117,98,0.3)" }}
                  >
                    {loadingPlan === item.name ? "Procesando..." : "Comprar sesión"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* COLUMNA DERECHA — FAQ + normas */}
          <div className="bg-white border border-[rgba(96,117,98,0.15)] rounded-2xl p-5">
            <p className="text-[10px] font-medium text-[#93A295] tracking-widest uppercase mb-4">Preguntas frecuentes</p>
            <div className="space-y-0">
              {[...FAQ, ...NORMAS].map((item, i) => (
                <div key={i} className="border-b border-[rgba(96,117,98,0.1)] py-4 last:border-0">
                  <p className="text-[13px] font-medium text-[#333333] mb-2">{item.q}</p>
                  <p className="text-[12px] text-[#666666] leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
