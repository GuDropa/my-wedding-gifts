/**
 * V31 — toda recusa precisa virar motivo acionável em pt-BR.
 * Regressão de B7: `status_detail` era descartado e o convidado só via
 * "Pagamento não aprovado", sem saber o que corrigir.
 */
import { describe, it, expect } from "vitest";
import { paymentErrorCopy } from "./status-detail";

describe("paymentErrorCopy (V31)", () => {
  it("traduz recusas conhecidas p/ motivo concreto", () => {
    expect(paymentErrorCopy("cc_rejected_bad_filled_security_code")).toMatch(/CVV/);
    expect(paymentErrorCopy("cc_rejected_insufficient_amount")).toMatch(/saldo/);
    expect(paymentErrorCopy("cc_rejected_call_for_authorize")).toMatch(/[Aa]utoriz/);
  });

  it("B7: cai no fallback quando o MP ⊥ manda status_detail", () => {
    for (const v of [null, undefined, ""]) {
      expect(paymentErrorCopy(v)).toMatch(/Pix/);
    }
  });

  it("status_detail desconhecido ⊥ vaza código cru p/ o convidado", () => {
    const copy = paymentErrorCopy("cc_rejected_algo_que_o_mp_inventou");
    expect(copy).not.toMatch(/cc_rejected/);
    expect(copy).toMatch(/Pix/);
  });

  it("V8: ♥ só no fallback, ⊥ em todo motivo", () => {
    expect(paymentErrorCopy("cc_rejected_bad_filled_date")).not.toMatch(/♥/);
    expect(paymentErrorCopy(null)).toMatch(/♥/);
  });
});
