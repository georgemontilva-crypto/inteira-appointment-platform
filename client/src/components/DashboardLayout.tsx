import { useState, useEffect } from "react";
import type { ReactElement } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../_core/hooks/useAuth";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import logo from "../assets/logo.webp";

const NAV_ITEMS = [
  { label: "Inicio",          icon: "home",     href: "/dashboard" },
  { label: "Mis citas",       icon: "calendar", href: "/citas" },
  { label: "Explorar",        icon: "search",   href: "/especialidades" },
  { label: "Wallet",          icon: "wallet",   href: "/wallet" },
  { label: "Planes",          icon: "star",     href: "/planes" },
  { label: "Notificaciones",  icon: "bell",     href: "#notifications", badge: true },
  { label: "Perfil",          icon: "user",     href: "/perfil" },
];

const PRO_NAV_SECTIONS = [
  {
    section: "Panel",
    items: [
      { label: "Mis citas",      icon: "calendar", href: "/panel-profesional#citas",          hash: "#citas" },
      { label: "Disponibilidad", icon: "clock",    href: "/panel-profesional#disponibilidad",  hash: "#disponibilidad" },
      { label: "Días libres",    icon: "calendar", href: "/panel-profesional#dias-libres",     hash: "#dias-libres" },
      { label: "Reseñas",        icon: "star",     href: "/panel-profesional#resenas",         hash: "#resenas" },
      { label: "Ganancias",      icon: "wallet",   href: "/panel-profesional#ganancias",       hash: "#ganancias" },
      { label: "Mi perfil",      icon: "user",     href: "/panel-profesional#perfil",          hash: "#perfil" },
    ],
  },
  {
    section: "Cuenta",
    items: [
      { label: "Ir al inicio",   icon: "home",     href: "/dashboard",                         hash: "" },
    ],
  },
];

const ICONS: Record<string, ReactElement> = {
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  calendar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>,
  wallet: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
  star: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  logout: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  grid: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="2" width="9" height="9" rx="1"/><rect x="13" y="2" width="9" height="9" rx="1"/><rect x="2" y="13" width="9" height="9" rx="1"/><rect x="13" y="13" width="9" height="9" rx="1"/></svg>,
  layers: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
  mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
};

function Icon({ name, className = "w-4 h-4" }: { name: string; className?: string }) {
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      {ICONS[name]}
    </span>
  );
}

type PanelTab = "notifications" | "wallet" | "profile";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
}

export default function DashboardLayout({ children, title, subtitle, headerRight }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();
  const isProMode = location.startsWith("/panel-profesional");
  const isProfessional = user?.role === "professional";
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PanelTab>("notifications");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentHash, setCurrentHash] = useState(
    typeof window !== "undefined" ? window.location.hash : ""
  );

  useEffect(() => {
    const handleHash = () => setCurrentHash(window.location.hash);
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const openPanel = (tab: PanelTab) => {
    setActiveTab(tab);
    setPanelOpen(true);
  };

  // Onboarding: name collection
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const utils = trpc.useUtils();
  const updateUserName = trpc.user.updateUserName.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      utils.user.getProfile.invalidate();
      toast.success("¡Nombre guardado!");
    },
    onError: (err) => toast.error(err.message ?? "Error al guardar el nombre"),
  });
  const needsOnboarding = !!user && (!user.name || user.name.trim() === "") && !updateUserName.isSuccess;

  const handleSaveName = () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Por favor ingresa tu nombre y apellido");
      return;
    }
    updateUserName.mutate({ firstName, lastName });
  };

  // Notifications
  const { data: unreadCount } = trpc.notifications.getUnreadCount.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 30000,
  });
  const { data: notifications } = trpc.notifications.getAll.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 30000,
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({ onSuccess: () => {} });
  const markOneRead = trpc.notifications.markRead.useMutation({ onSuccess: () => {} });

  // Wallet (for panel tab)
  const { data: walletData } = trpc.user.getWallet.useQuery(undefined, {
    enabled: !!user && panelOpen && !isProMode,
  });

  // Professional data (for pro mode)
  const { data: proProfile } = trpc.professional.getProfile.useQuery(undefined, {
    enabled: isProfessional,
  });
  const { data: proWalletData } = trpc.professional.getWallet.useQuery(undefined, {
    enabled: isProfessional && isProMode && panelOpen,
  });

  const count = unreadCount?.count ?? 0;
  const initials = user?.name?.charAt(0)?.toUpperCase() ?? "U";
  const profileImage = (user as any)?.profileImage ?? null;

  // Componente de avatar reutilizable
  const UserAvatar = ({ size = "sm" }: { size?: "sm" | "md" | "lg" }) => {
    const sizeMap = { sm: "w-8 h-8 text-[12px]", md: "w-6 h-6 text-[10px]", lg: "w-14 h-14 text-lg" };
    const cls = sizeMap[size];
    return profileImage ? (
      <img src={profileImage} alt={user?.name ?? "Avatar"} className={`${cls} rounded-full object-cover border-2 border-[rgba(96,117,98,0.3)]`} referrerPolicy="no-referrer" />
    ) : (
      <div className={`${cls} rounded-full flex items-center justify-center font-medium text-white border-2 border-[rgba(96,117,98,0.3)]`} style={{ background: "linear-gradient(135deg,#3d4e3f,#607562)" }}>{initials}</div>
    );
  };

  // Build nav items including role-specific items
  // El href de "Inicio" depende del rol del usuario
  const homeHref =
    user?.role === "professional" ? "/panel-profesional" :
    user?.role === "admin" ? "/admin" :
    "/dashboard";
  const navItems = NAV_ITEMS.map((item) =>
    item.href === "/dashboard" ? { ...item, href: homeHref } : item
  );
  if (user?.role === "admin") {
    navItems.push({ label: "Admin", icon: "shield", href: "/admin" });
  }
  if (user?.role === "professional") {
    navItems.push({ label: "Mi panel", icon: "shield", href: "/panel-profesional" });
  }

  // Drawer grid sections — filtered by active mode
  type DrawerItem = { label: string; icon: string; href: string };
  const drawerSections: { section: string; items: DrawerItem[] }[] =
    isProfessional
      ? isProMode
        ? [
            {
              section: "Panel profesional",
              items: [
                { label: "Inicio",         icon: "home",     href: "/panel-profesional" },
                { label: "Mis citas",      icon: "calendar", href: "/panel-profesional#citas" },
                { label: "Ganancias",      icon: "wallet",   href: "/panel-profesional#ganancias" },
                { label: "Disponibilidad", icon: "clock",    href: "/panel-profesional#disponibilidad" },
                { label: "Reseñas",        icon: "star",     href: "/panel-profesional#resenas" },
                { label: "Mi perfil",      icon: "user",     href: "/panel-profesional#perfil" },
              ],
            },
          ]
        : [
            {
              section: "Como cliente",
              items: [
                { label: "Inicio",   icon: "home",     href: "/dashboard" },
                { label: "Mis citas",icon: "calendar", href: "/citas" },
                { label: "Explorar", icon: "search",   href: "/especialidades" },
                { label: "Wallet",   icon: "wallet",   href: "/wallet" },
                { label: "Planes",   icon: "star",     href: "/planes" },
                { label: "Perfil",   icon: "user",     href: "/perfil" },
              ],
            },
          ]
      : [
          {
            section: "",
            items: [
              { label: "Inicio",   icon: "home",     href: "/dashboard" },
              { label: "Mis citas",icon: "calendar", href: "/citas" },
              { label: "Explorar", icon: "search",   href: "/especialidades" },
              { label: "Wallet",   icon: "wallet",   href: "/wallet" },
              { label: "Planes",   icon: "star",     href: "/planes" },
              { label: "Perfil",   icon: "user",     href: "/perfil" },
              ...(user?.role === "admin" ? [{ label: "Admin", icon: "shield", href: "/admin" }] : []),
            ],
          },
        ];

  return (
    <div className="flex flex-col min-h-screen bg-[#F7FAFC]">
      {/* TOP BAR */}
      <header className="bg-white border-b border-[rgba(96,117,98,0.15)] flex-shrink-0 sticky top-0 z-30">
        {/* MOBILE TOPBAR */}
        <div className="md:hidden flex items-center justify-between px-4 h-14">
          <button onClick={() => setDrawerOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#607562", display: "flex" }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          {/* Center: mode switcher for professional, logo otherwise */}
          {user?.role === "professional" ? (
            <div style={{ display: "flex", background: "#f0f4f0", borderRadius: 20, padding: 2 }}>
              <button
                onClick={() => navigate("/dashboard")}
                style={{ padding: "4px 12px", borderRadius: 18, fontSize: 12, fontWeight: 500, background: !isProMode ? "#607562" : "transparent", color: !isProMode ? "#fff" : "#607562", border: "none", cursor: "pointer" }}
              >Cliente</button>
              <button
                onClick={() => navigate("/panel-profesional")}
                style={{ padding: "4px 12px", borderRadius: 18, fontSize: 12, fontWeight: 500, background: isProMode ? "#607562" : "transparent", color: isProMode ? "#fff" : "#607562", border: "none", cursor: "pointer" }}
              >Profesional</button>
            </div>
          ) : (
            <img src={logo} alt="Inteira" style={{ height: "24px", width: "auto", objectFit: "contain" }} />
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => openPanel("notifications")} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", color: "#607562", padding: 0, display: "flex" }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {count > 0 && <span style={{ position: "absolute", top: -4, right: -4, width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />}
            </button>
            {/* CTA: clock for pro mode, + otherwise */}
            {user?.role === "professional" && isProMode ? (
              <button onClick={() => { window.location.href = "/panel-profesional#disponibilidad"; }} style={{ background: "#607562", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </button>
            ) : (
              <button onClick={() => navigate("/especialidades")} style={{ background: "#607562", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            )}
            <button onClick={() => openPanel("profile")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
              <UserAvatar size="sm" />
            </button>
          </div>
        </div>

        {/* DESKTOP TOPBAR */}
        <div className="hidden md:flex items-center gap-2 px-4 h-[58px]">
          <div className="flex items-center gap-2 flex-shrink-0">
            <img src={logo} alt="Inteira" style={{ height: "28px", width: "auto", objectFit: "contain" }} />
          </div>
          <div className="flex items-center gap-2 bg-[#F7FAFC] border border-[rgba(96,117,98,0.2)] rounded-full px-3 h-[34px] w-[200px] flex-shrink-0 ml-2">
            <Icon name="search" className="w-3.5 h-3.5 text-[#93A295]" />
            <input className="bg-transparent border-none outline-none text-[13px] text-[#333333] w-full placeholder:text-[#93A295]" placeholder="Buscar especialistas..." />
          </div>
          <nav className="flex items-center">
            {[
              { label: "Especialidades", href: "/especialidades" },
              { label: "Planes", href: "/planes" },
            ].map((item) => (
              <Link key={item.label} href={item.href}>
                <a className="px-3 h-[58px] flex items-center text-[13px] font-medium text-[#93A295] hover:text-[#3d4e3f] cursor-pointer border-b-2 border-transparent hover:border-[#607562] transition-colors whitespace-nowrap">{item.label}</a>
              </Link>
            ))}
          </nav>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <button onClick={() => openPanel("notifications")} className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f0f4f0] transition-colors text-[#607562]">
              <Icon name="bell" className="w-[18px] h-[18px]" />
              {count > 0 && <span className="absolute top-0.5 right-0.5 min-w-[15px] h-[15px] bg-red-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5">{count > 9 ? "9+" : count}</span>}
            </button>
            <button onClick={() => openPanel("wallet")} className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f0f4f0] transition-colors text-[#607562]">
              <Icon name="wallet" className="w-[18px] h-[18px]" />
            </button>
            <button onClick={() => openPanel("notifications")} className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f0f4f0] transition-colors text-[#607562]">
              <Icon name="grid" className="w-[18px] h-[18px]" />
            </button>
            <button onClick={() => openPanel("profile")} className="ml-1 relative flex-shrink-0">
              <UserAvatar size="sm" />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex overflow-hidden" style={{ height: "calc(100vh - 58px)" }}>
        {/* SIDEBAR */}
        <aside className="w-[220px] flex-shrink-0 bg-white border-r border-[rgba(96,117,98,0.15)] flex-col hidden md:flex overflow-hidden sticky top-[58px]" style={{ height: "calc(100vh - 58px)" }}>
          <nav className="flex-1 overflow-y-auto p-2.5">
            {user?.role === "professional" ? (
              /* ── Sidebar profesional — grid 2 col con secciones ── */
              <div className="flex flex-col gap-3">
                {PRO_NAV_SECTIONS.map((section) => (
                  <div key={section.section}>
                    <p className="text-[9px] font-semibold text-[#93A295] uppercase tracking-widest px-1 mb-1.5">{section.section}</p>
                    <div className="grid grid-cols-2 gap-1.5" style={{ gridAutoRows: "minmax(68px, auto)" }}>
                      {section.items.map((item) => {
                        const isActive = item.hash ? currentHash === item.hash : location === item.href;
                        const cellClass = `flex flex-col items-start justify-end p-2.5 rounded-[9px] border min-h-[68px] transition-all cursor-pointer relative ${
                          isActive
                            ? "bg-[rgba(96,117,98,0.12)] border-[rgba(96,117,98,0.35)]"
                            : "bg-[#F7FAFC] border-[rgba(96,117,98,0.15)] hover:bg-[#f0f4f0] hover:border-[rgba(96,117,98,0.3)]"
                        }`;
                        return (
                          <a
                            key={item.label}
                            className={cellClass}
                            onClick={() => {
                              if (item.hash) {
                                window.location.hash = item.hash;
                              } else {
                                window.location.href = item.href;
                              }
                            }}
                          >
                            <span className={`w-[18px] h-[18px] mb-1.5 ${isActive ? "text-[#3d4e3f]" : "text-[#93A295]"}`}>
                              {ICONS[item.icon]}
                            </span>
                            <span className={`text-[11px] font-medium leading-tight ${isActive ? "text-[#3d4e3f]" : "text-[#607562]"}`}>
                              {item.label}
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* ── Sidebar usuario/admin ── */
              <div className="grid grid-cols-2 gap-1.5" style={{ gridAutoRows: "minmax(68px, auto)" }}>
                {navItems.map((item) => {
                  const isNotifications = item.href === "#notifications";
                  const isActive = !isNotifications && (location === item.href || location.startsWith(item.href + "/"));
                  const isAdmin = item.icon === "shield" && user?.role === "admin";
                  const cellClass = `flex flex-col items-start justify-end p-2.5 rounded-[9px] border min-h-[68px] transition-all cursor-pointer relative ${
                    isActive
                      ? "bg-[rgba(96,117,98,0.12)] border-[rgba(96,117,98,0.35)]"
                      : isAdmin
                      ? "bg-[#fff8f7] border-[rgba(180,60,60,0.2)]"
                      : "bg-[#F7FAFC] border-[rgba(96,117,98,0.15)] hover:bg-[#f0f4f0] hover:border-[rgba(96,117,98,0.3)]"
                  }`;
                  const inner = (
                    <>
                      {(item as any).badge && count > 0 && (
                        <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] bg-red-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5">{count > 9 ? "9+" : count}</span>
                      )}
                      <span className={`w-[18px] h-[18px] mb-1.5 ${isActive ? "text-[#3d4e3f]" : isAdmin ? "text-[#B43C3C]" : "text-[#93A295]"}`}>
                        {ICONS[item.icon]}
                      </span>
                      <span className={`text-[11px] font-medium leading-tight ${isActive ? "text-[#3d4e3f]" : isAdmin ? "text-[#B43C3C]" : "text-[#607562]"}`}>
                        {item.label}
                      </span>
                    </>
                  );
                  if (isNotifications) {
                    return (
                      <button key="notifications" className={cellClass} onClick={() => openPanel("notifications")}>
                        {inner}
                      </button>
                    );
                  }
                  return (
                    <Link key={item.href} href={item.href}>
                      <a className={cellClass}>{inner}</a>
                    </Link>
                  );
                })}
              </div>
            )}
          </nav>

          {/* Footer fixed at bottom */}
          <div className="mt-auto border-t border-[rgba(96,117,98,0.1)]">
            <button
              onClick={logout}
              className="hover:bg-red-50 hover:text-red-500 transition-colors"
              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", width: "100%", border: "none", background: "transparent", color: "#666", fontSize: "13px", cursor: "pointer" }}
            >
              <Icon name="logout" className="w-4 h-4" />
              Cerrar sesión
            </button>
            <div className="p-2 border-t border-[rgba(96,117,98,0.1)]">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-[9px] bg-[#F7FAFC] border border-[rgba(96,117,98,0.15)] cursor-pointer" onClick={() => openPanel("profile")}>
                <div className="flex-shrink-0"><UserAvatar size="md" /></div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-[#333333] truncate">{user?.name ?? "Usuario"}</p>
                  <p className="text-[9px] text-[#607562]">{user?.role === "admin" ? "Admin" : user?.role === "professional" ? "Profesional" : "Usuario"}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto min-w-0">
          {(title || headerRight) && (
            <div className="bg-gradient-to-br from-[#3d4e3f] to-[#607562] px-6 py-5 relative overflow-hidden flex-shrink-0">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none" style={{ background: "rgba(255,255,255,0.05)", transform: "translate(30%,-30%)" }} />
              <div className="absolute bottom-0 right-20 w-28 h-28 rounded-full pointer-events-none" style={{ background: "rgba(255,255,255,0.04)", transform: "translateY(50%)" }} />
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div>
                  {title && <h1 className="text-lg font-medium text-white">{title}</h1>}
                  {subtitle && <p className="text-[12px] text-white/60 mt-0.5">{subtitle}</p>}
                </div>
                {headerRight && <div className="flex-shrink-0">{headerRight}</div>}
              </div>
            </div>
          )}
          <div>{children}</div>
        </main>
      </div>

      {/* MOBILE DRAWER */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-[60]" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/40" style={{ backdropFilter: "blur(2px)" }} />
          <div
            className="absolute top-0 left-0 bottom-0 w-[280px] bg-white flex flex-col overflow-hidden"
            style={{ boxShadow: "4px 0 24px rgba(0,0,0,0.15)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header — mode-aware */}
            <div style={{ background: "linear-gradient(145deg,#1e2f20,#2d4030)", padding: "24px 20px 20px", flexShrink: 0 }}>
              <div className="flex items-center gap-3">
                <UserAvatar size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-white leading-tight truncate">{user?.name ?? "Usuario"}</p>
                  {isProfessional && isProMode ? (
                    <p className="text-[11px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.5)" }}>{(proProfile as any)?.specialty?.name ?? "Especialista"}</p>
                  ) : (
                    <p className="text-[11px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.5)" }}>{user?.email}</p>
                  )}
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider" style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
                    {isProfessional && isProMode
                      ? `Profesional · ${(proProfile as any)?.tier === "pro" ? "Pro" : "Básico"}`
                      : user?.role === "admin" ? "Admin" : "Cliente"}
                  </span>
                </div>
                <button onClick={() => setDrawerOpen(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>

            {/* Drawer nav — sectioned grid 2 columns */}
            <div className="flex-1 overflow-y-auto" style={{ padding: "12px 16px" }}>
              {drawerSections.map((sec, si) => (
                <div key={sec.section || si} style={{ marginBottom: sec.section ? 20 : 0 }}>
                  {sec.section && (
                    <p style={{ fontSize: 9, fontWeight: 600, color: "#93A295", textTransform: "uppercase", letterSpacing: "0.12em", padding: "0 4px 8px" }}>{sec.section}</p>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {sec.items.map((item) => {
                      const hrefBase = item.href.split("#")[0];
                      const hrefHash = item.href.includes("#") ? "#" + item.href.split("#")[1] : null;
                      const isActive = hrefHash
                        ? currentHash === hrefHash
                        : location === hrefBase || location.startsWith(hrefBase + "/");
                      return (
                        <a
                          key={item.label + item.href}
                          href={item.href}
                          onClick={(e) => { e.preventDefault(); window.location.href = item.href; setDrawerOpen(false); }}
                          style={{
                            background: isActive ? "rgba(96,117,98,0.12)" : "#f7faf7",
                            borderRadius: 12,
                            padding: "16px 8px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 8,
                            border: `1px solid ${isActive ? "rgba(96,117,98,0.35)" : "rgba(96,117,98,0.12)"}`,
                            cursor: "pointer",
                            textDecoration: "none",
                          }}
                        >
                          <span style={{ color: isActive ? "#3d4e3f" : "#607562", width: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                            {ICONS[item.icon]}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 500, color: isActive ? "#3d4e3f" : "#333", textAlign: "center", lineHeight: 1.3 }}>{item.label}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Sign out */}
            <div className="p-3 border-t border-[rgba(96,117,98,0.1)]">
              <button
                onClick={() => { logout(); setDrawerOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#fff5f5] transition-colors"
                style={{ border: "none", background: "transparent", cursor: "pointer" }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(239,68,68,0.08)" }}>
                  <Icon name="logout" className="w-4 h-4 text-red-500" />
                </div>
                <span className="text-[13px] font-medium text-red-500">Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RIGHT PANEL */}
      {panelOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setPanelOpen(false)}>
          <div className="absolute inset-0 bg-black/25" style={{ backdropFilter: "blur(2px)" }} />
          <div
            className="absolute bottom-0 left-0 right-0 h-[85vh] md:inset-auto md:top-2 md:right-2 md:bottom-2 md:w-[380px] md:h-auto bg-white flex flex-col overflow-hidden rounded-t-[20px] md:rounded-[16px]"
            style={{ border: "1px solid rgba(96,117,98,0.15)", boxShadow: "0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(96,117,98,0.1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pill handle — mobile only */}
            <div className="md:hidden" style={{ flexShrink: 0, paddingTop: 12 }}>
              <div style={{ width: 40, height: 4, background: "#e0e8e0", borderRadius: 2, margin: "0 auto" }} />
            </div>
            {/* Panel header: dark user section + tabs */}
            <div style={{ background: "linear-gradient(145deg,#1e2f20,#2d4030)", flexShrink: 0, padding: "20px 20px 0" }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="relative flex-shrink-0">
                  <UserAvatar size="lg" />
                  <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-green-400" style={{ border: "2px solid #1e2f20" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-white leading-tight truncate">{user?.name ?? "Usuario"}</p>
                  <p className="text-[11px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{user?.email}</p>
                  <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider" style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
                    {user?.role === "admin" ? "Admin" : user?.role === "professional" ? "Profesional" : "Usuario"}
                  </span>
                </div>
                <button
                  onClick={() => setPanelOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.6)" }} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Tabs */}
              <div className="flex">
                {([ { id: "notifications" as PanelTab, icon: "bell", label: "Avisos" }, { id: "wallet" as PanelTab, icon: "wallet", label: "Wallet" }, { id: "profile" as PanelTab, icon: "user", label: "Perfil" } ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center justify-center gap-1.5 flex-1 py-2.5 text-[11px] font-medium transition-all"
                    style={{
                      color: activeTab === tab.id ? "white" : "rgba(255,255,255,0.4)",
                      borderBottom: activeTab === tab.id ? "2px solid rgba(255,255,255,0.85)" : "2px solid transparent",
                    }}
                  >
                    <Icon name={tab.icon} className="w-3.5 h-3.5" />
                    {tab.label}
                    {tab.id === "notifications" && count > 0 && (
                      <span className="min-w-[14px] h-[14px] bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5">{count > 9 ? "9+" : count}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab: Notifications */}
            {activeTab === "notifications" && (
              <>
                <div className="flex justify-end px-4 py-2.5 border-b border-[rgba(96,117,98,0.08)]">
                  {count > 0 && (
                    <button onClick={() => markAllRead.mutate()} className="text-[11px] text-[#607562] hover:underline">
                      Marcar todas como leídas
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(96,117,98,0.2) transparent" }}>
                  {!notifications || notifications.length === 0 ? (
                    <div className="py-14 text-center">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(96,117,98,0.07)" }}>
                        <Icon name="bell" className="w-5 h-5 text-[#93A295]" />
                      </div>
                      <p className="text-[13px] text-[#93A295]">No hay notificaciones</p>
                    </div>
                  ) : (
                    notifications.map((n: any) => (
                      <div
                        key={n.id}
                        onClick={() => { if (!n.isRead) markOneRead.mutate({ id: n.id }); if (n.link) window.location.href = n.link; }}
                        className={`flex gap-3 px-4 py-3.5 border-b border-[rgba(96,117,98,0.07)] cursor-pointer transition-colors ${!n.isRead ? "bg-[#f5f8f5] hover:bg-[#eef3ee]" : "hover:bg-[#F7FAFC]"}`}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[#607562]" style={{ background: "rgba(96,117,98,0.1)" }}>
                          <Icon name="bell" className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[12px] font-semibold text-[#333333] leading-snug">{n.title}</p>
                            <span className="text-[9px] text-[#93A295] flex-shrink-0 mt-0.5">{new Date(n.createdAt).toLocaleDateString("es", { day: "numeric", month: "short" })}</span>
                          </div>
                          <p className="text-[11px] text-[#666] mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                          {n.link && <p className="text-[10px] text-[#607562] mt-1 font-medium">Ver detalles →</p>}
                        </div>
                        {!n.isRead && <div className="w-2 h-2 rounded-full bg-[#607562] flex-shrink-0 mt-2" />}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Tab: Wallet */}
            {activeTab === "wallet" && (
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(96,117,98,0.2) transparent" }}>
                {isProfessional && isProMode ? (
                  /* ── Professional earnings wallet ── */
                  <>
                    <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg,#0d1f10,#1a2e1a)" }}>
                      <div className="absolute top-0 right-0 w-36 h-36 rounded-full pointer-events-none" style={{ background: "rgba(255,255,255,0.04)", transform: "translate(40%,-40%)" }} />
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: "rgba(255,255,255,0.45)" }}>GANANCIAS DISPONIBLES</p>
                      <p className="text-4xl font-bold text-white leading-none">
                        ${((proWalletData as any)?.wallet?.availableBalance ?? 0).toLocaleString("es-MX")}
                      </p>
                      <p className="text-[12px] mt-1 font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>MXN</p>
                      <p className="text-[10px] mt-3 truncate" style={{ color: "rgba(255,255,255,0.25)" }}>
                        Total acumulado: ${((proWalletData as any)?.wallet?.totalEarnings ?? 0).toLocaleString("es-MX")} MXN
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Link href="/panel-profesional#ganancias">
                        <a className="flex flex-col items-center gap-1.5 p-3.5 rounded-xl border hover:bg-[#f0f4f0] transition-colors cursor-pointer text-center" style={{ background: "#F7FAFC", borderColor: "rgba(96,117,98,0.15)" }} onClick={() => setPanelOpen(false)}>
                          <Icon name="wallet" className="w-4 h-4 text-[#607562]" />
                          <span className="text-[11px] font-medium text-[#607562]">Ver ganancias</span>
                        </a>
                      </Link>
                      <Link href="/panel-profesional#ganancias">
                        <a className="flex flex-col items-center gap-1.5 p-3.5 rounded-xl border hover:bg-[#f0f4f0] transition-colors cursor-pointer text-center" style={{ background: "#F7FAFC", borderColor: "rgba(96,117,98,0.15)" }} onClick={() => setPanelOpen(false)}>
                          <Icon name="logout" className="w-4 h-4 text-[#607562]" />
                          <span className="text-[11px] font-medium text-[#607562]">Retirar</span>
                        </a>
                      </Link>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#93A295] uppercase tracking-widest font-semibold mb-3">Últimas ganancias</p>
                      {!(proWalletData as any)?.earnings?.length ? (
                        <p className="text-[12px] text-[#93A295] text-center py-4">Sin ganancias recientes</p>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {((proWalletData as any)?.earnings ?? []).slice(0, 5).map((e: any) => (
                            <div key={e.id} className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border" style={{ background: "#F7FAFC", borderColor: "rgba(96,117,98,0.1)" }}>
                              <div className="min-w-0">
                                <p className="text-[12px] font-medium text-[#333] truncate">{e.description ?? "Sesión completada"}</p>
                                <p className="text-[10px] text-[#93A295]">{new Date(e.createdAt).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}</p>
                              </div>
                              <span className="text-[13px] font-bold flex-shrink-0 ml-3 text-emerald-600">+${e.netAmount ?? e.amount}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* ── User credits wallet ── */
                  <>
                    <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg,#0d1f10,#1a2e1a)" }}>
                      <div className="absolute top-0 right-0 w-36 h-36 rounded-full pointer-events-none" style={{ background: "rgba(255,255,255,0.04)", transform: "translate(40%,-40%)" }} />
                      <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full pointer-events-none" style={{ background: "rgba(255,255,255,0.03)", transform: "translate(-30%,40%)" }} />
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: "rgba(255,255,255,0.45)" }}>SALDO DISPONIBLE</p>
                      <p className="text-4xl font-bold text-white leading-none">
                        {(walletData?.balance ?? 0).toLocaleString("es-MX")}
                      </p>
                      <p className="text-[12px] mt-1 font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>créditos</p>
                      <p className="text-[10px] mt-3 truncate" style={{ color: "rgba(255,255,255,0.25)" }}>Inteira Wallet · {user?.email}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Link href="/wallet">
                        <a className="flex flex-col items-center gap-1.5 p-3.5 rounded-xl border hover:bg-[#f0f4f0] transition-colors cursor-pointer text-center" style={{ background: "#F7FAFC", borderColor: "rgba(96,117,98,0.15)" }} onClick={() => setPanelOpen(false)}>
                          <Icon name="wallet" className="w-4 h-4 text-[#607562]" />
                          <span className="text-[11px] font-medium text-[#607562]">Ver wallet</span>
                        </a>
                      </Link>
                      <Link href="/planes">
                        <a className="flex flex-col items-center gap-1.5 p-3.5 rounded-xl border hover:bg-[#f0f4f0] transition-colors cursor-pointer text-center" style={{ background: "#F7FAFC", borderColor: "rgba(96,117,98,0.15)" }} onClick={() => setPanelOpen(false)}>
                          <Icon name="star" className="w-4 h-4 text-[#607562]" />
                          <span className="text-[11px] font-medium text-[#607562]">Ver planes</span>
                        </a>
                      </Link>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#93A295] uppercase tracking-widest font-semibold mb-3">Movimientos recientes</p>
                      {!walletData?.transactions || walletData.transactions.length === 0 ? (
                        <p className="text-[12px] text-[#93A295] text-center py-4">Sin movimientos recientes</p>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {walletData.transactions.slice(0, 5).map((tx: any) => {
                            const isPositive = tx.delta > 0;
                            const reasonLabel: Record<string, string> = { purchase: "Compra", consume: "Consumo", expire: "Vencimiento", refund: "Reembolso" };
                            return (
                              <div key={tx.id} className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border" style={{ background: "#F7FAFC", borderColor: "rgba(96,117,98,0.1)" }}>
                                <div className="min-w-0">
                                  <p className="text-[12px] font-medium text-[#333] truncate">{tx.description || reasonLabel[tx.reason] || tx.reason}</p>
                                  <p className="text-[10px] text-[#93A295]">{new Date(tx.createdAt).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}</p>
                                </div>
                                <span className={`text-[13px] font-bold flex-shrink-0 ml-3 ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
                                  {isPositive ? "+" : ""}{tx.delta}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tab: Profile */}
            {activeTab === "profile" && (
              <div className="flex-1 overflow-y-auto flex flex-col" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(96,117,98,0.2) transparent" }}>
                <div className="p-3 flex-1">
                  <p className="text-[9px] text-[#93A295] uppercase tracking-widest font-semibold px-3 py-2">Cuenta</p>

                  {[
                    { href: "/perfil", icon: "user", label: "Mi perfil" },
                    { href: "/suscripcion", icon: "star", label: "Mi suscripción" },
                  ].map((item) => (
                    <Link key={item.href} href={item.href}>
                      <a className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#f0f4f0] transition-colors cursor-pointer mb-0.5" onClick={() => setPanelOpen(false)}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(96,117,98,0.08)" }}>
                          <Icon name={item.icon} className="w-4 h-4 text-[#607562]" />
                        </div>
                        <span className="text-[13px] font-medium text-[#333] flex-1">{item.label}</span>
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#ccc]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                      </a>
                    </Link>
                  ))}

                  <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#f0f4f0] transition-colors mb-0.5" onClick={() => setActiveTab("notifications")}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(96,117,98,0.08)" }}>
                      <Icon name="bell" className="w-4 h-4 text-[#607562]" />
                    </div>
                    <span className="text-[13px] font-medium text-[#333] flex-1 text-left">Notificaciones</span>
                    {count > 0 && <span className="min-w-[18px] h-[18px] bg-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">{count}</span>}
                  </button>

                  {user?.role === "admin" && (
                    <Link href="/admin">
                      <a className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#fff0ee] transition-colors cursor-pointer mb-0.5" onClick={() => setPanelOpen(false)}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(180,60,60,0.08)" }}>
                          <Icon name="shield" className="w-4 h-4 text-red-500" />
                        </div>
                        <span className="text-[13px] font-medium text-red-600 flex-1">Panel Admin</span>
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#ccc]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                      </a>
                    </Link>
                  )}
                  {user?.role === "professional" && (
                    <Link href="/panel-profesional">
                      <a className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#f0f4f0] transition-colors cursor-pointer mb-0.5" onClick={() => setPanelOpen(false)}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(96,117,98,0.08)" }}>
                          <Icon name="shield" className="w-4 h-4 text-[#607562]" />
                        </div>
                        <span className="text-[13px] font-medium text-[#333] flex-1">Mi panel profesional</span>
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#ccc]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                      </a>
                    </Link>
                  )}
                </div>

                {/* Sign out */}
                <div className="p-3 border-t border-[rgba(96,117,98,0.1)]">
                  <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#fff5f5] transition-colors text-left">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(239,68,68,0.08)" }}>
                      <Icon name="logout" className="w-4 h-4 text-red-500" />
                    </div>
                    <span className="text-[13px] font-medium text-red-500">Cerrar sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Onboarding modal — blocks UI until user sets their name */}
      {needsOnboarding && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", width: "400px", maxWidth: "90vw" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 600, color: "#333", marginBottom: "8px" }}>¡Bienvenido a Inteira!</h2>
            <p style={{ fontSize: "14px", color: "#666", marginBottom: "24px" }}>Para continuar, ingresa tu nombre completo.</p>
            <input
              placeholder="Nombre"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #ddd", fontSize: "14px", boxSizing: "border-box" }}
            />
            <input
              placeholder="Apellido"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #ddd", fontSize: "14px", boxSizing: "border-box", marginTop: "12px" }}
            />
            <button
              onClick={handleSaveName}
              disabled={updateUserName.isPending}
              style={{ marginTop: "20px", width: "100%", background: "#607562", color: "#fff", border: "none", borderRadius: "10px", padding: "12px", fontSize: "15px", fontWeight: 500, cursor: "pointer", opacity: updateUserName.isPending ? 0.7 : 1 }}
            >
              {updateUserName.isPending ? "Guardando..." : "Continuar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
