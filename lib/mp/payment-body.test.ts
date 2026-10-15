/**
 * V37/V39/V41 — corpo do `payments.create`.
 * Regressão de B11 (pix com validade default de 24h) e B13 (valor vindo do browser).
 */
import { describe, it, expect } from "vitest";
import { buildPaymentBody, pixExpiration, splitName } from "./payment-body";

const gift = { id: "recGift1", name: "Jantar a dois", description: "Um jantar especial", priceCents: 18000 };
const now = new Date("2026-10-14T23:00:00.000Z");

function build(formData: Record<string, unknown>) {
  return buildPaymentBody({
    formData,
    gift,
    guestName: "Maria Clara Souza",
    guestKey: "maria-clara-souza",
    externalReference: "maria-clara-souza:recGift1:uuid",
    now,
  });
}

const pixForm = {
  payment_method_id: "pix",
  transaction_amount: 180,
  payer: { email: "convidado@example.com", identification: { type: "CPF", number: "12345678909" } },
};

const cardForm = {
  payment_method_id: "master",
  token: "tok_abc",
  installments: 1,
  issuer_id: "24",
  transaction_amount: 180,
  payer: { email: "convidado@example.com", identification: { type: "CPF", number: "12345678909" } },
};

describe("pixExpiration (V37)", () => {
  it("30 min à frente, ISO c/ offset de Brasília", () => {
    expect(pixExpiration(now)).toBe("2026-10-14T20:30:00.000-03:00");
  });

  it("vira o dia corretamente no fuso local", () => {
    // 23:50 em Brasília + 30 min → 00:20 do dia seguinte
    expect(pixExpiration(new Date("2026-10-15T02:50:00.000Z"))).toBe(
      "2026-10-15T00:20:00.000-03:00",
    );
  });
});

describe("buildPaymentBody", () => {
  it("B11: pix leva date_of_expiration de 30 min", () => {
    expect(build(pixForm).date_of_expiration).toBe("2026-10-14T20:30:00.000-03:00");
  });

  it("cartão ⊥ leva date_of_expiration", () => {
    expect(build(cardForm).date_of_expiration).toBeUndefined();
  });

  it("B13: transaction_amount vem do servidor, ⊥ do formData", () => {
    expect(build({ ...cardForm, transaction_amount: 1 }).transaction_amount).toBe(180);
    expect(build({ ...pixForm, transaction_amount: 0.01 }).transaction_amount).toBe(180);
  });

  it("preserva o que o Brick preencheu (token, parcelas, payer)", () => {
    const body = build(cardForm);
    expect(body.token).toBe("tok_abc");
    expect(body.installments).toBe(1);
    expect(body.payer).toEqual(cardForm.payer);
  });

  it("V39: additional_info c/ item e nome do convidado", () => {
    expect(build(cardForm).additional_info).toEqual({
      items: [
        {
          id: "recGift1",
          title: "Presente: Jantar a dois",
          description: "Um jantar especial",
          quantity: 1,
          unit_price: 180,
        },
      ],
      payer: { first_name: "Maria", last_name: "Clara Souza" },
    });
  });

  it("referência, descrição e metadata do pedido", () => {
    const body = build(pixForm);
    expect(body.external_reference).toBe("maria-clara-souza:recGift1:uuid");
    expect(body.description).toBe("Presente: Jantar a dois");
    expect(body.metadata).toEqual({ guest_key: "maria-clara-souza", gift_id: "recGift1" });
  });
});

describe("splitName", () => {
  it("nome único → só first_name", () => {
    expect(splitName("Vovó")).toEqual({ first_name: "Vovó" });
  });

  it("espaços extras ⊥ viram partes vazias", () => {
    expect(splitName("  Ana   Paula  ")).toEqual({ first_name: "Ana", last_name: "Paula" });
  });

  it("vazio → objeto vazio", () => {
    expect(splitName("  ")).toEqual({});
  });
});
