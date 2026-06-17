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
