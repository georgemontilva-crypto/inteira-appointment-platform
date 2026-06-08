import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/spinner";
import NotFound from "@/pages/NotFound";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import Home from "./pages/Home";
import UserDashboard from "./pages/UserDashboard";
import ProfessionalDashboard from "./pages/ProfessionalDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ProfessionalsList from "./pages/ProfessionalsList";
import ProfessionalProfile from "./pages/ProfessionalProfile";
import BookAppointment from "./pages/BookAppointment";
import RegisterProfessional from "./pages/RegisterProfessional";
import Plans from "./pages/Plans";
import WalletPage from "./pages/Wallet";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import UserProfile from "./pages/UserProfile";
import Subscription from "./pages/Subscription";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import RegistroTipo from "./pages/RegistroTipo";
import SpecialtiesPage from "./pages/SpecialtiesPage";
import AppointmentsPage from "./pages/AppointmentsPage";
import ProfessionalsLanding from "./pages/ProfessionalsLanding";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner />
    </div>
  );
  if (!user) return <Redirect to="/login" />;
  return <>{children}</>;
}

function RootRedirect() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <img src="https://pub-cc4c932d49594db4a582c5a9a78363f7.r2.dev/imagenes%20carrusel/Inteira-Verde-1.webp" className="h-10 animate-pulse" />
    </div>
  );

  if (!isAuthenticated) return <Redirect to="/login" />;
  if (user?.role === "professional") return <Redirect to="/panel-profesional" />;
  if (user?.role === "admin") return <Redirect to="/admin" />;
  return <Redirect to="/dashboard" />;
}

function Router() {
  return (
    <Switch>
      {/* Landing pública */}
      <Route path="/" component={Home} />
      {/* Landing (acceso directo) */}
      <Route path="/landing" component={Home} />
      {/* Landing profesionales */}
      <Route path="/profesionales" component={ProfessionalsLanding} />
      <Route path="/especialidades" component={SpecialtiesPage} />
      <Route path="/especialidades/:id" component={ProfessionalsList} />
      <Route path="/profesional/:id" component={ProfessionalProfile} />

      {/* Booking — requiere auth */}
      <Route path="/agendar/:id">
        {(params) => <PrivateRoute><BookAppointment /></PrivateRoute>}
      </Route>

      {/* Registration — requiere auth */}
      <Route path="/registro-profesional">
        <PrivateRoute><RegisterProfessional /></PrivateRoute>
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
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
