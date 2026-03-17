export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Genera la URL de la página de login.
 * Redirige a /login que muestra el botón de Google OAuth.
 */
export const getLoginUrl = (returnTo?: string) => {
  if (typeof window === "undefined") return "/login";
  const target = returnTo ?? window.location.pathname;
  // Solo redirigir a rutas internas seguras
  const safeReturn = target.startsWith("/") && target !== "/login" ? target : "/dashboard";
  if (safeReturn === "/dashboard") return "/login";
  return `/login?returnTo=${encodeURIComponent(safeReturn)}`;
};
