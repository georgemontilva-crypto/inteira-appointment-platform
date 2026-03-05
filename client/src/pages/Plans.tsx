import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

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

export default function Plans() {
  const { isAuthenticated } = useAuth();

  const handleSelectPlan = (planName: string) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    // Stripe se integrará aquí cuando se configuren las claves
    toast.info(`Seleccionaste el ${planName}. La integración de pago estará disponible próximamente.`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-hero text-white py-12">
        <div className="container">
          <Link href="/dashboard">
            <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 mb-4 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
            Planes y precios
          </h1>
          <p className="text-white/80 mt-2">
            Suscripciones mensuales o compra individual. Sin contratos, cancela cuando quieras.
          </p>
        </div>
      </div>

      <div className="container py-12 space-y-12">
        {/* Suscripciones */}
        <div>
          <h2 className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-8">
            Suscripciones Mensuales
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {PLANS.map((plan) => (
              <Card
                key={plan.id}
                className={`relative border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  plan.popular
                    ? "border-primary shadow-lg shadow-primary/20 scale-105"
                    : "border-border hover:border-primary/30"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="gradient-brand text-white border-0 px-4 py-1 shadow-md">
                      Mas popular
                    </Badge>
                  </div>
                )}
                <CardContent className="p-8">
                  <div className="mb-2">
                    <h3 className="text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span
                        className="text-4xl font-bold text-primary"
                        style={{ fontFamily: "Poppins, sans-serif" }}
                      >
                        {plan.price}
                      </span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>
                    <p className="text-xs text-primary font-medium mt-1">{plan.savings}</p>
                  </div>

                  <ul className="space-y-3 my-6">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleSelectPlan(plan.name)}
                    className={`w-full ${
                      plan.popular
                        ? "gradient-brand text-white border-0 shadow-md shadow-primary/30"
                        : "border-primary/30 text-primary hover:bg-primary/5"
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    Comenzar con {plan.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Compra Individual */}
        <div>
          <h2 className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-8">
            Compra Individual
          </h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {INDIVIDUAL.map((item) => (
              <Card
                key={item.name}
                className="border border-border hover:border-primary/30 transition-all hover:shadow-md"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold">{item.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    </div>
                    <div className="text-right ml-4">
                      <div
                        className="text-2xl font-bold text-primary"
                        style={{ fontFamily: "Poppins, sans-serif" }}
                      >
                        {item.price}
                      </div>
                      <div className="text-xs text-muted-foreground">MXN</div>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleSelectPlan(item.name)}
                    variant="outline"
                    className="w-full border-primary/30 text-primary hover:bg-primary/5"
                    size="sm"
                  >
                    Comprar sesión
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-8">
            Preguntas frecuentes
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "¿Qué son los créditos?",
                a: "Los créditos son la moneda interna de Inteira. Cada sesión consume créditos según su tipo: una sesión básica cuesta 245 créditos y una premium cuesta 1,250 créditos.",
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
            ].map((item, i) => (
              <div key={i} className="border border-border rounded-xl p-5">
                <h4 className="font-semibold text-sm mb-2">{item.q}</h4>
                <p className="text-sm text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
