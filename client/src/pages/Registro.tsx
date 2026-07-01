import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function Registro() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  // Pre-fill email from query param (set by Login when notRegistered)
  const initialEmail = new URLSearchParams(window.location.search).get("email") ?? "";

  const [step, setStep] = useState<"form" | "verify">("form");
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: initialEmail });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // Countdown for resend button
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      if (user.role === "professional") navigate("/panel-profesional");
      else if (user.role === "admin") navigate("/admin");
      else navigate("/dashboard");
    }
  }, [isAuthenticated, loading, user, navigate]);

  const handleRequestOtp = async () => {
    setSubmitting(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth/email/register-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error ?? "Error enviando código"); return; }
      setStep("verify");
      setResendTimer(30);
    } catch {
      setAuthError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    setSubmitting(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth/email/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error ?? "Código inválido"); return; }
      window.location.href = data.redirectTo ?? "/dashboard";
    } catch {
      setAuthError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setOtpCode("");
    setAuthError("");
    await handleRequestOtp();
  };

  const inputClass =
    "w-full px-4 py-3 border border-border rounded-2xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors placeholder:text-muted-foreground";
  const btnPrimary =
    "w-full py-3 rounded-2xl text-white font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 flex items-center">
        <a href="https://inteira.mx/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center overflow-hidden">
            <img src="/logo-icon.webp" alt="Inteira" className="w-5 h-5 object-contain" />
          </div>
          <span className="font-bold text-lg" style={{ fontFamily: "Poppins, sans-serif" }}>
            inteira
          </span>
        </a>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="bg-card border border-border rounded-3xl shadow-xl p-8 space-y-6">

            {/* Logo & título */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto shadow-lg shadow-primary/30 overflow-hidden">
                <img src="/logo-icon.webp" alt="Inteira" className="w-11 h-11 object-contain" />
              </div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
                {step === "verify" ? "Verifica tu email" : "Crear cuenta"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {step === "verify"
                  ? `Código enviado a ${formData.email}`
                  : "Únete a Inteira"}
              </p>
            </div>

            {/* ── STEP: form — nombre + apellido + email + términos ── */}
            {step === "form" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nombre"
                    value={formData.firstName}
                    onChange={(e) => setFormData((d) => ({ ...d, firstName: e.target.value }))}
                    className={inputClass}
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="Apellido"
                    value={formData.lastName}
                    onChange={(e) => setFormData((d) => ({ ...d, lastName: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <input
                  type="email"
                  placeholder="tucorreo@ejemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData((d) => ({ ...d, email: e.target.value }))}
                  className={inputClass}
                />
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded accent-primary flex-shrink-0"
                  />
                  <span className="text-xs text-muted-foreground leading-relaxed">
                    Acepto los{" "}
                    <a href="/terminos" className="text-primary hover:underline">Términos de servicio</a>
                    {" "}y la{" "}
                    <a href="/privacidad" className="text-primary hover:underline">Política de privacidad</a>
                  </span>
                </label>

                {authError && (
                  <p className="text-xs text-red-500 text-center">{authError}</p>
                )}

                <button
                  onClick={handleRequestOtp}
                  disabled={
                    submitting ||
                    !formData.firstName.trim() ||
                    !formData.lastName.trim() ||
                    !formData.email.trim() ||
                    !termsAccepted
                  }
                  className={btnPrimary}
                  style={{ background: "#607562" }}
                >
                  {submitting ? "Enviando código..." : "Crear cuenta"}
                </button>

                <p className="text-center text-xs text-muted-foreground">
                  ¿Ya tienes cuenta?{" "}
                  <a href="/login" className="text-primary hover:underline font-medium">
                    Inicia sesión
                  </a>
                </p>
              </div>
            )}

            {/* ── STEP: verify — input del código OTP ── */}
            {step === "verify" && (
              <div className="space-y-4">
                <p className="text-sm text-center text-muted-foreground">
                  Ingresa el código de 6 dígitos que enviamos a{" "}
                  <strong className="text-foreground">{formData.email}</strong>
                </p>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full text-center text-3xl font-mono tracking-[0.5em] border border-border rounded-2xl py-4 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  autoFocus
                />

                {authError && (
                  <p className="text-xs text-red-500 text-center">{authError}</p>
                )}

                <button
                  onClick={handleVerifyOtp}
                  disabled={submitting || otpCode.length !== 6}
                  className={btnPrimary}
                  style={{ background: "#607562" }}
                >
                  {submitting ? "Verificando..." : "Verificar código"}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <span>¿No llegó?</span>
                  {resendTimer > 0 ? (
                    <span className="tabular-nums">Reenviar en {resendTimer}s</span>
                  ) : (
                    <button
                      onClick={handleResend}
                      disabled={submitting}
                      className="text-primary hover:underline font-medium disabled:opacity-50"
                    >
                      Reenviar código
                    </button>
                  )}
                </div>

                <button
                  onClick={() => { setStep("form"); setOtpCode(""); setAuthError(""); }}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  ← Cambiar email
                </button>
              </div>
            )}
          </div>

          {/* Volver al inicio */}
          <p className="text-center mt-6 text-sm text-muted-foreground">
            <a href="https://inteira.mx/" className="text-primary hover:underline font-medium">
              ← Volver al inicio
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
