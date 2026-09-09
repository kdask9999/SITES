import type { Lead, PhoneType, WhatsAppStatus } from "../../types";
import { recordApiUsage } from "../../../db/api-usage";
import {
  isPlaceInRequestedCity,
  type GoogleAddressComponent,
} from "./city-filter";

export const runtime = "edge";

type SearchPayload = {
  activity?: unknown;
  city?: unknown;
  radius?: unknown;
  limit?: unknown;
};

type GoogleText = { text?: string };

type GooglePlace = {
  id?: string;
  displayName?: GoogleText;
  primaryTypeDisplayName?: GoogleText;
  formattedAddress?: string;
  addressComponents?: GoogleAddressComponent[];
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  googleMapsUri?: string;
  location?: { latitude?: number; longitude?: number };
  businessStatus?: string;
};

type GoogleSearchResponse = {
  places?: GooglePlace[];
  nextPageToken?: string;
  error?: { message?: string; status?: string };
};

const SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const MAX_RESULTS_PER_SEARCH = 60;
const SEARCH_COUNT = 4;
const MAX_UNIQUE_RESULTS = MAX_RESULTS_PER_SEARCH * SEARCH_COUNT;

type Coordinates = {
  latitude: number;
  longitude: number;
};

type SearchRound = {
  label: string;
  body: Record<string, unknown>;
};

type UsageCounter = {
  textSearchProRequests: number;
  textSearchEnterpriseRequests: number;
};

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function normalizeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeBrazilPhone(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  if (!digits.startsWith("55") && (digits.length === 10 || digits.length === 11)) {
    digits = `55${digits}`;
  }
  return digits.length >= 12 && digits.length <= 13 ? `+${digits}` : "";
}

function getPhoneType(phoneE164: string): PhoneType {
  const digits = phoneE164.replace(/\D/g, "");
  const national = digits.startsWith("55") ? digits.slice(2) : digits;
  if (national.length === 11 && national[2] === "9") return "mobile";
  if (national.length === 10) return "landline";
  return "unknown";
}

function getInitialWhatsAppStatus(phoneType: PhoneType): WhatsAppStatus {
  if (phoneType === "mobile") return "pending";
  if (phoneType === "landline") return "landline";
  return "unavailable";
}

async function requestPlaces(
  apiKey: string,
  body: Record<string, unknown>,
  fieldMask: string,
  usage?: { counter: UsageCounter; sku: "pro" | "enterprise" },
) {
  if (usage?.sku === "pro") usage.counter.textSearchProRequests += 1;
  if (usage?.sku === "enterprise") usage.counter.textSearchEnterpriseRequests += 1;

  const response = await fetch(SEARCH_URL, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, max-age=0",
      Pragma: "no-cache",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });

  const payload = (await response.json()) as GoogleSearchResponse;
  if (!response.ok) {
    const message = payload.error?.message || "A busca no Google Places falhou.";
    throw new Error(message);
  }
  return payload;
}

async function findCityCenter(apiKey: string, city: string, counter: UsageCounter) {
  const payload = await requestPlaces(
    apiKey,
    {
      textQuery: city,
      maxResultCount: 1,
      languageCode: "pt-BR",
      regionCode: "BR",
    },
    "places.id,places.displayName,places.location",
    { counter, sku: "pro" },
  );
  const location = payload.places?.[0]?.location;
  if (typeof location?.latitude !== "number" || typeof location.longitude !== "number") {
    return null;
  }
  return { latitude: location.latitude, longitude: location.longitude };
}

function placeKey(place: GooglePlace) {
  if (place.id) return `place:${place.id}`;

  const normalizedName = place.displayName?.text?.trim().toLocaleLowerCase("pt-BR") || "";
  const normalizedAddress = place.formattedAddress?.trim().toLocaleLowerCase("pt-BR") || "";
  const normalizedPhone = (place.internationalPhoneNumber || place.nationalPhoneNumber || "").replace(
    /\D/g,
    "",
  );
  return `fallback:${normalizedName}|${normalizedAddress}|${normalizedPhone}`;
}

function clampLatitude(latitude: number) {
  return Math.max(-90, Math.min(90, latitude));
}

function clampLongitude(longitude: number) {
  return Math.max(-180, Math.min(180, longitude));
}

function buildSearchRounds(
  activity: string,
  city: string,
  center: Coordinates | null,
  radiusKm: number,
): SearchRound[] {
  const commonBody: Record<string, unknown> = {
    languageCode: "pt-BR",
    regionCode: "BR",
    includePureServiceAreaBusinesses: false,
    rankPreference: "RELEVANCE",
  };

  if (!center) {
    const queryVariants = [
      `${activity} em ${city}`,
      `${activity} na cidade de ${city}`,
      `${activity} perto do centro de ${city}`,
      `${activity} na região de ${city}`,
    ];
    return queryVariants.map((textQuery, index) => ({
      label: index === 0 ? "Busca principal" : `Busca complementar ${index}`,
      body: { ...commonBody, textQuery },
    }));
  }

  const latitudeDelta = radiusKm / 111.32;
  const longitudeScale = Math.max(0.15, Math.cos((center.latitude * Math.PI) / 180));
  const longitudeDelta = radiusKm / (111.32 * longitudeScale);
  const north = clampLatitude(center.latitude + latitudeDelta);
  const south = clampLatitude(center.latitude - latitudeDelta);
  const east = clampLongitude(center.longitude + longitudeDelta);
  const west = clampLongitude(center.longitude - longitudeDelta);

  const rectangle = (
    lowLatitude: number,
    lowLongitude: number,
    highLatitude: number,
    highLongitude: number,
  ) => ({
    rectangle: {
      low: { latitude: lowLatitude, longitude: lowLongitude },
      high: { latitude: highLatitude, longitude: highLongitude },
    },
  });

  return [
    {
      label: "Busca principal",
      body: {
        ...commonBody,
        textQuery: `${activity} em ${city}`,
        locationBias: {
          circle: { center, radius: radiusKm * 1000 },
        },
      },
    },
    {
      label: "Busca complementar 1",
      body: {
        ...commonBody,
        textQuery: `${activity} em ${city}`,
        locationRestriction: rectangle(center.latitude, west, north, east),
      },
    },
    {
      label: "Busca complementar 2",
      body: {
        ...commonBody,
        textQuery: `${activity} em ${city}`,
        locationRestriction: rectangle(south, west, center.latitude, center.longitude),
      },
    },
    {
      label: "Busca complementar 3",
      body: {
        ...commonBody,
        textQuery: `${activity} em ${city}`,
        locationRestriction: rectangle(south, center.longitude, center.latitude, east),
      },
    },
  ];
}

async function searchRound(
  apiKey: string,
  body: Record<string, unknown>,
  fieldMask: string,
  limit: number,
  counter: UsageCounter,
) {
  const places: GooglePlace[] = [];
  const usedPageTokens = new Set<string>();
  let pageToken = "";

  do {
    const pageSize = Math.min(20, limit - places.length);
    const pageBody: Record<string, unknown> = { ...body, pageSize };
    if (pageToken) {
      if (usedPageTokens.has(pageToken)) break;
      usedPageTokens.add(pageToken);
      pageBody.pageToken = pageToken;
    }

    const page = await requestPlaces(apiKey, pageBody, fieldMask, {
      counter,
      sku: "enterprise",
    });
    places.push(...(page.places || []));
    pageToken = page.nextPageToken || "";
  } while (pageToken && places.length < limit);

  return places.slice(0, limit);
}

function mapPlace(place: GooglePlace, fallbackCity: string, searchSegment: string): Lead {
  const phone = place.nationalPhoneNumber || place.internationalPhoneNumber || "";
  const phoneE164 = normalizeBrazilPhone(place.internationalPhoneNumber || phone);
  const phoneType = getPhoneType(phoneE164);
  return {
    id: place.id || crypto.randomUUID(),
    name: place.displayName?.text || "Empresa sem nome",
    category: place.primaryTypeDisplayName?.text || "Empresa",
    searchSegment,
    phone,
    phoneE164,
    phoneType,
    whatsappStatus: getInitialWhatsAppStatus(phoneType),
    email: "",
    website: place.websiteUri || "",
    instagram: "",
    facebook: "",
    linkedin: "",
    address: place.formattedAddress || "",
    city: fallbackCity,
    rating: typeof place.rating === "number" ? place.rating : null,
    reviewCount: place.userRatingCount || 0,
    googleMapsUrl: place.googleMapsUri || "",
    latitude:
      typeof place.location?.latitude === "number" ? place.location.latitude : null,
    longitude:
      typeof place.location?.longitude === "number" ? place.location.longitude : null,
    businessStatus: place.businessStatus || "OPERATIONAL",
    source: "google",
  };
}

function demoLeads(activity: string, city: string, limit: number): Lead[] {
  const names = [
    "Horizonte Elétrica",
    "Central Volt Materiais",
    "Luz & Rede Comercial",
    "Ponto Elétrico Regional",
    "Nova Energia Suprimentos",
    "Conecta Fios e Cabos",
    "Base Elétrica Profissional",
    "Prime Componentes",
    "Eletro Mais Distribuidora",
    "Rede Forte Materiais",
    "Planalto Elétrica",
    "Via Energia Comercial",
  ];

  return names.slice(0, Math.min(limit, names.length)).map((name, index) => {
    const isLandline = index === 3 || index === 8;
    const phoneE164 = isLandline
      ? `+5564300000${String(index).padStart(2, "0")}`
      : `+55649900000${String(index).padStart(2, "0")}`;
    const status: WhatsAppStatus = isLandline
      ? "landline"
      : index % 4 === 0
        ? "valid"
        : index % 5 === 0
          ? "invalid"
          : "pending";
    return {
      id: `demo-${index + 1}`,
      name: `${name} · demonstração`,
      category: activity || "Comércio",
      searchSegment: activity || "Comércio",
      phone: isLandline
        ? `(64) 3000-00${String(index).padStart(2, "0")}`
        : `(64) 99000-00${String(index).padStart(2, "0")}`,
      phoneE164,
      phoneType: isLandline ? "landline" : "mobile",
      whatsappStatus: status,
      whatsappId: status === "valid" ? phoneE164.replace(/\D/g, "") : undefined,
      email: index % 3 === 0 ? `contato${index + 1}@empresa-demo.com.br` : "",
      website: index % 2 === 0 ? "https://example.com" : "",
      instagram: index % 3 === 0 ? "https://instagram.com/empresa_demo" : "",
      facebook: "",
      linkedin: "",
      address: `Av. Comercial, ${120 + index * 37} — Centro`,
      city,
      rating: Number((3.8 + ((index * 17) % 12) / 10).toFixed(1)),
      reviewCount: 18 + index * 23,
      googleMapsUrl: "https://maps.google.com",
      latitude: -17.7923 + index * 0.001,
      longitude: -50.9192 - index * 0.001,
      businessStatus: "OPERATIONAL",
      source: "demo",
    };
  });
}

export async function POST(request: Request) {
  let body: SearchPayload;
  try {
    body = (await request.json()) as SearchPayload;
  } catch {
    return json({ error: "Envie uma solicitação válida." }, 400);
  }

  const activity = normalizeText(body.activity, 100);
  const city = normalizeText(body.city, 120);
  const radius = Math.min(50, Math.max(1, Number(body.radius) || 20));
  const limit = Math.min(MAX_RESULTS_PER_SEARCH, Math.max(1, Number(body.limit) || 20));

  if (activity.length < 2 || city.length < 2) {
    return json({ error: "Informe o segmento e a cidade." }, 400);
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) {
    return json({
      demo: true,
      configured: false,
      leads: demoLeads(activity, city, limit),
      sourceLimit: MAX_RESULTS_PER_SEARCH,
      searchCount: SEARCH_COUNT,
      maxUniqueResults: MAX_UNIQUE_RESULTS,
      message:
        "Modo demonstração ativo. Conecte uma chave do Google Places para consultar empresas reais.",
    });
  }

  const usageCounter: UsageCounter = {
    textSearchProRequests: 0,
    textSearchEnterpriseRequests: 0,
  };

  try {
    const center = await findCityCenter(apiKey, city, usageCounter);
    const fieldMask = [
      "places.id",
      "places.displayName",
      "places.primaryTypeDisplayName",
      "places.formattedAddress",
      "places.addressComponents",
      "places.nationalPhoneNumber",
      "places.internationalPhoneNumber",
      "places.rating",
      "places.userRatingCount",
      "places.websiteUri",
      "places.googleMapsUri",
      "places.location",
      "places.businessStatus",
      "nextPageToken",
    ].join(",");

    const searchRounds = buildSearchRounds(activity, city, center, radius);
    const seenCompanies = new Set<string>();
    const uniquePlaces: GooglePlace[] = [];
    let duplicatesIgnored = 0;
    let outsideCityIgnored = 0;
    const rounds: Array<{
      round: number;
      label: string;
      received: number;
      newResults: number;
      duplicatesIgnored: number;
      outsideCityIgnored: number;
    }> = [];

    for (const [index, round] of searchRounds.entries()) {
      // Each round is a fresh, sequential request with the fetch cache disabled.
      const places = await searchRound(apiKey, round.body, fieldMask, limit, usageCounter);
      let newResults = 0;
      let roundDuplicates = 0;
      let roundOutsideCity = 0;

      for (const place of places) {
        if (!isPlaceInRequestedCity(place, city)) {
          outsideCityIgnored += 1;
          roundOutsideCity += 1;
          continue;
        }
        const key = placeKey(place);
        if (seenCompanies.has(key)) {
          duplicatesIgnored += 1;
          roundDuplicates += 1;
          continue;
        }
        seenCompanies.add(key);
        uniquePlaces.push(place);
        newResults += 1;
      }

      rounds.push({
        round: index + 1,
        label: round.label || `Busca ${index + 1}`,
        received: places.length,
        newResults,
        duplicatesIgnored: roundDuplicates,
        outsideCityIgnored: roundOutsideCity,
      });
    }

    const unique = uniquePlaces.map((place) => mapPlace(place, city, activity));
    const usageTracked = await recordApiUsage({
      searchActions: 1,
      ...usageCounter,
    });

    return json({
      demo: false,
      configured: true,
      leads: unique,
      sourceLimit: MAX_RESULTS_PER_SEARCH,
      searchCount: SEARCH_COUNT,
      maxUniqueResults: MAX_UNIQUE_RESULTS,
      duplicatesIgnored,
      outsideCityIgnored,
      rounds,
      usageTracked,
      message: `${unique.length} empresas únicas confirmadas em ${city}. ${duplicatesIgnored} resultados repetidos e ${outsideCityIgnored} resultados de outras cidades foram desconsiderados.`,
    });
  } catch (error) {
    // A request that reaches Google can consume quota even when a later page fails.
    await recordApiUsage({
      searchActions: 1,
      ...usageCounter,
    });
    const message = error instanceof Error ? error.message : "Não foi possível concluir a busca.";
    return json({ error: message }, 502);
  }
}
