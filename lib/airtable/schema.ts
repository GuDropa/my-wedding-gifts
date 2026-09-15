/**
 * Schema declarativo do Airtable — referência única para tabelas, campos e tipos.
 * Usado por `scripts/bootstrap-airtable.ts` (cria tabelas via Meta API) e
 * pelos clients tipados de `lib/airtable/client.ts`.
 *
 * §I → Airtable schema: Guests, Gifts, Purchases.
 * §V2/§V3 → `claimed` derivado de Purchases.status=approved (rollup).
 */

export const TABLES = {
  guests: "Guests",
  gifts: "Gifts",
  purchases: "Purchases",
} as const;

/** Campos da tabela Guests (lista fechada de 28 convidados). */
export interface GuestFields {
  Name: string;
  Initial: string;
  GuestKey: string; // slug único, usado em cookie de sessão
  Viewed?: boolean;
  FirstViewAt?: string; // ISO datetime
}

/** Campos da tabela Gifts (catálogo). */
export interface GiftFields {
  Name: string;
  Description: string;
  PriceCents: number;
  Limit: number;
  /** @deprecated B1/V26 — nasceu `number`, nunca materializou como rollup.
   *  `claimed` é derivado em `getGifts()` de Purchases.Status=approved. ⊥ ler. */
  ClaimedCount?: number;
  Photo?: { url: string }[];
  Tint?: string;
  Active: boolean;
}

/** Status válidos de uma compra. */
export type PurchaseStatus = "pending" | "approved" | "rejected";
export type PurchaseMethod = "card" | "pix";

/** Campos da tabela Purchases (uma linha por tentativa de pagamento). */
export interface PurchaseFields {
  /** linked record → Guests */
  Guest: string[];
  /** linked record → Gifts */
  Gift: string[];
  MPPaymentId?: string;
  Status: PurchaseStatus;
  Method: PurchaseMethod;
  AmountCents: number;
  CreatedAt: string;
  ConfirmedAt?: string;
  /** chave única de idempotência (V13): `${guestId}:${giftId}:${preferenceId}` */
  IdempotencyKey: string;
}

/** Descrição p/ Airtable Meta API (POST /v0/meta/bases/{baseId}/tables). */
export const TABLE_DEFS = [
  {
    name: TABLES.guests,
    description: "28 convidados pré-cadastrados (lista fechada).",
    fields: [
      { name: "Name", type: "singleLineText" },
      { name: "Initial", type: "singleLineText" },
      { name: "GuestKey", type: "singleLineText" },
      { name: "Viewed", type: "checkbox", options: { color: "greenBright", icon: "check" } },
      {
        name: "FirstViewAt",
        type: "dateTime",
        options: { dateFormat: { name: "iso" }, timeFormat: { name: "24hour" }, timeZone: "America/Sao_Paulo" },
      },
    ],
  },
  {
    name: TABLES.gifts,
    description: "Catálogo de presentes.",
    fields: [
      { name: "Name", type: "singleLineText" },
      { name: "Description", type: "multilineText" },
      { name: "PriceCents", type: "number", options: { precision: 0 } },
      { name: "Limit", type: "number", options: { precision: 0 } },
      { name: "Photo", type: "multipleAttachments" },
      { name: "Tint", type: "singleLineText" },
      { name: "Active", type: "checkbox", options: { color: "greenBright", icon: "check" } },
      // ClaimedCount é rollup — adicionado em segundo passo após criar Purchases
    ],
  },
  {
    name: TABLES.purchases,
    description: "Tentativas de pagamento (uma linha por intento via MP).",
    fields: [
      // Guest & Gift são linked records — adicionados em segundo passo (depois de Guests/Gifts existirem)
      { name: "MPPaymentId", type: "singleLineText" },
      {
        name: "Status",
        type: "singleSelect",
        options: {
          choices: [
            { name: "pending", color: "yellowLight2" },
            { name: "approved", color: "greenLight2" },
            { name: "rejected", color: "redLight2" },
          ],
        },
      },
      {
        name: "Method",
        type: "singleSelect",
        options: {
          choices: [
            { name: "card", color: "blueLight2" },
            { name: "pix", color: "purpleLight2" },
          ],
        },
      },
      { name: "AmountCents", type: "number", options: { precision: 0 } },
      {
        name: "CreatedAt",
        type: "dateTime",
        options: { dateFormat: { name: "iso" }, timeFormat: { name: "24hour" }, timeZone: "America/Sao_Paulo" },
      },
      {
        name: "ConfirmedAt",
        type: "dateTime",
        options: { dateFormat: { name: "iso" }, timeFormat: { name: "24hour" }, timeZone: "America/Sao_Paulo" },
      },
      { name: "IdempotencyKey", type: "singleLineText" },
    ],
  },
] as const;
