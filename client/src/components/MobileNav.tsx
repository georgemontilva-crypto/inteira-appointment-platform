import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Home, Search, Calendar, User, LayoutDashboard } from "lucide-react";

const navItems = [
  {
    label: "Inicio",
    href: "/",
    icon: Home,
    public: true,
  },
  {
    label: "Explorar",
    href: "/especialidades",
    icon: Search,
    public: true,
  },
  {
    label: "Mis citas",
    href: "/dashboard",
    icon: Calendar,
    public: false,
    authRequired: true,
  },
  {
    label: "Perfil",
    href: "/dashboard",
    icon: User,
    public: false,
    authRequired: true,
  },
];

export default function MobileNav() {
  const [location, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  const handleNav = (item: (typeof navItems)[number]) => {
    if (item.authRequired && !isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    navigate(item.href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-border safe-area-bottom">
      {/* Safe area padding for notched phones */}
      <div className="flex items-stretch h-16">
        {/* Public items */}
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <button
              key={item.href + item.label}
              onClick={() => handleNav(item)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors active:scale-95"
              aria-label={item.label}
            >
              <Icon
                className={`w-5 h-5 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
                strokeWidth={active ? 2.5 : 1.8}
              />
              <span
                className={`text-[10px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
              {active && (
                <span className="absolute bottom-0 w-8 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}

        {/* Center CTA button */}
        <div className="flex-1 flex items-center justify-center relative">
          <button
            onClick={() => {
              if (isAuthenticated) {
                navigate("/dashboard");
              } else {
                window.location.href = getLoginUrl();
              }
            }}
            className="w-14 h-14 -mt-5 rounded-full gradient-brand flex items-center justify-center shadow-lg shadow-primary/40 active:scale-95 transition-transform"
            aria-label="Dashboard"
          >
            <LayoutDashboard className="w-6 h-6 text-white" strokeWidth={2} />
          </button>
        </div>

        {/* Auth-dependent items */}
        {navItems.slice(2).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <button
              key={item.href + item.label}
              onClick={() => handleNav(item)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors active:scale-95"
              aria-label={item.label}
            >
              <Icon
                className={`w-5 h-5 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
                strokeWidth={active ? 2.5 : 1.8}
              />
              <span
                className={`text-[10px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      {/* Safe area spacer for iOS */}
      <div className="h-safe-bottom bg-white" />
    </nav>
  );
}
