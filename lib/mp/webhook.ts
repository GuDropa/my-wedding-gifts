/**
 * V12: valida `x-signature` do webhook MP antes de mutar estado.
 * MP envia header `x-signature: ts=...,v1=<hmac>` + `x-request-id`.
 * Manifest: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 * Assina com HMAC-SHA256 usando MP_WEBHOOK_SECRET (configurado no dashboard MP).
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export interface WebhookVerifyInput {
  signatureHeader: string | null; // x-signature
  requestId: string | null; // x-request-id
  dataId: string; // body.data.id
}

export function verifyMPSignature(input: WebhookVerifyInput): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[mp/webhook] MP_WEBHOOK_SECRET não configurado");
    return false;
  }
  if (!input.signatureHeader || !input.requestId) return false;

  // parse "ts=123,v1=abc"
  const parts = input.signatureHeader.split(",").reduce<Record<string, string>>((acc, kv) => {
    const [k, v] = kv.split("=").map((s) => s.trim());
    if (k && v) acc[k] = v;
    return acc;
  }, {});
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${input.dataId};request-id:${input.requestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(v1, "hex"));
  } catch {
    return false;
  }
}
