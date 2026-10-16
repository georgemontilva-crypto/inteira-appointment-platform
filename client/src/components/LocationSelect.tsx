import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect, type SearchableOption } from "@/components/SearchableSelect";

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
  const { data: countries, isLoading: loadingCountries } =
    trpc.location.getCountries.useQuery(undefined, { staleTime: Infinity });

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

  // Los mercados de la plataforma arriba; el resto sigue disponible debajo.
  const countryOptions: SearchableOption[] = useMemo(
    () =>
      (countries ?? []).map((c) => ({
        value: c.code,
        label: c.name,
        prefix: c.flag,
        group: c.priority ? "Países principales" : "Todos los países",
      })),
    [countries]
  );

  const stateOptions: SearchableOption[] = useMemo(
    () => (states ?? []).map((s) => ({ value: s.name, label: s.name })),
    [states]
  );

  const cityOptions: SearchableOption[] = useMemo(
    () => (cities ?? []).map((c) => ({ value: c.name, label: c.name })),
    [cities]
  );

  // Si el país elegido no tiene estados en el catálogo, se escriben a mano.
  const statesAreFree = !!country && !loadingStates && stateOptions.length === 0;
  const citiesAreFree = !!state && !loadingCities && cityOptions.length === 0;

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
          <SearchableSelect
            value={country}
            onChange={(v) => {
              onChange("country", v);
              onChange("state", "");
              onChange("city", "");
              setTouchedState(true);
            }}
            options={countryOptions}
            placeholder="Selecciona tu país de residencia"
            searchPlaceholder="Busca tu país…"
            emptyText="No encontramos ese país"
            disabled={disabled}
            loading={loadingCountries}
          />
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
            <SearchableSelect
              value={state}
              onChange={(v) => {
                onChange("state", v);
                onChange("city", "");
                setTouchedState(true);
              }}
              options={stateOptions}
              placeholder={country ? "Selecciona tu estado" : "Selecciona primero tu país"}
              searchPlaceholder="Busca tu estado…"
              emptyText="No encontramos ese estado"
              disabled={disabled || !country}
              loading={loadingStates}
            />
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
          <SearchableSelect
            value={city}
            onChange={(v) => onChange("city", v)}
            options={cityOptions}
            placeholder={state ? "Selecciona tu ciudad" : "Selecciona primero tu estado"}
            searchPlaceholder="Busca tu ciudad…"
            emptyText="No encontramos esa ciudad"
            disabled={disabled || !state}
            loading={loadingCities}
          />
        )}
        <p className="text-xs text-muted-foreground">
          Las opciones se cargan según el país y el estado que selecciones.
        </p>
      </div>
    </div>
  );
}
