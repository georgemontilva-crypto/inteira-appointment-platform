import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/spinner";
import { Suspense, lazy, useEffect } from "react";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";

/**
 * Cada pantalla se carga cuando se entra a ella, no al abrir la app.
 *
 * Antes el navegador bajaba 1.25 MB de JavaScript antes de pintar la primera
 * pantalla, aunque la persona solo fuera a ver sus citas. Con esto la carga
 * inicial baja a lo mínimo y el resto llega por ruta, que es lo que hace que
 * la app se sienta rápida en celular y con datos móviles.
 */
const Home = lazy(() => import("./pages/Home"));
const NotFound = lazy(() => import("./pages/NotFound"));
const WaitingRoom = lazy(() => import("./pages/WaitingRoom"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const ProfessionalDashboard = lazy(() => import("./pages/ProfessionalDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const ProfessionalsList = lazy(() => import("./pages/ProfessionalsList"));
const ProfessionalProfile = lazy(() => import("./pages/ProfessionalProfile"));
const BookAppointment = lazy(() => import("./pages/BookAppointment"));
const RegisterProfessional = lazy(() => import("./pages/RegisterProfessional"));
const Plans = lazy(() => import("./pages/Plans"));
const WalletPage = lazy(() => import("./pages/Wallet"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Subscription = lazy(() => import("./pages/Subscription"));
const Login = lazy(() => import("./pages/Login"));
const Registro = lazy(() => import("./pages/Registro"));
const RegistroTipo = lazy(() => import("./pages/RegistroTipo"));
const SpecialtiesPage = lazy(() => import("./pages/SpecialtiesPage"));
const AppointmentsPage = lazy(() => import("./pages/AppointmentsPage"));
const ProfessionalsLanding = lazy(() => import("./pages/ProfessionalsLanding"));

/** Lo que se ve mientras llega el código de la pantalla. */
function PantallaCargando() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner />
    </div>
  );
}

function EspecialidadesRoute() {
  const { user, loading } = useAuth();
  if (loading) return <PantallaCargando />;
  if (!user) return <ProfessionalsLanding />;
  return <SpecialtiesPage />;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PantallaCargando />;
  if (!user) return <Redirect to="/login" />;
  return <>{children}</>;
}

function RootRedirect() {
  const { isAuthenticated, loading, user } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      window.location.href = "https://inteira.mx/";
    }
  }, [loading, isAuthenticated]);

  if (loading || !isAuthenticated) return (
    <div className="flex items-center justify-center h-screen">
      <img src="https://pub-cc4c932d49594db4a582c5a9a78363f7.r2.dev/imagenes%20carrusel/Inteira-Verde-1.webp" className="h-10 animate-pulse" />
    </div>
  );

  if (user?.role === "professional") return <Redirect to="/panel-profesional" />;
  if (user?.role === "admin") return <Redirect to="/admin" />;
  return <Redirect to="/dashboard" />;
}

function Router() {
  return (
    <Switch>
      {/* Raíz: redirige según sesión (no autenticado → https://inteira.mx/) */}
      <Route path="/" component={RootRedirect} />
      {/* Landing (acceso directo) */}
      <Route path="/landing" component={Home} />
      {/* Landing profesionales */}
      <Route path="/profesionales" component={ProfessionalsLanding} />
      <Route path="/especialidades" component={EspecialidadesRoute} />
      <Route path="/especialidades/:slug" component={ProfessionalsList} />
      <Route path="/profesional/:slug" component={ProfessionalProfile} />

      {/* Booking — requiere auth */}
      <Route path="/agendar/:id">
        {(params) => <PrivateRoute><BookAppointment /></PrivateRoute>}
      </Route>

      {/* Registro de profesionales — pública, RegisterProfessional maneja auth internamente */}
      <Route path="/registro-profesional">
        <RegisterProfessional />
      </Route>

      {/* Plans — requiere auth */}
      <Route path="/planes">
        <PrivateRoute><Plans /></PrivateRoute>
      </Route>

      {/* Wallet — requiere auth */}
      <Route path="/wallet">
        <PrivateRoute><WalletPage /></PrivateRoute>
      </Route>

      {/* Profile & Subscription — requiere auth */}
      <Route path="/perfil">
        <PrivateRoute><UserProfile /></PrivateRoute>
      </Route>
      <Route path="/suscripcion">
        <PrivateRoute><Subscription /></PrivateRoute>
      </Route>

      {/* Legal — público */}
      <Route path="/terminos" component={TermsOfService} />
      <Route path="/privacidad" component={PrivacyPolicy} />

      {/* Appointments — requiere auth */}
      <Route path="/citas">
        <PrivateRoute><AppointmentsPage /></PrivateRoute>
      </Route>

      {/* Protected dashboards */}
      <Route path="/dashboard">
        <PrivateRoute><UserDashboard /></PrivateRoute>
      </Route>
      <Route path="/panel-profesional">
        <PrivateRoute><ProfessionalDashboard /></PrivateRoute>
      </Route>
      <Route path="/admin">
        <PrivateRoute><AdminDashboard /></PrivateRoute>
      </Route>

      {/* Auth */}
      <Route path="/sala/:id" component={WaitingRoom} />
      <Route path="/login" component={Login} />
      <Route path="/registro" component={RegistroTipo} />
      <Route path="/registro/usuario" component={Registro} />

      {/* Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Suspense fallback={<PantallaCargando />}>
            <Router />
          </Suspense>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
