/**
 * V31 — toda recusa precisa virar motivo acionável em pt-BR.
 * Regressão de B7: `status_detail` era descartado e o convidado só via
 * "Pagamento não aprovado", sem saber o que corrigir.
 */
import { describe, it, expect } from "vitest";
import { paymentErrorCopy, paymentRejection, pendingNote } from "./status-detail";

// Tabela "Consulta sobre o status de um pagamento" da doc MP — todo status_detail
// de status `rejected`. V42: nenhum pode cair no fallback genérico.
const REJECTED_DETAILS = [
  "bank_error",
  "cc_rejected_3ds_challenge",
  "cc_rejected_3ds_mandatory",
  "cc_rejected_bad_filled_card_number",
  "cc_rejected_bad_filled_date",
  "cc_rejected_bad_filled_other",
  "cc_rejected_bad_filled_security_code",
  "cc_rejected_blacklist",
  "cc_rejected_call_for_authorize",
  "cc_rejected_card_disabled",
  "cc_rejected_duplicated_payment",
  "cc_rejected_high_risk",
  "cc_rejected_insufficient_amount",
  "cc_rejected_invalid_installments",
  "cc_rejected_max_attempts",
  "cc_rejected_other_reason",
  "cc_rejected_time_out",
  "cc_amount_rate_limit_exceeded",
  "rejected_insufficient_data",
  "rejected_by_bank",
  "rejected_by_regulations",
  "rejected_high_risk",
  "rejected_by_biz_rule",
  "rejected_other_reason",
  "insufficient_amount",
  "cc_rejected_card_type_not_allowed",
];

describe("paymentRejection (V42)", () => {
  it("todo status_detail de recusa da doc tem motivo próprio", () => {
    const fallback = paymentErrorCopy(null);
    for (const d of REJECTED_DETAILS) {
      expect(paymentRejection(d).message, d).not.toBe(fallback);
    }
  });

  // Nomes de titular dos cartões de teste do MP → status_detail que devolvem.
  it("cartões de teste: OTHE, CALL, FUND, SECU, EXPI, FORM", () => {
    expect(paymentRejection("cc_rejected_other_reason").message).toMatch(/outro cartão/); // OTHE
    expect(paymentRejection("cc_rejected_call_for_authorize").message).toMatch(/[Aa]utoriz/); // CALL
    expect(paymentRejection("cc_rejected_insufficient_amount").message).toMatch(/saldo/); // FUND
    expect(paymentRejection("cc_rejected_bad_filled_security_code").message).toMatch(/CVV/); // SECU
    expect(paymentRejection("cc_rejected_bad_filled_date").message).toMatch(/validade/); // EXPI
    expect(paymentRejection("cc_rejected_bad_filled_other").message).toMatch(/dados/); // FORM
  });

  it("dado mal preenchido pede conferência; recusa do banco ⊥", () => {
    expect(paymentRejection("cc_rejected_bad_filled_date").title).toBe("Confira os dados do cartão");
    expect(paymentRejection("cc_rejected_other_reason").title).toBe("Pagamento não aprovado");
    expect(paymentRejection(null).title).toBe("Pagamento não aprovado");
  });
});

describe("pendingNote (V42)", () => {
  it("CONT: pagamento em análise explica o prazo", () => {
    expect(pendingNote("pending_contingency")).toMatch(/análise/);
    expect(pendingNote("pending_review_manual")).toMatch(/revisão/);
  });

  it("pix aguardando ou detail ausente → sem nota extra", () => {
    expect(pendingNote("pending_waiting_transfer")).toBeNull();
    expect(pendingNote(null)).toBeNull();
  });
});

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
