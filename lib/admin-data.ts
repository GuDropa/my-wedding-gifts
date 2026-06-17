/**
 * Helpers de leitura p/ telas admin — agrega state de convidados x compras.
 */
import "server-only";
import { getGuests } from "./get-guests";

export interface GuestAdminRow {
  id: string;
  name: string;
  initial: string;
  guestKey: string;
  viewed: boolean;
  purchased: boolean;
  totalCents: number;
  gifts: string[]; // nomes dos presentes
}

export async function getGuestsWithState(): Promise<GuestAdminRow[]> {
  const baseGuests = await getGuests();
  const hasAirtable = !!process.env.AIRTABLE_API_KEY && !!process.env.AIRTABLE_BASE_ID;

  // Mock mode — sem Airtable, devolve guests com viewed/purchased false
  if (!hasAirtable) {
    return baseGuests.map((g) => ({
      id: g.id,
      name: g.name,
      initial: g.initial,
      guestKey: g.guestKey,
      viewed: false,
      purchased: false,
      totalCents: 0,
      gifts: [],
    }));
  }

  const { listGuests } = await import("./airtable/client");
  const { TABLES } = await import("./airtable/schema");
  const Airtable = (await import("airtable")).default;
  const at = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY! }).base(
    process.env.AIRTABLE_BASE_ID!,
  );

  const [guests, purchases, gifts] = await Promise.all([
    listGuests(),
    at(TABLES.purchases)
      .select({ filterByFormula: '{Status} = "approved"', pageSize: 100 })
      .all(),
    at(TABLES.gifts).select({ pageSize: 100 }).all(),
  ]);

  const giftNameById = new Map<string, string>();
  gifts.forEach((g) => giftNameById.set(g.id, (g.get("Name") as string) ?? "?"));

  const purchasesByGuestId = new Map<string, { totalCents: number; gifts: string[] }>();
  purchases.forEach((p) => {
    const guestIds = (p.get("Guest") as string[] | undefined) ?? [];
    const giftIds = (p.get("Gift") as string[] | undefined) ?? [];
    const amount = (p.get("AmountCents") as number | undefined) ?? 0;
    const giftName = giftIds[0] ? giftNameById.get(giftIds[0]) ?? "?" : "?";
    guestIds.forEach((gid) => {
      const cur = purchasesByGuestId.get(gid) ?? { totalCents: 0, gifts: [] };
      cur.totalCents += amount;
      cur.gifts.push(giftName);
      purchasesByGuestId.set(gid, cur);
    });
  });

  return guests.map((g) => {
    const pinfo = purchasesByGuestId.get(g.id);
    return {
      id: g.id,
      name: g.Name,
      initial: g.Initial,
      guestKey: g.GuestKey,
      viewed: !!g.Viewed,
      purchased: !!pinfo,
      totalCents: pinfo?.totalCents ?? 0,
      gifts: pinfo?.gifts ?? [],
    };
  });
}
