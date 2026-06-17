/**
 * Cliente Airtable server-side com cache curto p/ Gifts (V24 — rate limit 5 req/s).
 * ⊥ usar no browser — depende de `AIRTABLE_API_KEY` (V23).
 */
import "server-only";
import Airtable, { type FieldSet } from "airtable";
import {
  TABLES,
  type GuestFields,
  type GiftFields,
  type PurchaseFields,
} from "./schema";

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.warn("[airtable] AIRTABLE_API_KEY ou AIRTABLE_BASE_ID ausentes");
}

let _base: Airtable.Base | null = null;
function base(): Airtable.Base {
  if (_base) return _base;
  if (!apiKey || !baseId) {
    throw new Error("Airtable não configurado: defina AIRTABLE_API_KEY & AIRTABLE_BASE_ID");
  }
  _base = new Airtable({ apiKey }).base(baseId);
  return _base;
}

/** Forma plana e segura p/ serializar p/ client. */
export type Guest = { id: string } & GuestFields;
export type Gift = { id: string } & GiftFields;
export type Purchase = { id: string } & PurchaseFields;

type AnyRecord = { id: string; fields: FieldSet };

function flatten<T>(r: AnyRecord): { id: string } & T {
  return { id: r.id, ...(r.fields as unknown as T) };
}

// -------- Guests --------
export async function listGuests(): Promise<Guest[]> {
  const rows = await base()(TABLES.guests).select({ pageSize: 100 }).all();
  return rows.map((r) => flatten<GuestFields>(r as unknown as AnyRecord));
}

export async function findGuestByKey(guestKey: string): Promise<Guest | null> {
  const rows = await base()(TABLES.guests)
    .select({
      maxRecords: 1,
      filterByFormula: `{GuestKey} = "${guestKey.replace(/"/g, '\\"')}"`,
    })
    .firstPage();
  if (rows.length === 0) return null;
  return flatten<GuestFields>(rows[0] as unknown as AnyRecord);
}

export async function markGuestViewed(guestRecordId: string): Promise<void> {
  await base()(TABLES.guests).update([
    {
      id: guestRecordId,
      fields: { Viewed: true, FirstViewAt: new Date().toISOString() },
    },
  ]);
}

// -------- Gifts (cache in-memory curto) --------
type GiftCache = { ts: number; data: Gift[] };
let _giftCache: GiftCache | null = null;
const GIFT_CACHE_TTL_MS = 10_000; // V24

export async function listGifts(opts?: { fresh?: boolean }): Promise<Gift[]> {
  const now = Date.now();
  if (!opts?.fresh && _giftCache && now - _giftCache.ts < GIFT_CACHE_TTL_MS) {
    return _giftCache.data;
  }
  const rows = await base()(TABLES.gifts)
    .select({ pageSize: 100, filterByFormula: "{Active}" })
    .all();
  const data = rows.map((r) => flatten<GiftFields>(r as unknown as AnyRecord));
  _giftCache = { ts: now, data };
  return data;
}

export async function getGift(id: string): Promise<Gift | null> {
  try {
    const r = await base()(TABLES.gifts).find(id);
    return flatten<GiftFields>(r as unknown as AnyRecord);
  } catch {
    return null;
  }
}

export function invalidateGiftCache(): void {
  _giftCache = null;
}

// -------- Purchases --------
export async function createPurchase(fields: PurchaseFields): Promise<Purchase> {
  const [created] = await base()(TABLES.purchases).create([
    { fields: fields as unknown as FieldSet },
  ]);
  return flatten<PurchaseFields>(created as unknown as AnyRecord);
}

export async function findPurchaseByIdempotencyKey(key: string): Promise<Purchase | null> {
  const rows = await base()(TABLES.purchases)
    .select({
      maxRecords: 1,
      filterByFormula: `{IdempotencyKey} = "${key.replace(/"/g, '\\"')}"`,
    })
    .firstPage();
  if (rows.length === 0) return null;
  return flatten<PurchaseFields>(rows[0] as unknown as AnyRecord);
}

export async function findPurchaseByMPPaymentId(mpPaymentId: string): Promise<Purchase | null> {
  const rows = await base()(TABLES.purchases)
    .select({
      maxRecords: 1,
      filterByFormula: `{MPPaymentId} = "${mpPaymentId}"`,
    })
    .firstPage();
  if (rows.length === 0) return null;
  return flatten<PurchaseFields>(rows[0] as unknown as AnyRecord);
}

export async function updatePurchaseStatus(
  recordId: string,
  status: PurchaseFields["Status"],
  mpPaymentId?: string,
): Promise<Purchase> {
  const fields: Partial<PurchaseFields> = { Status: status };
  if (status === "approved") fields.ConfirmedAt = new Date().toISOString();
  if (mpPaymentId) fields.MPPaymentId = mpPaymentId;
  const [r] = await base()(TABLES.purchases).update([
    { id: recordId, fields: fields as unknown as FieldSet },
  ]);
  invalidateGiftCache(); // rollup ClaimedCount muda
  return flatten<PurchaseFields>(r as unknown as AnyRecord);
}

/** Conta aprovados p/ um gift — usado em re-check anti-race (V3a). */
export async function countApprovedForGift(giftRecordId: string): Promise<number> {
  const rows = await base()(TABLES.purchases)
    .select({
      filterByFormula: `AND({Status} = "approved", FIND("${giftRecordId}", ARRAYJOIN({Gift})))`,
      pageSize: 100,
    })
    .all();
  return rows.length;
}
