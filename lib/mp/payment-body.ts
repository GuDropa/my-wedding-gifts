/**
 * Corpo do `payments.create` a partir do `formData` do Payment Brick.
 * V41/B13: valor sempre do servidor — o `formData` vem do browser e pode ser adulterado.
 * V37/B11: pix expira em 30 min (default MP = 24h).
 * V39: `additional_info` c/ o item e o nome do convidado — aprovação de cartão e
 * nota de qualidade da integração no MP.
 * ⊥ importar `server-only`: função pura, testada no vitest.
 */
import type { Payment } from "mercadopago";

export type PaymentCreateBody = Parameters<Payment["create"]>[0]["body"];

/** MP aceita de 30 min a 30 dias a partir da emissão. */
export const PIX_EXPIRATION_MIN = 30;
// Brasília, sem horário de verão desde 2019 — mesmo formato do exemplo da doc MP.
const BRT_OFFSET_MIN = -180;

export function pixExpiration(now: Date, minutes = PIX_EXPIRATION_MIN): string {
  const local = new Date(now.getTime() + (minutes + BRT_OFFSET_MIN) * 60_000);
  return local.toISOString().replace("Z", "-03:00");
}

export function splitName(full: string): { first_name?: string; last_name?: string } {
  const [first, ...rest] = full.trim().split(/\s+/).filter(Boolean);
  if (!first) return {};
  return rest.length ? { first_name: first, last_name: rest.join(" ") } : { first_name: first };
}

interface Input {
  formData: Record<string, unknown>;
  gift: { id: string; name: string; description: string; priceCents: number };
  guestName: string;
  guestKey: string;
  externalReference: string;
  now?: Date;
}

export function buildPaymentBody({
  formData,
  gift,
  guestName,
  guestKey,
  externalReference,
  now = new Date(),
}: Input): PaymentCreateBody {
  const amount = gift.priceCents / 100;
  const isPix = formData.payment_method_id === "pix";

  return {
    ...(formData as PaymentCreateBody),
    transaction_amount: amount,
    external_reference: externalReference,
    statement_descriptor: "GG Casamento",
    description: `Presente: ${gift.name}`,
    metadata: {
      guest_key: guestKey,
      gift_id: gift.id,
    },
    additional_info: {
      items: [
        {
          id: gift.id,
          title: `Presente: ${gift.name}`,
          ...(gift.description ? { description: gift.description } : {}),
          quantity: 1,
          unit_price: amount,
        },
      ],
      // Só em additional_info: o `payer` de topo é o que o convidado digitou no Brick.
      payer: splitName(guestName),
    },
    ...(isPix ? { date_of_expiration: pixExpiration(now) } : {}),
  };
}
