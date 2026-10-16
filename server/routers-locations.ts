// server/routers-locations.ts
// Catálogo de países, estados y ciudades.
//
// El dataset completo pesa varios MB, así que vive SOLO en el servidor y se
// sirve por partes. Importarlo en el cliente dispararía el tamaño del bundle.

import { z } from "zod";
import { Country, State, City } from "country-state-city";
import { publicProcedure, router } from "./_core/trpc";

/** Nombres de país en español, con respaldo al nombre en inglés del dataset. */
const regionNames = (() => {
  try {
    return new Intl.DisplayNames(["es"], { type: "region" });
  } catch {
    return null;
  }
})();

function countryName(isoCode: string, fallback: string): string {
  try {
    return regionNames?.of(isoCode) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Bandera a partir del código ISO-2, sin tabla de emojis. */
function flagOf(isoCode: string): string {
  if (!/^[A-Za-z]{2}$/.test(isoCode)) return "";
  return isoCode
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(c.charCodeAt(0) + 127397));
}

const collator = new Intl.Collator("es");

/** Se arma una sola vez: 250 países ordenados alfabéticamente en español. */
const COUNTRIES = Country.getAllCountries()
  .map((c) => ({
    code: c.isoCode,
    name: countryName(c.isoCode, c.name),
    flag: flagOf(c.isoCode),
  }))
  .sort((a, b) => collator.compare(a.name, b.name));

export const locationRouter = router({
  getCountries: publicProcedure.query(() => COUNTRIES),

  /**
   * Estados, provincias o regiones de un país.
   * Devuelve el código además del nombre porque las ciudades se consultan
   * por código, pero lo que se guarda y se muestra es el nombre.
   */
  getStates: publicProcedure
    .input(z.object({ countryCode: z.string().length(2) }))
    .query(({ input }) => {
      const code = input.countryCode.toUpperCase();
      return State.getStatesOfCountry(code)
        .map((s) => ({ code: s.isoCode, name: s.name }))
        .sort((a, b) => collator.compare(a.name, b.name));
    }),

  /**
   * Ciudades de un estado. Acepta el código del estado o su nombre, para que
   * el perfil pueda recargar las ciudades a partir de lo que ya tiene guardado.
   */
  getCities: publicProcedure
    .input(
      z.object({
        countryCode: z.string().length(2),
        stateCode: z.string().max(10).optional(),
        stateName: z.string().max(120).optional(),
      })
    )
    .query(({ input }) => {
      const country = input.countryCode.toUpperCase();

      let stateCode = input.stateCode;
      if (!stateCode && input.stateName) {
        const match = State.getStatesOfCountry(country).find(
          (s) => s.name.toLowerCase() === input.stateName!.toLowerCase()
        );
        stateCode = match?.isoCode;
      }
      if (!stateCode) return [];

      const seen = new Set<string>();
      return City.getCitiesOfState(country, stateCode)
        .map((c) => c.name)
        // El dataset trae duplicados en algunos estados
        .filter((n) => (seen.has(n) ? false : (seen.add(n), true)))
        .sort((a, b) => collator.compare(a, b))
        .map((name) => ({ name }));
    }),
});
