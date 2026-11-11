export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Genera la URL de la página de login.
 * Redirige a /login que muestra el botón de Google OAuth.
 */
export const getLoginUrl = (returnTo?: string) => {
  if (typeof window === "undefined") return "/login";
  // Se conserva el hash: varios correos apuntan a secciones como
  // /panel-profesional#ganancias, y sin el hash la persona cae en el panel
  // general y parece que el link del correo no funcionó.
  const target = returnTo ?? window.location.pathname + window.location.hash;
  // Solo redirigir a rutas internas seguras
  const safeReturn =
    target.startsWith("/") && !target.startsWith("/login") ? target : "/dashboard";
  if (safeReturn === "/dashboard") return "/login";
  return `/login?returnTo=${encodeURIComponent(safeReturn)}`;
};
