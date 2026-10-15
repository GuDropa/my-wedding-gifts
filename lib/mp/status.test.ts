/**
 * V38 — mapeamento único de status MP → `Purchases.Status`.
 * Regressão de B12 (estorno/chargeback/expirado voltavam a `pending`)
 * e B14 (`in_process` tratado como recusa no client).
 */
import { describe, it, expect } from "vitest";
import { mapPaymentStatus } from "./status";

describe("mapPaymentStatus (V38)", () => {
  it("approved → approved", () => {
    expect(mapPaymentStatus("approved")).toBe("approved");
  });

  it("B12: recusado, expirado, estornado e chargeback → rejected", () => {
    for (const s of ["rejected", "cancelled", "refunded", "charged_back"]) {
      expect(mapPaymentStatus(s)).toBe("rejected");
    }
  });

  it("B14: em andamento (inclui cartão em análise) → pending", () => {
    for (const s of ["pending", "in_process", "authorized", "in_mediation"]) {
      expect(mapPaymentStatus(s)).toBe("pending");
    }
  });

  it("status ausente → pending", () => {
    expect(mapPaymentStatus(undefined)).toBe("pending");
    expect(mapPaymentStatus(null)).toBe("pending");
    expect(mapPaymentStatus("")).toBe("pending");
  });
});
