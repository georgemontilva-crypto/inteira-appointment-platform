import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Login() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  // Si ya está autenticado, redirigir al dashboard correcto según el rol
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      if (user.role === "professional") {
        navigate("/panel-profesional");
      } else if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    }
  }, [isAuthenticated, loading, user, navigate]);

  const handleGoogleLogin = () => {
    // Leer returnTo de la URL si existe
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get("returnTo") ?? "/dashboard";
    const safeReturn = returnTo.startsWith("/") ? returnTo : "/dashboard";
    window.location.href = `/api/auth/google?returnTo=${encodeURIComponent(safeReturn)}`;
  };

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
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          {/* Card */}
          <div className="bg-card border border-border rounded-3xl shadow-xl p-8 space-y-6">
            {/* Logo & título */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto shadow-lg shadow-primary/30 overflow-hidden">
                <img src="/logo-icon.webp" alt="Inteira" className="w-11 h-11 object-contain" />
              </div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
                Bienvenido a Inteira
              </h1>
              <p className="text-sm text-muted-foreground">
                Conecta con especialistas de calidad en minutos
              </p>
            </div>

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
              {/* Google SVG icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </button>

            {/* Nota de privacidad */}
            <p className="text-center text-xs text-muted-foreground leading-relaxed">
              Al continuar, aceptas nuestros{" "}
              <a href="/terminos" className="text-primary hover:underline">Términos de servicio</a>
              {" "}y{" "}
              <a href="/privacidad" className="text-primary hover:underline">Política de privacidad</a>.
            </p>
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
