import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import DashboardLayout from "../components/DashboardLayout";
import { toast } from "sonner";
import {
  User, Phone, Save, Shield, Wallet,
  Calendar, Star, Trash2, Briefcase, Camera,
} from "lucide-react";

export default function UserProfile() {
  const { isAuthenticated, loading, refresh } = useAuth();
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading: loadingProfile } = trpc.user.getProfile.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: subscription } = trpc.user.getSubscription.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: wallet } = trpc.user.getWallet.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: appointments } = trpc.user.getAppointments.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setPhone(profile.phone ?? "");
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  const deleteAccountMutation = trpc.user.deleteAccount.useMutation({
    onSuccess: () => { window.location.href = "/"; },
    onError: (err) => toast.error(err.message ?? "Error al eliminar la cuenta"),
  });

  const updateMutation = trpc.user.updateProfile.useMutation({
    onSuccess: async () => {
      toast.success("Perfil actualizado correctamente");
      await utils.user.getProfile.invalidate();
      await utils.auth.me.invalidate();
      refresh();
      setIsDirty(false);
    },
    onError: (err) => toast.error("Error al actualizar el perfil: " + err.message),
  });

  const handleSave = () => {
    updateMutation.mutate({ name, phone, bio });
  };

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/upload/professional-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ base64, mimeType: file.type, fileName: file.name }),
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      await updateMutation.mutateAsync({ profileImage: url });
      await utils.user.getProfile.invalidate();
      await utils.auth.me.invalidate();
      refresh();
      toast.success("Foto actualizada");
    } catch {
      toast.error("Error al subir la foto");
    } finally {
      setImgUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const completedAppointments = appointments?.filter((a) => a.status === "completed").length ?? 0;
  const upcomingAppointments = appointments?.filter((a) => a.status === "scheduled").length ?? 0;
  const profileImage = (profile as any)?.profileImage ?? null;
  const initials = (name || profile?.name)?.charAt(0)?.toUpperCase() ?? "U";

  if (loading || loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#5B6A57] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl p-8 text-center space-y-4 border border-gray-100">
          <User className="w-12 h-12 text-[#5B6A57] mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900">Inicia sesión para ver tu perfil</h2>
          <a href={getLoginUrl()}>
            <button className="w-full bg-[#5B6A57] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#4a5847] transition-colors">
              Iniciar sesión
            </button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto w-full px-4 md:px-6 py-6 space-y-5">

        {/* ── Header card ── */}
        <div className="bg-gray-50 rounded-2xl p-5">
          <div className="flex items-center gap-4">
            {/* Avatar with photo upload */}
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-full overflow-hidden">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={profile?.name ?? "Avatar"}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-white text-2xl font-semibold"
                    style={{ background: "linear-gradient(135deg,#3d4e3f,#607562)" }}
                  >
                    {initials}
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={imgUploading}
                className="absolute bottom-0 right-0 w-6 h-6 bg-[#5B6A57] rounded-full flex items-center justify-center border-2 border-white disabled:opacity-60 hover:bg-[#4a5847] transition-colors"
              >
                {imgUploading ? (
                  <div className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-3 h-3 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            {/* Name + email + badge */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-semibold text-gray-900 truncate">
                  {profile?.name ?? "Mi perfil"}
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#5B6A57]/10 text-[#3d4e3f]">
                  Cuenta verificada
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5 truncate">{profile?.email}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {profile?.role === "admin" ? "Administrador" : profile?.role === "professional" ? "Profesional" : "Usuario"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="grid lg:grid-cols-3 gap-5">

          {/* ── Left column ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Personal info */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-[#5B6A57]" />
                Información personal
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {/* Nombre */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nombre completo</label>
                  <input
                    value={name}
                    onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
                    placeholder="Tu nombre completo"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#5B6A57]/20 focus:border-[#5B6A57]/50 transition-all bg-white"
                  />
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Correo electrónico</label>
                  <input
                    value={profile?.email ?? ""}
                    disabled
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                  />
                </div>

                {/* Teléfono */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    <input
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); setIsDirty(true); }}
                      placeholder="+52 55 0000 0000"
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#5B6A57]/20 focus:border-[#5B6A57]/50 transition-all bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="mb-5">
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Sobre mí (opcional)</label>
                <textarea
                  value={bio}
                  onChange={(e) => { setBio(e.target.value); setIsDirty(true); }}
                  placeholder="Cuéntanos un poco sobre ti..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#5B6A57]/20 focus:border-[#5B6A57]/50 transition-all resize-none bg-white"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2">
                {isDirty && (
                  <button
                    onClick={() => {
                      setName(profile?.name ?? "");
                      setPhone(profile?.phone ?? "");
                      setBio(profile?.bio ?? "");
                      setIsDirty(false);
                    }}
                    className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={!isDirty || updateMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-[#5B6A57] hover:bg-[#4a5847] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {updateMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Guardar cambios
                </button>
              </div>
            </div>

            {/* Account info (read-only) */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#5B6A57]" />
                Información de cuenta
              </h2>
              <div className="space-y-0">
                <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                  <span className="text-xs text-gray-500">Correo electrónico</span>
                  <span className="text-sm font-medium text-gray-800">{profile?.email}</span>
                </div>
                <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                  <span className="text-xs text-gray-500">Rol</span>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#5B6A57]/10 text-[#3d4e3f] capitalize">
                    {profile?.role ?? "usuario"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-xs text-gray-500">Miembro desde</span>
                  <span className="text-sm font-medium text-gray-800">
                    {profile?.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString("es-MX", { year: "numeric", month: "long" })
                      : "—"}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                El correo está vinculado a tu cuenta y no puede modificarse aquí.
              </p>
            </div>
          </div>

          {/* ── Right column: stats ── */}
          <div className="space-y-4">

            {/* Wallet */}
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-[#5B6A57]" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-500">Saldo disponible</p>
                  <p className="text-lg font-bold text-[#3d4e3f]">
                    {(wallet?.balance ?? 0).toLocaleString("es-MX")}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Equivale a ${(wallet?.balance ?? 0).toLocaleString("es-MX")} MXN
              </p>
              <Link href="/wallet">
                <a className="block w-full text-center py-2 rounded-xl border border-[#5B6A57]/20 text-[#5B6A57] text-xs font-medium hover:bg-[#5B6A57]/5 transition-colors">
                  Ver mi wallet
                </a>
              </Link>
            </div>

            {/* Subscription */}
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
                  <Star className="w-4 h-4 text-[#5B6A57]" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-500">Plan activo</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {(subscription as any)?.planName ?? "Sin plan"}
                  </p>
                </div>
              </div>
              <Link href="/suscripcion">
                <a className="block w-full text-center py-2 rounded-xl border border-[#5B6A57]/20 text-[#5B6A57] text-xs font-medium hover:bg-[#5B6A57]/5 transition-colors">
                  Gestionar suscripción
                </a>
              </Link>
            </div>

            {/* Activity */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actividad</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#5B6A57]" />
                  <span className="text-xs text-gray-600">Próximas citas</span>
                </div>
                <span className="text-sm font-bold text-[#3d4e3f]">{upcomingAppointments}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-[#5B6A57]" />
                  <span className="text-xs text-gray-600">Consultas completadas</span>
                </div>
                <span className="text-sm font-bold text-gray-700">{completedAppointments}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── ¿Quieres ser profesional? ── */}
        {profile?.role === "user" && (
          <div className="bg-[#5B6A57]/5 border border-[#5B6A57]/15 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#5B6A57]/10 flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-4 h-4 text-[#5B6A57]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">¿Quieres ser profesional?</p>
                <p className="text-xs text-gray-500">Ofrece consultas y gestiona tus citas desde tu propio panel.</p>
              </div>
            </div>
            <Link href="/registro-profesional">
              <a className="px-4 py-2 rounded-xl bg-[#5B6A57] text-white text-sm font-medium hover:bg-[#4a5847] transition-colors whitespace-nowrap">
                Registrarme como profesional
              </a>
            </Link>
          </div>
        )}

        {/* ── Danger zone ── */}
        <div className="bg-white border border-red-100 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Trash2 className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-semibold text-red-600">Zona de peligro</h2>
          </div>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-gray-500">
              Eliminar tu cuenta es permanente. Perderás todos tus datos, historial y créditos.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm hover:bg-red-50 transition-colors whitespace-nowrap"
            >
              Dar de baja mi cuenta
            </button>
          </div>
        </div>

      </div>

      {/* ── Modal confirmación baja ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-semibold text-red-600">Confirmar eliminación</h3>
            </div>
            <p className="text-sm text-gray-500">
              Esta acción es <strong className="text-gray-700">irreversible</strong>. Se eliminarán tu cuenta, historial y créditos. ¿Estás seguro?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={deleteAccountMutation.isPending}
                onClick={() => deleteAccountMutation.mutate()}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {deleteAccountMutation.isPending ? "Eliminando…" : "Sí, eliminar mi cuenta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
