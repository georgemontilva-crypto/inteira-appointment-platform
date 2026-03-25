import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../_core/hooks/useAuth";
import { trpc } from "../lib/trpc";

const NAV_ITEMS = [
  { label: "Inicio",          icon: "home",     href: "/dashboard" },
  { label: "Mis citas",       icon: "calendar", href: "/citas" },
  { label: "Explorar",        icon: "search",   href: "/especialistas" },
  { label: "Wallet",          icon: "wallet",   href: "/wallet" },
  { label: "Planes",          icon: "star",     href: "/planes" },
  { label: "Notificaciones",  icon: "bell",     href: "/notificaciones", badge: true },
  { label: "Perfil",          icon: "user",     href: "/perfil" },
];

const ICONS: Record<string, JSX.Element> = {
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
  const [location] = useLocation();
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PanelTab>("notifications");

  const openPanel = (tab: PanelTab) => {
    setActiveTab(tab);
    setPanelOpen(true);
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
    enabled: !!user && panelOpen,
  });

  const count = unreadCount?.count ?? 0;
  const initials = user?.name?.charAt(0)?.toUpperCase() ?? "U";

  // Build nav items including role-specific items
  const navItems = [...NAV_ITEMS];
  if (user?.role === "admin") {
    navItems.push({ label: "Admin", icon: "shield", href: "/admin" });
  }
  if (user?.role === "professional") {
    navItems.push({ label: "Mi panel", icon: "shield", href: "/panel-profesional" });
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F7FAFC]">
      {/* TOP BAR */}
      <header className="h-[52px] bg-white border-b border-[rgba(96,117,98,0.15)] flex items-center gap-2 px-4 flex-shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#3d4e3f,#607562)" }}>
            <Icon name="layers" className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-medium text-[#333333] hidden sm:block">Inteira</span>
        </div>

        <div className="flex items-center gap-2 bg-[#F7FAFC] border border-[rgba(96,117,98,0.2)] rounded-full px-3 h-[34px] w-[200px] flex-shrink-0 ml-2">
          <Icon name="search" className="w-3.5 h-3.5 text-[#93A295]" />
          <input className="bg-transparent border-none outline-none text-[13px] text-[#333333] w-full placeholder:text-[#93A295]" placeholder="Buscar especialistas..." />
        </div>

        <nav className="hidden md:flex items-center">
          {["Descubrir", "Explorar", "Especialidades", "Planes"].map((l) => (
            <span key={l} className="px-3 h-[52px] flex items-center text-[13px] font-medium text-[#93A295] hover:text-[#3d4e3f] cursor-pointer border-b-2 border-transparent hover:border-[#607562] transition-colors whitespace-nowrap">{l}</span>
          ))}
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          {/* Bell → notifications tab */}
          <button onClick={() => openPanel("notifications")} className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f0f4f0] transition-colors text-[#607562]">
            <Icon name="bell" className="w-[18px] h-[18px]" />
            {count > 0 && <span className="absolute top-0.5 right-0.5 min-w-[15px] h-[15px] bg-red-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5">{count > 9 ? "9+" : count}</span>}
          </button>
          {/* Wallet → wallet tab */}
          <button onClick={() => openPanel("wallet")} className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f0f4f0] transition-colors text-[#607562]">
            <Icon name="wallet" className="w-[18px] h-[18px]" />
          </button>
          {/* Grid → notifications tab */}
          <button onClick={() => openPanel("notifications")} className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f0f4f0] transition-colors text-[#607562]">
            <Icon name="grid" className="w-[18px] h-[18px]" />
          </button>
          {/* Avatar → profile tab */}
          <button onClick={() => openPanel("profile")} className="ml-1 w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium text-white relative border-2 border-[rgba(96,117,98,0.3)]" style={{ background: "linear-gradient(135deg,#3d4e3f,#607562)" }}>
            {initials}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white" />
          </button>
        </div>
      </header>

      <div className="flex overflow-hidden" style={{ height: "calc(100vh - 52px)" }}>
        {/* SIDEBAR */}
        <aside className="w-[210px] flex-shrink-0 bg-white border-r border-[rgba(96,117,98,0.15)] flex-col hidden md:flex overflow-hidden sticky top-[52px]" style={{ height: "calc(100vh - 52px)" }}>
          <nav className="flex-1 overflow-hidden p-2.5">
            <div className="grid grid-cols-2 gap-1.5" style={{ gridAutoRows: "minmax(60px, auto)" }}>
              {navItems.map((item) => {
                const isActive = location === item.href || location.startsWith(item.href + "/");
                const isAdmin = item.icon === "shield" && user?.role === "admin";
                return (
                  <Link key={item.href} href={item.href}>
                    <a className={`flex flex-col items-start justify-end p-2.5 rounded-[9px] border min-h-[60px] transition-all cursor-pointer relative ${
                      isActive
                        ? "bg-[rgba(96,117,98,0.12)] border-[rgba(96,117,98,0.35)]"
                        : isAdmin
                        ? "bg-[#fff8f7] border-[rgba(180,60,60,0.2)]"
                        : "bg-[#F7FAFC] border-[rgba(96,117,98,0.15)] hover:bg-[#f0f4f0] hover:border-[rgba(96,117,98,0.3)]"
                    }`}>
                      {(item as any).badge && count > 0 && (
                        <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] bg-red-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5">{count > 9 ? "9+" : count}</span>
                      )}
                      <span className={`w-4 h-4 mb-1.5 ${isActive ? "text-[#3d4e3f]" : isAdmin ? "text-[#B43C3C]" : "text-[#93A295]"}`}>
                        {ICONS[item.icon]}
                      </span>
                      <span className={`text-[10px] font-medium leading-tight ${isActive ? "text-[#3d4e3f]" : isAdmin ? "text-[#B43C3C]" : "text-[#607562]"}`}>
                        {item.label}
                      </span>
                    </a>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Footer fixed at bottom */}
          <div className="mt-auto p-2 border-t border-[rgba(96,117,98,0.1)]">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-[9px] bg-[#F7FAFC] border border-[rgba(96,117,98,0.15)] cursor-pointer" onClick={() => openPanel("profile")}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white flex-shrink-0" style={{ background: "linear-gradient(135deg,#3d4e3f,#607562)" }}>{initials}</div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-[#333333] truncate">{user?.name ?? "Usuario"}</p>
                <p className="text-[9px] text-[#607562]">{user?.role === "admin" ? "Admin" : user?.role === "professional" ? "Profesional" : "Usuario"}</p>
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
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>

      {/* RIGHT PANEL */}
      {panelOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setPanelOpen(false)}>
          <div className="absolute inset-0 bg-black/20" />
          <div
            className="absolute top-2 right-2 bottom-2 w-[300px] bg-white border border-[rgba(96,117,98,0.2)] rounded-xl shadow-xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel header: tabs + close */}
            <div className="flex items-center gap-1 px-2 pt-2 pb-0 border-b border-[rgba(96,117,98,0.12)]">
              <button
                onClick={() => setActiveTab("notifications")}
                className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium border-b-2 transition-colors relative ${activeTab === "notifications" ? "border-[#607562] text-[#3d4e3f]" : "border-transparent text-[#93A295] hover:text-[#607562]"}`}
              >
                <Icon name="bell" className="w-3.5 h-3.5" />
                Notificaciones
                {count > 0 && <span className="min-w-[14px] h-[14px] bg-red-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5">{count > 9 ? "9+" : count}</span>}
              </button>
              <button
                onClick={() => setActiveTab("wallet")}
                className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium border-b-2 transition-colors ${activeTab === "wallet" ? "border-[#607562] text-[#3d4e3f]" : "border-transparent text-[#93A295] hover:text-[#607562]"}`}
              >
                <Icon name="wallet" className="w-3.5 h-3.5" />
                Wallet
              </button>
              <button
                onClick={() => setActiveTab("profile")}
                className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium border-b-2 transition-colors ${activeTab === "profile" ? "border-[#607562] text-[#3d4e3f]" : "border-transparent text-[#93A295] hover:text-[#607562]"}`}
              >
                <Icon name="user" className="w-3.5 h-3.5" />
                Perfil
              </button>
              <div className="flex-1" />
              <button onClick={() => setPanelOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#f0f4f0] text-[#93A295] mb-1">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Tab: Notifications */}
            {activeTab === "notifications" && (
              <>
                <div className="flex justify-end px-3 py-2 border-b border-[rgba(96,117,98,0.08)]">
                  {count > 0 && (
                    <button onClick={() => markAllRead.mutate()} className="text-[11px] text-[#607562] hover:underline">
                      Marcar todas como leídas
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(96,117,98,0.2) transparent" }}>
                  {!notifications || notifications.length === 0 ? (
                    <div className="py-10 text-center text-[12px] text-[#93A295]">No hay notificaciones</div>
                  ) : (
                    notifications.map((n: any) => (
                      <div
                        key={n.id}
                        onClick={() => { if (!n.isRead) markOneRead.mutate({ id: n.id }); if (n.link) window.location.href = n.link; }}
                        className={`flex gap-2.5 px-3.5 py-3 border-b border-[rgba(96,117,98,0.08)] cursor-pointer transition-colors ${!n.isRead ? "bg-[#f5f8f5] hover:bg-[#eef3ee]" : "hover:bg-[#F7FAFC]"}`}
                      >
                        <div className="w-7 h-7 rounded-full bg-[rgba(96,117,98,0.1)] flex items-center justify-center flex-shrink-0 mt-0.5 text-[#607562]">
                          <Icon name="bell" className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[12px] font-medium text-[#333333] leading-snug">{n.title}</p>
                            <span className="text-[9px] text-[#93A295] flex-shrink-0">{new Date(n.createdAt).toLocaleDateString("es", { day: "numeric", month: "short" })}</span>
                          </div>
                          <p className="text-[11px] text-[#666666] mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                          {n.link && <p className="text-[10px] text-[#607562] mt-1">Ver detalles →</p>}
                        </div>
                        {!n.isRead && <div className="w-1.5 h-1.5 rounded-full bg-[#607562] flex-shrink-0 mt-1.5" />}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Tab: Wallet */}
            {activeTab === "wallet" && (
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(96,117,98,0.2) transparent" }}>
                {/* Balance card */}
                <div className="rounded-xl p-4 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg,#3d4e3f,#607562)" }}>
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none" style={{ background: "rgba(255,255,255,0.07)", transform: "translate(30%,-30%)" }} />
                  <p className="text-[10px] text-white/60 uppercase tracking-widest mb-1">Balance disponible</p>
                  <p className="text-2xl font-semibold text-white">
                    {walletData?.balance ?? 0}
                    <span className="text-sm font-normal text-white/60 ml-1.5">créditos</span>
                  </p>
                  <p className="text-[10px] text-white/50 mt-2">Inteira Wallet · {user?.email}</p>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/wallet">
                    <a className="flex flex-col items-center gap-1.5 p-3 rounded-[9px] bg-[#F7FAFC] border border-[rgba(96,117,98,0.15)] hover:bg-[#f0f4f0] transition-colors cursor-pointer text-center" onClick={() => setPanelOpen(false)}>
                      <Icon name="wallet" className="w-4 h-4 text-[#607562]" />
                      <span className="text-[10px] font-medium text-[#607562]">Ver wallet</span>
                    </a>
                  </Link>
                  <Link href="/planes">
                    <a className="flex flex-col items-center gap-1.5 p-3 rounded-[9px] bg-[#F7FAFC] border border-[rgba(96,117,98,0.15)] hover:bg-[#f0f4f0] transition-colors cursor-pointer text-center" onClick={() => setPanelOpen(false)}>
                      <Icon name="star" className="w-4 h-4 text-[#607562]" />
                      <span className="text-[10px] font-medium text-[#607562]">Ver planes</span>
                    </a>
                  </Link>
                </div>

                {/* Recent transactions */}
                <div>
                  <p className="text-[9px] text-[#93A295] uppercase tracking-widest font-medium mb-2">Movimientos recientes</p>
                  {!walletData?.transactions || walletData.transactions.length === 0 ? (
                    <p className="text-[11px] text-[#93A295] text-center py-4">Sin movimientos recientes</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {walletData.transactions.slice(0, 5).map((tx: any) => {
                        const isPositive = tx.delta > 0;
                        const reasonLabel: Record<string, string> = {
                          purchase: "Compra",
                          consume: "Consumo",
                          expire: "Vencimiento",
                          refund: "Reembolso",
                        };
                        return (
                          <div key={tx.id} className="flex items-center justify-between px-3 py-2 rounded-[8px] bg-[#F7FAFC] border border-[rgba(96,117,98,0.1)]">
                            <div className="min-w-0">
                              <p className="text-[11px] font-medium text-[#333333] truncate">{tx.description || reasonLabel[tx.reason] || tx.reason}</p>
                              <p className="text-[9px] text-[#93A295]">{new Date(tx.createdAt).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}</p>
                            </div>
                            <span className={`text-[12px] font-semibold flex-shrink-0 ml-2 ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
                              {isPositive ? "+" : ""}{tx.delta}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Profile */}
            {activeTab === "profile" && (
              <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(96,117,98,0.2) transparent" }}>
                {/* Avatar + info */}
                <div className="p-5 text-center bg-[#F7FAFC] border-b border-[rgba(96,117,98,0.1)]">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold text-white mx-auto mb-3 border-2 border-[rgba(96,117,98,0.25)] relative" style={{ background: "linear-gradient(135deg,#3d4e3f,#607562)" }}>
                    {initials}
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />
                  </div>
                  <p className="text-sm font-semibold text-[#333333]">{user?.name ?? "Usuario"}</p>
                  <p className="text-[11px] text-[#93A295] mt-0.5">{user?.email}</p>
                  <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[rgba(96,117,98,0.1)] text-[#3d4e3f] border border-[rgba(96,117,98,0.25)]">
                    {user?.role === "admin" ? "Admin" : user?.role === "professional" ? "Profesional" : "Usuario"}
                  </span>
                </div>

                {/* Quick links */}
                <div className="p-3 flex flex-col gap-1">
                  <Link href="/perfil">
                    <a className="flex items-center gap-3 px-3 py-2.5 rounded-[9px] hover:bg-[#f0f4f0] transition-colors cursor-pointer" onClick={() => setPanelOpen(false)}>
                      <Icon name="user" className="w-4 h-4 text-[#607562]" />
                      <span className="text-[12px] font-medium text-[#333333]">Mi perfil</span>
                    </a>
                  </Link>
                  <Link href="/suscripcion">
                    <a className="flex items-center gap-3 px-3 py-2.5 rounded-[9px] hover:bg-[#f0f4f0] transition-colors cursor-pointer" onClick={() => setPanelOpen(false)}>
                      <Icon name="star" className="w-4 h-4 text-[#607562]" />
                      <span className="text-[12px] font-medium text-[#333333]">Mi suscripción</span>
                    </a>
                  </Link>
                  <Link href="/notificaciones">
                    <a className="flex items-center gap-3 px-3 py-2.5 rounded-[9px] hover:bg-[#f0f4f0] transition-colors cursor-pointer" onClick={() => setPanelOpen(false)}>
                      <Icon name="bell" className="w-4 h-4 text-[#607562]" />
                      <span className="text-[12px] font-medium text-[#333333]">Notificaciones</span>
                      {count > 0 && <span className="ml-auto min-w-[18px] h-[18px] bg-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">{count}</span>}
                    </a>
                  </Link>
                  {user?.role === "admin" && (
                    <Link href="/admin">
                      <a className="flex items-center gap-3 px-3 py-2.5 rounded-[9px] hover:bg-[#fff0ee] transition-colors cursor-pointer" onClick={() => setPanelOpen(false)}>
                        <Icon name="shield" className="w-4 h-4 text-red-500" />
                        <span className="text-[12px] font-medium text-red-600">Panel Admin</span>
                      </a>
                    </Link>
                  )}
                  {user?.role === "professional" && (
                    <Link href="/panel-profesional">
                      <a className="flex items-center gap-3 px-3 py-2.5 rounded-[9px] hover:bg-[#f0f4f0] transition-colors cursor-pointer" onClick={() => setPanelOpen(false)}>
                        <Icon name="shield" className="w-4 h-4 text-[#607562]" />
                        <span className="text-[12px] font-medium text-[#333333]">Mi panel profesional</span>
                      </a>
                    </Link>
                  )}
                </div>

                {/* Sign out */}
                <div className="p-3 border-t border-[rgba(96,117,98,0.1)] mt-auto">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[9px] hover:bg-[#fff0ee] transition-colors text-left"
                  >
                    <Icon name="logout" className="w-4 h-4 text-red-500" />
                    <span className="text-[12px] font-medium text-red-600">Cerrar sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
