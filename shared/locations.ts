// shared/locations.ts
// Catálogo de ubicaciones para el perfil del profesional.
// Los países con lista de estados muestran un segundo selector; el resto
// deja el campo de estado libre.

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
  states?: string[];
}

export const COUNTRIES: CountryOption[] = [
  {
    code: "MX",
    name: "México",
    flag: "🇲🇽",
    states: [
      "Aguascalientes", "Baja California", "Baja California Sur", "Campeche",
      "Chiapas", "Chihuahua", "Ciudad de México", "Coahuila", "Colima",
      "Durango", "Estado de México", "Guanajuato", "Guerrero", "Hidalgo",
      "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca",
      "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa",
      "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán",
      "Zacatecas",
    ],
  },
  {
    code: "CO",
    name: "Colombia",
    flag: "🇨🇴",
    states: [
      "Amazonas", "Antioquia", "Arauca", "Atlántico", "Bogotá D.C.", "Bolívar",
      "Boyacá", "Caldas", "Caquetá", "Casanare", "Cauca", "Cesar", "Chocó",
      "Córdoba", "Cundinamarca", "Guainía", "Guaviare", "Huila", "La Guajira",
      "Magdalena", "Meta", "Nariño", "Norte de Santander", "Putumayo",
      "Quindío", "Risaralda", "San Andrés y Providencia", "Santander", "Sucre",
      "Tolima", "Valle del Cauca", "Vaupés", "Vichada",
    ],
  },
  {
    code: "AR",
    name: "Argentina",
    flag: "🇦🇷",
    states: [
      "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Ciudad Autónoma de Buenos Aires",
      "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa",
      "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta",
      "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero",
      "Tierra del Fuego", "Tucumán",
    ],
  },
  {
    code: "CL",
    name: "Chile",
    flag: "🇨🇱",
    states: [
      "Antofagasta", "Araucanía", "Arica y Parinacota", "Atacama", "Aysén",
      "Biobío", "Coquimbo", "Los Lagos", "Los Ríos", "Magallanes", "Maule",
      "Ñuble", "O'Higgins", "Región Metropolitana", "Tarapacá", "Valparaíso",
    ],
  },
  {
    code: "PE",
    name: "Perú",
    flag: "🇵🇪",
    states: [
      "Amazonas", "Áncash", "Apurímac", "Arequipa", "Ayacucho", "Cajamarca",
      "Callao", "Cusco", "Huancavelica", "Huánuco", "Ica", "Junín",
      "La Libertad", "Lambayeque", "Lima", "Loreto", "Madre de Dios",
      "Moquegua", "Pasco", "Piura", "Puno", "San Martín", "Tacna", "Tumbes",
      "Ucayali",
    ],
  },
  {
    code: "ES",
    name: "España",
    flag: "🇪🇸",
    states: [
      "Andalucía", "Aragón", "Asturias", "Baleares", "Canarias", "Cantabria",
      "Castilla-La Mancha", "Castilla y León", "Cataluña", "Ceuta",
      "Comunidad Valenciana", "Extremadura", "Galicia", "La Rioja", "Madrid",
      "Melilla", "Murcia", "Navarra", "País Vasco",
    ],
  },
  {
    code: "US",
    name: "Estados Unidos",
    flag: "🇺🇸",
    states: [
      "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Carolina del Norte",
      "Carolina del Sur", "Colorado", "Connecticut", "Dakota del Norte",
      "Dakota del Sur", "Delaware", "Florida", "Georgia", "Hawái", "Idaho",
      "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Luisiana", "Maine",
      "Maryland", "Massachusetts", "Michigan", "Minnesota", "Misisipi",
      "Misuri", "Montana", "Nebraska", "Nevada", "Nueva Jersey",
      "Nueva York", "Nuevo Hampshire", "Nuevo México", "Ohio", "Oklahoma",
      "Oregón", "Pensilvania", "Rhode Island", "Tennessee", "Texas", "Utah",
      "Vermont", "Virginia", "Virginia Occidental", "Washington",
      "Washington D.C.", "Wisconsin", "Wyoming",
    ],
  },
  { code: "EC", name: "Ecuador", flag: "🇪🇨" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪" },
  { code: "GT", name: "Guatemala", flag: "🇬🇹" },
  { code: "CR", name: "Costa Rica", flag: "🇨🇷" },
  { code: "PA", name: "Panamá", flag: "🇵🇦" },
  { code: "DO", name: "República Dominicana", flag: "🇩🇴" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾" },
  { code: "PY", name: "Paraguay", flag: "🇵🇾" },
  { code: "BO", name: "Bolivia", flag: "🇧🇴" },
  { code: "HN", name: "Honduras", flag: "🇭🇳" },
  { code: "SV", name: "El Salvador", flag: "🇸🇻" },
  { code: "NI", name: "Nicaragua", flag: "🇳🇮" },
  { code: "PR", name: "Puerto Rico", flag: "🇵🇷" },
  { code: "CU", name: "Cuba", flag: "🇨🇺" },
];

/** País preseleccionado cuando el profesional aún no eligió. */
export const DEFAULT_COUNTRY = "MX";

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code);

export function getCountry(code: string | null | undefined): CountryOption | undefined {
  if (!code) return undefined;
  return COUNTRIES.find((c) => c.code === code);
}

export function getStates(code: string | null | undefined): string[] {
  return getCountry(code)?.states ?? [];
}

/** Texto listo para mostrar: "Jalisco, México" o solo "México". */
export function formatLocation(
  countryCode: string | null | undefined,
  state: string | null | undefined
): string | null {
  const country = getCountry(countryCode);
  if (!country) return state ?? null;
  return state ? `${state}, ${country.name}` : country.name;
}

export function getFlag(countryCode: string | null | undefined): string {
  return getCountry(countryCode)?.flag ?? "";
}
