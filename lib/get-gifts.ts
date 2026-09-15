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

/**
 * V26: `claimed` é derivado aqui — ponto único de verdade.
 * ⊥ ler `Gifts.ClaimedCount` (B1: campo nunca virou rollup, sempre vazio).
 * 1 fetch de gifts + 1 de compras aprovadas, em paralelo (V24).
 */
export async function getGifts(): Promise<PublicGift[]> {
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    return fromSeed();
  }
  try {
    const { listGifts, listApprovedPurchases, countApprovedIn } = await import(
      "./airtable/client"
    );
    const [gifts, approved] = await Promise.all([listGifts(), listApprovedPurchases()]);
    return gifts.map((g) => {
      const claimed = countApprovedIn(approved, g.id);
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
