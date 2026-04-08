import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function Login() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  // ── Email OTP state ──────────────────────────────────────────────────────────
  const [emailStep, setEmailStep] = useState<"idle" | "form" | "verify">("idle");
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "" });
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

  const handleGoogleLogin = () => {
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get("returnTo") ?? "/dashboard";
    const safeReturn = returnTo.startsWith("/") ? returnTo : "/dashboard";
    window.location.href = `/api/auth/google?returnTo=${encodeURIComponent(safeReturn)}`;
  };

  const handleRequestOtp = async () => {
    setSubmitting(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth/email/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error ?? "Error enviando código"); return; }
      setEmailStep("verify");
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
        <a href="/" className="flex items-center gap-2">
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
                {emailStep === "verify" ? "Verifica tu email" : "Bienvenido a Inteira"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {emailStep === "verify"
                  ? `Código enviado a ${formData.email}`
                  : "Conecta con especialistas de calidad"}
              </p>
            </div>

            {/* ── STEP: idle o form — mostrar Google + email ── */}
            {emailStep !== "verify" && (
              <>
                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-3 text-muted-foreground">Inicia sesión con</span>
                  </div>
                </div>

                {/* Botón Google */}
                <button
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-border rounded-2xl bg-background hover:bg-muted/50 active:scale-[0.98] transition-all font-medium text-sm shadow-sm"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continuar con Google
                </button>

                {/* Divider email */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-3 text-muted-foreground">o con tu email</span>
                  </div>
                </div>

                {/* ── STEP: idle — botón para abrir formulario ── */}
                {emailStep === "idle" && (
                  <button
                    onClick={() => setEmailStep("form")}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-border rounded-2xl bg-background hover:bg-muted/50 active:scale-[0.98] transition-all font-medium text-sm shadow-sm"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                    Continuar con Email
                  </button>
                )}

                {/* ── STEP: form — nombre + apellido + email + términos ── */}
                {emailStep === "form" && (
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
                      {submitting ? "Enviando código..." : "Continuar"}
                    </button>

                    <button
                      onClick={() => { setEmailStep("idle"); setAuthError(""); }}
                      className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                    >
                      ← Volver
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ── STEP: verify — input del código OTP ── */}
            {emailStep === "verify" && (
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
                  onClick={() => { setEmailStep("form"); setOtpCode(""); setAuthError(""); }}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  ← Cambiar email
                </button>
              </div>
            )}

            {/* Nota de privacidad — solo en idle */}
            {emailStep === "idle" && (
              <p className="text-center text-xs text-muted-foreground leading-relaxed">
                Al continuar, aceptas nuestros{" "}
                <a href="/terminos" className="text-primary hover:underline">Términos de servicio</a>
                {" "}y{" "}
                <a href="/privacidad" className="text-primary hover:underline">Política de privacidad</a>.
              </p>
            )}
          </div>

          {/* Volver al inicio */}
          <p className="text-center mt-6 text-sm text-muted-foreground">
            <a href="/" className="text-primary hover:underline font-medium">
              ← Volver al inicio
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
