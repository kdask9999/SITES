import { readApiUsage } from "../../../db/api-usage";

export const runtime = "edge";

type PricingTier = {
  upTo: number;
  pricePerThousand: number;
};

type SkuPricing = {
  id: "text-search-pro" | "text-search-enterprise";
  name: string;
  description: string;
  freeCap: number;
  basePricePerThousand: number;
  tiers: PricingTier[];
};

const PRICING_UPDATED_AT = "2026-07-28";
const PRICING_SOURCE = "https://developers.google.com/maps/billing-and-pricing/pricing";
const USAGE_LIMITS_SOURCE =
  "https://developers.google.com/maps/documentation/places/web-service/usage-and-billing";
const QUOTA_MANAGEMENT_SOURCE = "https://console.cloud.google.com/google/maps-apis/quotas";

const SKU_PRICING: SkuPricing[] = [
  {
    id: "text-search-pro",
    name: "Text Search Pro",
    description: "Localização da cidade antes das varreduras.",
    freeCap: 5_000,
    basePricePerThousand: 32,
    tiers: [
      { upTo: 100_000, pricePerThousand: 32 },
      { upTo: 500_000, pricePerThousand: 25.6 },
      { upTo: 1_000_000, pricePerThousand: 19.2 },
      { upTo: 5_000_000, pricePerThousand: 9.6 },
      { upTo: Number.POSITIVE_INFINITY, pricePerThousand: 2.4 },
    ],
  },
  {
    id: "text-search-enterprise",
    name: "Text Search Enterprise",
    description: "Resultados com telefone, site, avaliação e endereço.",
    freeCap: 1_000,
    basePricePerThousand: 35,
    tiers: [
      { upTo: 100_000, pricePerThousand: 35 },
      { upTo: 500_000, pricePerThousand: 28 },
      { upTo: 1_000_000, pricePerThousand: 21 },
      { upTo: 5_000_000, pricePerThousand: 10.5 },
      { upTo: Number.POSITIVE_INFINITY, pricePerThousand: 2.63 },
    ],
  },
];

function estimatePaidCost(requests: number, pricing: SkuPricing) {
  let cursor = pricing.freeCap;
  let total = 0;

  for (const tier of pricing.tiers) {
    if (requests <= cursor) break;
    const eventsInTier = Math.min(requests, tier.upTo) - cursor;
    if (eventsInTier > 0) total += (eventsInTier / 1000) * tier.pricePerThousand;
    cursor = tier.upTo;
  }

  return total;
}

export async function GET() {
  try {
    const stored = await readApiUsage();
    const requestCounts = {
      "text-search-pro": stored.current.textSearchProRequests,
      "text-search-enterprise": stored.current.textSearchEnterpriseRequests,
    } as const;
    const skus = SKU_PRICING.map((pricing) => {
      const requests = requestCounts[pricing.id];
      const freeUsed = Math.min(requests, pricing.freeCap);
      return {
        id: pricing.id,
        name: pricing.name,
        description: pricing.description,
        requests,
        freeCap: pricing.freeCap,
        freeUsed,
        freeRemaining: Math.max(0, pricing.freeCap - requests),
        freePercent: pricing.freeCap ? Math.min(100, (freeUsed / pricing.freeCap) * 100) : 0,
        basePricePerThousand: pricing.basePricePerThousand,
        freeCreditValueUsedUsd: (freeUsed / 1000) * pricing.basePricePerThousand,
        grossListValueUsd: (requests / 1000) * pricing.basePricePerThousand,
        estimatedPaidCostUsd: estimatePaidCost(requests, pricing),
      };
    });
    const totalRequests = skus.reduce((total, sku) => total + sku.requests, 0);
    const dailyTotalRequests =
      stored.daily.textSearchProRequests + stored.daily.textSearchEnterpriseRequests;
    const freeCreditValueUsedUsd = skus.reduce(
      (total, sku) => total + sku.freeCreditValueUsedUsd,
      0,
    );
    const freeCreditValueLimitUsd = SKU_PRICING.reduce(
      (total, pricing) =>
        total + (pricing.freeCap / 1000) * pricing.basePricePerThousand,
      0,
    );

    return Response.json(
      {
        configured: stored.configured,
        month: stored.current.month,
        searches: stored.current.searchActions,
        totalRequests,
        daily: {
          date: stored.daily.date,
          searches: stored.daily.searchActions,
          totalRequests: dailyTotalRequests,
        },
        grossListValueUsd: skus.reduce((total, sku) => total + sku.grossListValueUsd, 0),
        estimatedPaidCostUsd: skus.reduce(
          (total, sku) => total + sku.estimatedPaidCostUsd,
          0,
        ),
        freeCreditValueUsedUsd,
        freeCreditValueLimitUsd,
        freeCreditPercent: freeCreditValueLimitUsd
          ? Math.min(100, (freeCreditValueUsedUsd / freeCreditValueLimitUsd) * 100)
          : 0,
        updatedAt: stored.current.updatedAt,
        lifetime: {
          searches: stored.lifetime.searchActions,
          totalRequests:
            stored.lifetime.textSearchProRequests +
            stored.lifetime.textSearchEnterpriseRequests,
        },
        skus,
        pricingUpdatedAt: PRICING_UPDATED_AT,
        pricingSource: PRICING_SOURCE,
        usageLimitsSource: USAGE_LIMITS_SOURCE,
        quotaManagementSource: QUOTA_MANAGEMENT_SOURCE,
        disclaimer:
          "O Google não publica uma franquia gratuita diária universal para a Places API (New). As cotas operacionais são definidas por projeto; as franquias gratuitas são mensais e independentes por SKU. A estimativa inclui somente as chamadas registradas por este aplicativo.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao consultar o uso da API.";
    return Response.json({ error: message }, { status: 500 });
  }
}
