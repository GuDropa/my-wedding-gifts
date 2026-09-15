/**
 * V27 — contagem de compras aprovadas por record-id.
 * Regressão de B2: a fórmula antiga usava FIND(recId, ARRAYJOIN({Gift})),
 * e ARRAYJOIN devolve o primary field (Name), nunca o id — casava sempre zero.
 */
import { describe, it, expect } from "vitest";
import { countApprovedIn, type ApprovedPurchase } from "./client";

const p = (giftIds: string[]): ApprovedPurchase => ({
  id: "recP" + Math.random().toString(36).slice(2, 8),
  giftIds,
  guestIds: ["recG1"],
  amountCents: 9000,
});

const CAFETEIRA = "rec0RXdyyM3Ki5f1U";
const LUA_DE_MEL = "recRzb4fDRlCSOqBe";

describe("countApprovedIn (V27)", () => {
  it("conta só as compras do gift pedido", () => {
    const approved = [p([CAFETEIRA]), p([CAFETEIRA]), p([LUA_DE_MEL])];
    expect(countApprovedIn(approved, CAFETEIRA)).toBe(2);
    expect(countApprovedIn(approved, LUA_DE_MEL)).toBe(1);
  });

  it("devolve 0 p/ gift sem compras aprovadas", () => {
    expect(countApprovedIn([p([CAFETEIRA])], "recInexistente")).toBe(0);
  });

  it("ignora compra com link Gift vazio", () => {
    expect(countApprovedIn([p([]), p([CAFETEIRA])], CAFETEIRA)).toBe(1);
  });

  it("B2: casa record-id, ⊥ nome do presente", () => {
    // ARRAYJOIN devolvia "Cafeteira"; o filtro precisa do id, não do label.
    const approved = [p([CAFETEIRA]), p([CAFETEIRA])];
    expect(countApprovedIn(approved, "Cafeteira")).toBe(0);
    expect(countApprovedIn(approved, CAFETEIRA)).toBe(2);
  });

  it("não conta em dobro quando o link traz vários gifts", () => {
    expect(countApprovedIn([p([CAFETEIRA, LUA_DE_MEL])], CAFETEIRA)).toBe(1);
  });
});
