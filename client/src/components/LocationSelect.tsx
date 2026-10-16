import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * País → estado → ciudad, encadenados.
 *
 * El catálogo lo sirve el servidor (server/routers-locations.ts) porque el
 * dataset completo pesa varios MB y no debe entrar al bundle del cliente.
 *
 * Se guardan NOMBRES, no códigos, salvo el país, que se guarda como ISO-2.
 * El código del estado se resuelve internamente para poder pedir sus ciudades,
 * incluso cuando el formulario se carga con un estado ya guardado.
 */
export function LocationSelect({
  country,
  state,
  city,
  onChange,
  required = true,
  disabled = false,
}: {
  country: string;
  state: string;
  city: string;
  onChange: (field: "country" | "state" | "city", value: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  const selectCls =
    "w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed";

  const { data: countries, isLoading: loadingCountries } =
    trpc.location.getCountries.useQuery(undefined, { staleTime: Infinity });

  // Los mercados de la plataforma arriba; el resto sigue disponible debajo.
  const principales = useMemo(() => countries?.filter((c) => c.priority) ?? [], [countries]);
  const resto = useMemo(() => countries?.filter((c) => !c.priority) ?? [], [countries]);

  const { data: states, isLoading: loadingStates } = trpc.location.getStates.useQuery(
    { countryCode: country },
    { enabled: country.length === 2, staleTime: Infinity }
  );

  // El código del estado no se guarda; se deriva del nombre para pedir ciudades.
  const stateCode = useMemo(
    () => states?.find((s) => s.name === state)?.code,
    [states, state]
  );

  const { data: cities, isLoading: loadingCities } = trpc.location.getCities.useQuery(
    { countryCode: country, stateCode, stateName: state || undefined },
    { enabled: country.length === 2 && !!state, staleTime: Infinity }
  );

  // Si el país elegido no tiene estados en el catálogo, se escriben a mano.
  const statesAreFree = !!country && !loadingStates && (states?.length ?? 0) === 0;
  const citiesAreFree = !!state && !loadingCities && (cities?.length ?? 0) === 0;

  // Una ciudad que ya no pertenece al estado elegido deja de ser válida.
  const [touchedState, setTouchedState] = useState(false);
  useEffect(() => {
    if (!touchedState || !city || citiesAreFree || !cities) return;
    if (!cities.some((c) => c.name === city)) onChange("city", "");
  }, [cities, city, citiesAreFree, touchedState, onChange]);

  const req = required ? <span className="text-red-500">*</span> : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* País */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">País donde vives {req}</Label>
          <select
            className={selectCls}
            value={country}
            disabled={disabled || loadingCountries}
            onChange={(e) => {
              onChange("country", e.target.value);
              onChange("state", "");
              onChange("city", "");
              setTouchedState(true);
            }}
          >
            <option value="">
              {loadingCountries ? "Cargando países…" : "Selecciona tu país de residencia"}
            </option>
            {principales.length > 0 && (
              <optgroup label="Países principales">
                {principales.map((c) => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                ))}
              </optgroup>
            )}
            {resto.length > 0 && (
              <optgroup label="Todos los países">
                {resto.map((c) => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Estado / provincia / región */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Estado, provincia o región {req}</Label>
          {statesAreFree ? (
            <Input
              value={state}
              disabled={disabled}
              onChange={(e) => { onChange("state", e.target.value); setTouchedState(true); }}
              placeholder="Escribe tu estado, provincia o región"
            />
          ) : (
            <select
              className={selectCls}
              value={state}
              disabled={disabled || !country || loadingStates}
              onChange={(e) => {
                onChange("state", e.target.value);
                onChange("city", "");
                setTouchedState(true);
              }}
            >
              <option value="">
                {!country
                  ? "Selecciona primero tu país"
                  : loadingStates
                    ? "Cargando…"
                    : "Selecciona tu estado"}
              </option>
              {states?.map((s) => (
                <option key={s.code} value={s.name}>{s.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Ciudad o municipio */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Ciudad o municipio {req}</Label>
        {citiesAreFree ? (
          <Input
            value={city}
            disabled={disabled || !state}
            onChange={(e) => onChange("city", e.target.value)}
            placeholder={state ? "Escribe tu ciudad o municipio" : "Selecciona primero tu estado"}
          />
        ) : (
          <select
            className={selectCls}
            value={city}
            disabled={disabled || !state || loadingCities}
            onChange={(e) => onChange("city", e.target.value)}
          >
            <option value="">
              {!state
                ? "Selecciona primero tu estado"
                : loadingCities
                  ? "Cargando ciudades…"
                  : "Selecciona tu ciudad"}
            </option>
            {cities?.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        )}
        <p className="text-xs text-muted-foreground">
          Las opciones se cargan según el país y el estado que selecciones.
        </p>
      </div>
    </div>
  );
}
