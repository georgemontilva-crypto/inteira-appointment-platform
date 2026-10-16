// shared/locations.ts
// Helpers de visualización de ubicaciones.
//
// El catálogo completo (250 países, estados y ciudades) vive en el servidor y
// se consulta por tRPC — ver server/routers-locations.ts. Aquí solo queda lo
// necesario para MOSTRAR una ubicación ya guardada, sin cargar ningún dataset:
// el nombre del país sale de Intl y la bandera se calcula desde el código ISO.

/** País preseleccionado cuando el profesional aún no eligió. */
export const DEFAULT_COUNTRY = "MX";

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(["es"], { type: "region" });
  } catch {
    return null;
  }
})();

/** "MX" → "México". Devuelve el código tal cual si no se puede resolver. */
export function getCountryName(code: string | null | undefined): string | null {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return null;
  try {
    return regionNames?.of(code.toUpperCase()) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

/** "MX" → "🇲🇽". Se deriva del código ISO, sin tabla de emojis. */
export function getFlag(code: string | null | undefined): string {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return "";
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(c.charCodeAt(0) + 127397));
}

/**
 * Texto listo para mostrar, de lo más específico a lo más general:
 * "Guadalajara, Jalisco, México" · "Jalisco, México" · "México".
 */
export function formatLocation(
  countryCode: string | null | undefined,
  state: string | null | undefined,
  city?: string | null | undefined
): string | null {
  const parts = [city, state, getCountryName(countryCode)].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}
