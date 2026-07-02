import { useState, useEffect, useRef } from "react";
import type { ReactElement } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../_core/hooks/useAuth";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import logo from "../assets/logo.webp";
import ChangelogModal from "./ChangelogModal";
import ActiveSessionBanner from "./ActiveSessionBanner";
import { APP_VERSION } from "../data/changelog";

const SIDEBAR_BASE_ITEMS = [
  { label: "Inicio",    icon: "home",     href: "/" },
  { label: "Explorar",  icon: "search",   href: "/especialidades" },
  { label: "Mis citas", icon: "calendar", href: "/citas" },
  { label: "Wallet",    icon: "wallet",   href: "/wallet" },
  { label: "Perfil",    icon: "user",     href: "/perfil" },
];

const PRO_NAV_SECTIONS = [
  {
    section: "Panel",
    items: [
      { label: "Resumen",        icon: "grid",     href: "/panel-profesional#resumen",         hash: "#resumen" },
      { label: "Agenda",         icon: "calendar", href: "/panel-profesional#agenda",          hash: "#agenda" },
      { label: "Disponibilidad", icon: "clock",    href: "/panel-profesional#disponibilidad",  hash: "#disponibilidad" },
      { label: "Reseñas",        icon: "star",     href: "/panel-profesional#resenas",         hash: "#resenas" },
      { label: "Ganancias",      icon: "wallet",   href: "/panel-profesional#ganancias",       hash: "#ganancias" },
      { label: "Perfil",         icon: "user",     href: "/panel-profesional#perfil",          hash: "#perfil" },
    ],
  },
  {
    section: "Navegación",
    items: [
      { label: "Inicio",         icon: "home",     href: "/",                                  hash: "" },
      { label: "Dashboard",      icon: "layers",   href: "/panel-profesional",                 hash: "" },
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
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileDropOpen, setProfileDropOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const mobileNotifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [hasUnseenVersion, setHasUnseenVersion] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("inteira_seen_version") !== APP_VERSION;
  });
  const openChangelog = () => {
    setChangelogOpen(true);
    setHasUnseenVersion(false);
    localStorage.setItem("inteira_seen_version", APP_VERSION);
  };
  const [currentHash, setCurrentHash] = useState(
    typeof window !== "undefined" ? window.location.hash : ""
  );

  useEffect(() => {
    const handleHash = () => setCurrentHash(window.location.hash);
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideNotif = (notifRef.current && notifRef.current.contains(target)) || (mobileNotifRef.current && mobileNotifRef.current.contains(target));
      if (!insideNotif) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(target)) setProfileDropOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  // Notifications — filtered by active mode
  const notifAudience = isProMode && isProfessional ? "professional" : "user";
  const { data: unreadCount } = trpc.notifications.getUnreadCount.useQuery(
    { audience: notifAudience },
    { enabled: !!user, refetchInterval: 30000 }
  );
  const { data: notifications } = trpc.notifications.getAll.useQuery(
    { audience: notifAudience },
    { enabled: !!user, refetchInterval: 30000 }
  );
  const markAllRead = trpc.notifications.markAllRead.useMutation({ onSuccess: () => {} });
  const markOneRead = trpc.notifications.markRead.useMutation({ onSuccess: () => {} });

  // Professional data (for pro mode)
  const { data: proProfile } = trpc.professional.getProfile.useQuery(undefined, {
    enabled: isProfessional,
    staleTime: 5 * 60 * 1000,
  });

  const count = unreadCount?.count ?? 0;
  const initials = user?.name?.charAt(0)?.toUpperCase() ?? "U";
  const profileImage = (user as any)?.profileImage ?? null;

  // Derived avatar URL — pro profile photo in pro mode, user picture otherwise
  const avatarUrl: string | undefined = (isProMode && isProfessional && ((proProfile as any)?.profilePhoto ?? (proProfile as any)?.profileImage))
    ? ((proProfile as any).profilePhoto ?? (proProfile as any).profileImage)
    : (user as any)?.profileImage ?? undefined;

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

  // Sidebar items — simplified vertical list
  const sidebarItems = [...SIDEBAR_BASE_ITEMS];
  if (user?.role === "professional") {
    sidebarItems.push({ label: "Mi panel", icon: "shield", href: "/panel-profesional" });
  }
  if (user?.role === "admin") {
    sidebarItems.push({ label: "Admin", icon: "shield", href: "/admin" });
  }

  // Drawer grid sections — filtered by active mode
  type DrawerItem = { label: string; icon: string; href: string };
  const proDrawerSections: { section: string; items: DrawerItem[] }[] = [
    {
      section: "Panel profesional",
      items: [
        { label: "Inicio",         icon: "home",     href: "/" },
        { label: "Dashboard",      icon: "layers",   href: "/panel-profesional" },
        { label: "Agenda",         icon: "calendar", href: "/panel-profesional#agenda" },
        { label: "Ganancias",      icon: "wallet",   href: "/panel-profesional#ganancias" },
        { label: "Disponibilidad", icon: "clock",    href: "/panel-profesional#disponibilidad" },
        { label: "Reseñas",        icon: "star",     href: "/panel-profesional#resenas" },
        { label: "Perfil",         icon: "user",     href: "/panel-profesional#perfil" },
      ],
    },
  ];
  const clientDrawerSections: { section: string; items: DrawerItem[] }[] = [
    {
      section: "Como cliente",
      items: [
        { label: "Inicio",     icon: "home",     href: "/" },
        { label: "Dashboard",  icon: "grid",     href: "/dashboard" },
        { label: "Mis citas",  icon: "calendar", href: "/citas" },
        { label: "Explorar",   icon: "search",   href: "/especialidades" },
        { label: "Wallet",     icon: "wallet",   href: "/wallet" },
        { label: "Planes",     icon: "star",     href: "/planes" },
        { label: "Perfil",     icon: "user",     href: "/perfil" },
      ],
    },
  ];
  const userDrawerSections: { section: string; items: DrawerItem[] }[] = [
    {
      section: "",
      items: [
        { label: "Inicio",     icon: "home",     href: "/" },
        { label: "Dashboard",  icon: "grid",     href: "/dashboard" },
        { label: "Mis citas",  icon: "calendar", href: "/citas" },
        { label: "Explorar",   icon: "search",   href: "/especialidades" },
        { label: "Wallet",     icon: "wallet",   href: "/wallet" },
        { label: "Planes",     icon: "star",     href: "/planes" },
        { label: "Perfil",     icon: "user",     href: "/perfil" },
        ...(user?.role === "admin" ? [{ label: "Admin", icon: "shield", href: "/admin" }] : []),
      ],
    },
  ];
  const drawerSections = isProfessional
    ? (isProMode ? proDrawerSections : clientDrawerSections)
    : userDrawerSections;

  return (
    <div className="flex flex-col min-h-screen bg-[#F7FAFC]">
      {/* Active session global banner */}
      <ActiveSessionBanner />
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
                onClick={() => { console.log('[Switcher] clicking Cliente, current location:', location); navigate("/dashboard"); console.log('[Switcher] after navigate'); }}
                style={{ padding: "4px 12px", borderRadius: 18, fontSize: 12, fontWeight: 500, background: !isProMode ? "#607562" : "transparent", color: !isProMode ? "#fff" : "#607562", border: "none", cursor: "pointer" }}
              >Cliente</button>
              <button
                onClick={() => { console.log('[Switcher] clicking Profesional, current location:', location); navigate("/panel-profesional"); console.log('[Switcher] after navigate'); }}
                style={{ padding: "4px 12px", borderRadius: 18, fontSize: 12, fontWeight: 500, background: isProMode ? "#607562" : "transparent", color: isProMode ? "#fff" : "#607562", border: "none", cursor: "pointer" }}
              >Profesional</button>
            </div>
          ) : (
            <a href="https://inteira.mx/"><img src={logo} alt="Inteira" style={{ height: "24px", width: "auto", objectFit: "contain" }} /></a>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Notification bell + dropdown — mobile */}
            <div className="relative" ref={mobileNotifRef}>
              <button onClick={() => setNotifOpen((o) => !o)} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", color: "#607562", padding: 0, display: "flex" }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                {count > 0 && <span style={{ position: "absolute", top: -4, right: -4, width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-[300px] bg-white rounded-[14px] shadow-[0_8px_32px_rgba(0,0,0,0.14)] border border-[rgba(96,117,98,0.12)] overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(96,117,98,0.08)]">
                    <p className="text-[13px] font-semibold text-[#333]">Notificaciones</p>
                    {count > 0 && (
                      <button onClick={() => markAllRead.mutate()} className="text-[11px] text-[#607562] hover:underline">Marcar todas leídas</button>
                    )}
                  </div>
                  <div className="max-h-[360px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                    {!notifications || notifications.length === 0 ? (
                      <div className="py-10 text-center">
                        <Icon name="bell" className="w-8 h-8 text-[#93A295] mx-auto mb-2" />
                        <p className="text-[12px] text-[#93A295]">Sin notificaciones</p>
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((n: any) => (
                        <div
                          key={n.id}
                          onClick={() => { if (!n.isRead) markOneRead.mutate({ id: n.id }); if (n.link) { window.location.href = n.link; } setNotifOpen(false); }}
                          className={`flex gap-3 px-4 py-3 border-b border-[rgba(96,117,98,0.07)] cursor-pointer transition-colors ${!n.isRead ? "bg-[#f5f8f5] hover:bg-[#eef3ee]" : "hover:bg-[#F7FAFC]"}`}
                        >
                          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[#607562]" style={{ background: "rgba(96,117,98,0.1)" }}>
                            <Icon name="bell" className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold text-[#333] leading-snug">{n.title}</p>
                            <p className="text-[11px] text-[#666] mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                          </div>
                          {!n.isRead && <div className="w-2 h-2 rounded-full bg-[#607562] flex-shrink-0 mt-2" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
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
            <a href="/perfil" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", textDecoration: "none" }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-[rgba(96,117,98,0.3)]" referrerPolicy="no-referrer" />
              ) : (
                <UserAvatar size="sm" />
              )}
            </a>
          </div>
        </div>

        {/* DESKTOP TOPBAR */}
        <div className="hidden md:flex items-center gap-2 px-4 h-[58px]">
          <a href="https://inteira.mx/"><img src={logo} alt="Inteira" style={{ height: "28px", width: "auto", objectFit: "contain" }} /></a>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            {/* Notification bell + dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setNotifOpen((o) => !o); setProfileDropOpen(false); }}
                className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f0f4f0] transition-colors text-[#607562]"
              >
                <Icon name="bell" className="w-[18px] h-[18px]" />
                {count > 0 && <span className="absolute top-0.5 right-0.5 min-w-[15px] h-[15px] bg-red-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5">{count > 9 ? "9+" : count}</span>}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-[340px] bg-white rounded-[14px] shadow-[0_8px_32px_rgba(0,0,0,0.14)] border border-[rgba(96,117,98,0.12)] overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(96,117,98,0.08)]">
                    <p className="text-[13px] font-semibold text-[#333]">Notificaciones</p>
                    {count > 0 && (
                      <button onClick={() => markAllRead.mutate()} className="text-[11px] text-[#607562] hover:underline">Marcar todas leídas</button>
                    )}
                  </div>
                  <div className="max-h-[360px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                    {!notifications || notifications.length === 0 ? (
                      <div className="py-10 text-center">
                        <Icon name="bell" className="w-8 h-8 text-[#93A295] mx-auto mb-2" />
                        <p className="text-[12px] text-[#93A295]">Sin notificaciones</p>
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((n: any) => (
                        <div
                          key={n.id}
                          onClick={() => { if (!n.isRead) markOneRead.mutate({ id: n.id }); if (n.link) { window.location.href = n.link; } setNotifOpen(false); }}
                          className={`flex gap-3 px-4 py-3 border-b border-[rgba(96,117,98,0.07)] cursor-pointer transition-colors ${!n.isRead ? "bg-[#f5f8f5] hover:bg-[#eef3ee]" : "hover:bg-[#F7FAFC]"}`}
                        >
                          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[#607562]" style={{ background: "rgba(96,117,98,0.1)" }}>
                            <Icon name="bell" className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold text-[#333] leading-snug">{n.title}</p>
                            <p className="text-[11px] text-[#666] mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                          </div>
                          {!n.isRead && <div className="w-2 h-2 rounded-full bg-[#607562] flex-shrink-0 mt-2" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Avatar + profile dropdown */}
            <div className="relative ml-1" ref={profileRef}>
              <button
                onClick={() => { setProfileDropOpen((o) => !o); setNotifOpen(false); }}
                className="relative flex-shrink-0"
              >
                <UserAvatar size="sm" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white" />
              </button>
              {profileDropOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-[200px] bg-white rounded-[12px] shadow-[0_8px_32px_rgba(0,0,0,0.14)] border border-[rgba(96,117,98,0.12)] overflow-hidden z-50 py-1">
                  <div className="px-4 py-2.5 border-b border-[rgba(96,117,98,0.08)]">
                    <p className="text-[12px] font-semibold text-[#333] truncate">{user?.name ?? "Usuario"}</p>
                    <p className="text-[10px] text-[#93A295] truncate">{user?.email}</p>
                  </div>
                  <Link href="/perfil">
                    <a className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#f0f4f0] transition-colors cursor-pointer" onClick={() => setProfileDropOpen(false)}>
                      <Icon name="user" className="w-4 h-4 text-[#607562]" />
                      <span className="text-[13px] text-[#333]">Mi perfil</span>
                    </a>
                  </Link>
                  <button onClick={() => { logout(); setProfileDropOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#fff5f5] transition-colors text-left border-t border-[rgba(96,117,98,0.08)]">
                    <Icon name="logout" className="w-4 h-4 text-red-500" />
                    <span className="text-[13px] text-red-500">Cerrar sesión</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex overflow-hidden" style={{ height: "calc(100vh - 58px)" }}>
        {/* SIDEBAR */}
        <aside className="w-[220px] flex-shrink-0 bg-white border-r border-[rgba(96,117,98,0.15)] flex-col hidden md:flex overflow-hidden sticky top-[58px]" style={{ height: "calc(100vh - 58px)" }}>
          {isProfessional && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(96,117,98,0.1)' }}>
              <div style={{ display: 'flex', background: '#eef2ee', borderRadius: 20, padding: 3 }}>
                <button
                  onClick={() => navigate('/dashboard')}
                  style={{ flex: 1, padding: '6px 0', borderRadius: 16, fontSize: 12, fontWeight: 600,
                    background: !isProMode ? '#607562' : 'transparent',
                    color: !isProMode ? '#fff' : '#93a295', border: 'none', cursor: 'pointer' }}>
                  Cliente
                </button>
                <button
                  onClick={() => navigate('/panel-profesional')}
                  style={{ flex: 1, padding: '6px 0', borderRadius: 16, fontSize: 12, fontWeight: 600,
                    background: isProMode ? '#607562' : 'transparent',
                    color: isProMode ? '#fff' : '#93a295', border: 'none', cursor: 'pointer' }}>
                  Profesional
                </button>
              </div>
            </div>
          )}
          <nav className="flex-1 overflow-y-auto p-2.5">
            {isProfessional && isProMode ? (
              /* ── Sidebar profesional — lista vertical con secciones ── */
              <div className="flex flex-col gap-4">
                {PRO_NAV_SECTIONS.map((section) => (
                  <div key={section.section}>
                    <p className="text-[9px] font-semibold text-[#93A295] uppercase tracking-widest px-3 mb-1">{section.section}</p>
                    <div className="flex flex-col gap-0.5">
                      {section.items.map((item) => {
                        const isActive = item.hash ? currentHash === item.hash : location === item.href;
                        return (
                          <a
                            key={item.label}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                              isActive ? "bg-[rgba(96,117,98,0.12)] text-[#3d4e3f]" : "text-[#607562] hover:bg-[#f0f4f0]"
                            }`}
                            onClick={() => {
                              if (item.hash) window.location.hash = item.hash;
                              else window.location.href = item.href;
                            }}
                          >
                            <span className="w-[16px] h-[16px] flex-shrink-0">{ICONS[item.icon]}</span>
                            <span className="text-[13px] font-medium">{item.label}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* ── Sidebar usuario/admin — lista vertical simple ── */
              <div className="flex flex-col gap-0.5">
                {sidebarItems.map((item) => {
                  const isActive = item.href === "/"
                    ? location === "/"
                    : location === item.href || location.startsWith(item.href + "/");
                  const isAdmin = item.icon === "shield" && user?.role === "admin";
                  const rowClass = `flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                    isActive
                      ? "bg-[rgba(96,117,98,0.12)] text-[#3d4e3f]"
                      : isAdmin
                      ? "text-[#B43C3C] hover:bg-[#fff8f7]"
                      : "text-[#607562] hover:bg-[#f0f4f0]"
                  }`;
                  const inner = (
                    <>
                      <span className="w-[16px] h-[16px] flex-shrink-0">{ICONS[item.icon]}</span>
                      <span className="text-[13px] font-medium">{item.label}</span>
                    </>
                  );
                  if (item.href === "/") {
                    return <a key="inicio" href="https://inteira.mx/" className={rowClass}>{inner}</a>;
                  }
                  return (
                    <Link key={item.href} href={item.href}>
                      <a className={rowClass}>{inner}</a>
                    </Link>
                  );
                })}
              </div>
            )}
          </nav>

          {/* Footer fixed at bottom */}
          <div className="mt-auto border-t border-[rgba(96,117,98,0.1)]">
            {/* Changelog button */}
            <button
              onClick={openChangelog}
              className="hover:bg-primary/5 transition-colors relative"
              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", width: "100%", border: "none", background: "transparent", color: "#607562", fontSize: "13px", cursor: "pointer" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-4 h-4 flex-shrink-0"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              <span>Novedades</span>
              <span className="ml-auto text-[10px] font-semibold text-primary/70">v{APP_VERSION}</span>
              {hasUnseenVersion && (
                <span className="absolute top-2 left-2 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
            <button
              onClick={logout}
              className="hover:bg-red-50 hover:text-red-500 transition-colors"
              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", width: "100%", border: "none", background: "transparent", color: "#666", fontSize: "13px", cursor: "pointer" }}
            >
              <Icon name="logout" className="w-4 h-4" />
              Cerrar sesión
            </button>
            <div className="p-2 border-t border-[rgba(96,117,98,0.1)]">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-[9px] bg-[#F7FAFC] border border-[rgba(96,117,98,0.15)] cursor-pointer" onClick={() => navigate("/perfil")}>
                <div className="flex-shrink-0"><UserAvatar size="md" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-[#333333] truncate">{user?.name ?? "Usuario"}</p>
                  <p className="text-[9px] text-[#607562]">{user?.role === "admin" ? "Admin" : user?.role === "professional" ? "Profesional" : "Usuario"}</p>
                </div>
                <span className="text-[9px] text-gray-400 flex-shrink-0">v{APP_VERSION}</span>
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
                {avatarUrl ? (
                  <img src={avatarUrl} alt={user?.name ?? "Avatar"} className="w-14 h-14 rounded-full object-cover border-2 border-[rgba(255,255,255,0.25)]" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-14 h-14 rounded-full flex items-center justify-center font-medium text-white border-2 border-[rgba(255,255,255,0.25)] text-lg" style={{ background: "linear-gradient(135deg,#3d4e3f,#607562)" }}>{initials}</div>
                )}
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

            {/* Changelog + Sign out */}
            <div className="p-3 border-t border-[rgba(96,117,98,0.1)] space-y-1">
              <button
                onClick={() => { openChangelog(); setDrawerOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/5 transition-colors relative"
                style={{ border: "none", background: "transparent", cursor: "pointer" }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(96,117,98,0.1)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#607562" strokeWidth="1.8" strokeLinecap="round" className="w-4 h-4"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </div>
                <span className="text-[13px] font-medium text-[#607562]">Novedades</span>
                <span className="ml-auto text-[11px] font-semibold text-primary/60">v{APP_VERSION}</span>
                {hasUnseenVersion && (
                  <span className="absolute top-3 left-3 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
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

      {/* Changelog modal */}
      <ChangelogModal open={changelogOpen} onClose={() => setChangelogOpen(false)} />

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
