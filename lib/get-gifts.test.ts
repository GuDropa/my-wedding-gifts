/**
 * V26 — `claimed` derivado de Purchases.Status=approved dentro de getGifts().
 * Regressão de B1: `Gifts.ClaimedCount` nunca virou rollup; lendo o campo,
 * `claimed` era 0 p/ todo presente e nenhum card jamais esgotava (V14 morto).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const listGifts = vi.fn();
const listApprovedPurchases = vi.fn();

vi.mock("./airtable/client", async () => {
  const actual = await vi.importActual<typeof import("./airtable/client")>("./airtable/client");
  return { ...actual, listGifts, listApprovedPurchases };
});

const CAFETEIRA = "rec0RXdyyM3Ki5f1U";
const PANELAS = "recPanelas0000001";

function gift(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    Name: id === CAFETEIRA ? "Cafeteira" : "Jogo de Panelas",
    Description: "…",
    PriceCents: 9000,
    Limit: 2,
    Active: true,
    // B1: o campo existe na base e vem vazio — não pode ser a fonte de `claimed`.
    ClaimedCount: undefined,
    ...over,
  };
}

const purchase = (giftIds: string[]) => ({
  id: "recP" + giftIds.join(""),
  giftIds,
  guestIds: ["recG1"],
  amountCents: 9000,
});

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("AIRTABLE_API_KEY", "key-test");
  vi.stubEnv("AIRTABLE_BASE_ID", "app-test");
  listGifts.mockReset();
  listApprovedPurchases.mockReset();
});

async function run() {
  const { getGifts } = await import("./get-gifts");
  return getGifts();
}

describe("getGifts (V26)", () => {
  it("deriva claimed das compras aprovadas, ⊥ de ClaimedCount", async () => {
    listGifts.mockResolvedValue([gift(CAFETEIRA), gift(PANELAS, { Limit: 3 })]);
    listApprovedPurchases.mockResolvedValue([purchase([CAFETEIRA]), purchase([CAFETEIRA])]);

    const gifts = await run();
    expect(gifts.find((g) => g.id === CAFETEIRA)!.claimed).toBe(2);
    expect(gifts.find((g) => g.id === PANELAS)!.claimed).toBe(0);
  });

  it("B1: gift no limite fica soldOut (V2/V14)", async () => {
    listGifts.mockResolvedValue([gift(CAFETEIRA, { Limit: 2 })]);
    listApprovedPurchases.mockResolvedValue([purchase([CAFETEIRA]), purchase([CAFETEIRA])]);

    expect((await run())[0].soldOut).toBe(true);
  });

  it("gift com cota sobrando ⊥ é soldOut", async () => {
    listGifts.mockResolvedValue([gift(CAFETEIRA, { Limit: 3 })]);
    listApprovedPurchases.mockResolvedValue([purchase([CAFETEIRA])]);

    const g = (await run())[0];
    expect(g.claimed).toBe(1);
    expect(g.soldOut).toBe(false);
  });

  it("sem compra aprovada → claimed 0 e disponível", async () => {
    listGifts.mockResolvedValue([gift(CAFETEIRA)]);
    listApprovedPurchases.mockResolvedValue([]);

    const g = (await run())[0];
    expect(g.claimed).toBe(0);
    expect(g.soldOut).toBe(false);
  });
});
