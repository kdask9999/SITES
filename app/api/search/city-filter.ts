export type GoogleAddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

type CityScopedPlace = {
  formattedAddress?: string;
  addressComponents?: GoogleAddressComponent[];
};

export type CityTarget = {
  cityName: string;
  stateCode: string;
};

const BRAZIL_STATE_CODES = new Set([
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
]);

const BRAZIL_STATE_NAMES: Record<string, string> = {
  acre: "AC",
  alagoas: "AL",
  amapa: "AP",
  amazonas: "AM",
  bahia: "BA",
  ceara: "CE",
  "distrito federal": "DF",
  "espirito santo": "ES",
  goias: "GO",
  maranhao: "MA",
  "mato grosso": "MT",
  "mato grosso do sul": "MS",
  "minas gerais": "MG",
  para: "PA",
  paraiba: "PB",
  parana: "PR",
  pernambuco: "PE",
  piaui: "PI",
  "rio de janeiro": "RJ",
  "rio grande do norte": "RN",
  "rio grande do sul": "RS",
  rondonia: "RO",
  roraima: "RR",
  "santa catarina": "SC",
  "sao paulo": "SP",
  sergipe: "SE",
  tocantins: "TO",
};

const CITY_COMPONENT_TYPES = new Set([
  "locality",
  "postal_town",
  "administrative_area_level_2",
]);

function normalizeLocationText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\b(?:brasil|brazil)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function stateCodeFromValue(value: string) {
  const normalized = normalizeLocationText(value);
  if (/^[a-z]{2}$/.test(normalized)) {
    const code = normalized.toUpperCase();
    return BRAZIL_STATE_CODES.has(code) ? code : "";
  }
  return BRAZIL_STATE_NAMES[normalized] || "";
}

export function parseCityTarget(value: string): CityTarget {
  const raw = value.trim();
  const separated = raw.match(/^(.*?)(?:\s*[,/]\s*|\s*-\s*)([^,/-]+)$/);
  if (separated) {
    const stateCode = stateCodeFromValue(separated[2] || "");
    const cityName = normalizeLocationText(separated[1] || "");
    if (stateCode && cityName) return { cityName, stateCode };
  }

  const trailingCode = raw.match(/^(.*?)\s+([A-Za-z]{2})$/);
  if (trailingCode) {
    const stateCode = stateCodeFromValue(trailingCode[2] || "");
    const cityName = normalizeLocationText(trailingCode[1] || "");
    if (stateCode && cityName) return { cityName, stateCode };
  }

  const normalized = normalizeLocationText(raw);
  const stateNames = Object.keys(BRAZIL_STATE_NAMES).sort((a, b) => b.length - a.length);
  for (const stateName of stateNames) {
    if (!normalized.endsWith(` ${stateName}`)) continue;
    const cityName = normalized.slice(0, -(stateName.length + 1)).trim();
    if (cityName) return { cityName, stateCode: BRAZIL_STATE_NAMES[stateName] || "" };
  }

  return { cityName: normalized, stateCode: "" };
}

function componentTexts(component: GoogleAddressComponent) {
  return [component.longText, component.shortText]
    .filter((value): value is string => Boolean(value?.trim()))
    .map(normalizeLocationText);
}

function addressSegments(address: string) {
  return address
    .split(",")
    .flatMap((segment) => [segment, ...segment.split(/\s+-\s+/)])
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function isPlaceInRequestedCity(place: CityScopedPlace, city: string) {
  const target = parseCityTarget(city);
  if (!target.cityName) return false;

  const components = place.addressComponents || [];
  const cityComponents = components.filter((component) =>
    (component.types || []).some((type) => CITY_COMPONENT_TYPES.has(type)),
  );
  const structuredCityNames = cityComponents.flatMap(componentTexts);
  const segments = addressSegments(place.formattedAddress || "");

  const cityMatches = structuredCityNames.length
    ? structuredCityNames.includes(target.cityName)
    : segments.some((segment) => parseCityTarget(segment).cityName === target.cityName);
  if (!cityMatches) return false;

  if (!target.stateCode) return true;

  const stateCodes = new Set<string>();
  for (const component of components) {
    if (!(component.types || []).includes("administrative_area_level_1")) continue;
    for (const value of [component.longText, component.shortText]) {
      const code = stateCodeFromValue(value || "");
      if (code) stateCodes.add(code);
    }
  }
  for (const segment of segments) {
    const directCode = stateCodeFromValue(segment);
    const parsedCode = parseCityTarget(segment).stateCode;
    if (directCode) stateCodes.add(directCode);
    if (parsedCode) stateCodes.add(parsedCode);
  }

  return stateCodes.has(target.stateCode);
}
