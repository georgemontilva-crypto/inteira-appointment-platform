import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
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
import SpecialtiesPage from "./pages/SpecialtiesPage";
import AppointmentsPage from "./pages/AppointmentsPage";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/especialidades" component={SpecialtiesPage} />
      <Route path="/especialidades/:id" component={ProfessionalsList} />
      <Route path="/profesional/:id" component={ProfessionalProfile} />

      {/* Booking */}
      <Route path="/agendar/:id" component={BookAppointment} />

      {/* Registration */}
      <Route path="/registro-profesional" component={RegisterProfessional} />

      {/* Plans */}
      <Route path="/planes" component={Plans} />

      {/* Wallet */}
      <Route path="/wallet" component={WalletPage} />

      {/* Profile & Subscription */}
      <Route path="/perfil" component={UserProfile} />
      <Route path="/suscripcion" component={Subscription} />

      {/* Legal */}
      <Route path="/terminos" component={TermsOfService} />
      <Route path="/privacidad" component={PrivacyPolicy} />

      {/* Appointments */}
      <Route path="/citas" component={AppointmentsPage} />

      {/* Protected dashboards */}
      <Route path="/dashboard" component={UserDashboard} />
      <Route path="/panel-profesional" component={ProfessionalDashboard} />
      <Route path="/admin" component={AdminDashboard} />

      {/* Auth */}
      <Route path="/login" component={Login} />

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
