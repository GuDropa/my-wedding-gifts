/**
 * Fonte de verdade do catálogo de presentes.
 * Airtable se configurado → fallback SEED senão.
 * §V2: claimed ≤ limit (derivado de rollup Airtable; em SEED usa contador local).
 */
import "server-only";
import { SEED_GIFTS } from "./seed-data";

export interface PublicGift {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  limit: number;
  claimed: number;
  photo?: string | null;
  tint: string;
  soldOut: boolean;
}

function fromSeed(): PublicGift[] {
  // No modo seed, "claimed" começa em 0 (não há Purchases reais sem Airtable).
  return SEED_GIFTS.map((g, i) => ({
    id: `seed-gift-${i}`,
    name: g.Name,
    description: g.Description,
    priceCents: g.PriceCents,
    limit: g.Limit,
    claimed: 0,
    photo: null,
    tint: g.Tint ?? "#E4E8DD",
    soldOut: false,
  }));
}

export async function getGifts(): Promise<PublicGift[]> {
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    return fromSeed();
  }
  try {
    const { listGifts } = await import("./airtable/client");
    const gifts = await listGifts();
    return gifts.map((g) => {
      const claimed = g.ClaimedCount ?? 0;
      const photo = g.Photo?.[0]?.url ?? null;
      return {
        id: g.id,
        name: g.Name,
        description: g.Description,
        priceCents: g.PriceCents,
        limit: g.Limit,
        claimed,
        photo,
        tint: g.Tint ?? "#E4E8DD",
        soldOut: claimed >= g.Limit,
      };
    });
  } catch (err) {
    console.error("[get-gifts] fallback p/ seed:", err);
    return fromSeed();
  }
}

export async function getGift(id: string): Promise<PublicGift | null> {
  const all = await getGifts();
  return all.find((g) => g.id === id) ?? null;
}
