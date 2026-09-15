/**
 * Cliente Mercado Pago server-side. V22: ACCESS_TOKEN ⊥ no client.
 * Bricks aceitam preferenceId (criado server-side) e/ou processam payment
 * direto via `payments.create` chamado pelo nosso `onSubmit` handler.
 */
import "server-only";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

const token = process.env.MP_ACCESS_TOKEN;

let _client: MercadoPagoConfig | null = null;
function client(): MercadoPagoConfig {
  if (_client) return _client;
  if (!token) {
    throw new Error("MP_ACCESS_TOKEN ausente");
  }
  _client = new MercadoPagoConfig({
    accessToken: token,
    options: { timeout: 10_000 },
  });
  return _client;
}

export function mpPreference(): Preference {
  return new Preference(client());
}

export function mpPayment(): Payment {
  return new Payment(client());
}

export function mpConfigured(): boolean {
  return !!token;
}

/**
 * V29: o branch mock de pagamento só existe fora de produção.
 * B4: sem esse gate, subir em prod sem `MP_ACCESS_TOKEN` fazia o mock gravar
 * `Purchases.Status=approved` de verdade — presente dado sem pagar nada.
 * `NODE_ENV` é lido na chamada (⊥ no load) p/ manter a função testável.
 */
export function mockAllowed(): boolean {
  return !mpConfigured() && process.env.NODE_ENV !== "production";
}
