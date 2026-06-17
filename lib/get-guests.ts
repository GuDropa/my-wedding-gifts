/**
 * Fonte de verdade p/ a lista fechada de 28 convidados.
 * Se Airtable configurado → puxa de lá. Senão → usa SEED_GUESTS (V4).
 */
import "server-only";
import { SEED_GUESTS } from "./seed-data";

export interface PublicGuest {
  id: string;
  name: string;
  initial: string;
  guestKey: string;
}

function fromSeed(): PublicGuest[] {
  return SEED_GUESTS.map((g, i) => ({
    id: `seed-${i}`,
    name: g.Name,
    initial: g.Initial,
    guestKey: g.GuestKey,
  }));
}

export async function getGuests(): Promise<PublicGuest[]> {
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    return fromSeed();
  }
  try {
    const { listGuests } = await import("./airtable/client");
    const guests = await listGuests();
    return guests.map((g) => ({
      id: g.id,
      name: g.Name,
      initial: g.Initial,
      guestKey: g.GuestKey,
    })).sort((a, b) => a.initial.localeCompare(b.initial));
  } catch (err) {
    console.error("[get-guests] fallback p/ seed:", err);
    return fromSeed();
  }
}

export async function findGuest(guestKey: string): Promise<PublicGuest | null> {
  const all = await getGuests();
  return all.find((g) => g.guestKey === guestKey) ?? null;
}
