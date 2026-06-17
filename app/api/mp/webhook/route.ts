/**
 * POST /api/mp/webhook ← Mercado Pago
 * V12: valida x-signature antes de mutar. V3/V13: upsert Purchases por MPPaymentId.
 * V24: invalida cache de gifts após mutação (rollup ClaimedCount muda).
 */
import { NextResponse } from "next/server";
import { verifyMPSignature } from "@/lib/mp/webhook";
import { mpPayment, mpConfigured } from "@/lib/mp/client";

export async function POST(req: Request) {
  const signature = req.headers.get("x-signature");
  const requestId = req.headers.get("x-request-id");

  let body: { action?: string; type?: string; data?: { id?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const dataId = body.data?.id;
  if (!dataId) {
    return NextResponse.json({ error: "data.id ausente" }, { status: 400 });
  }

  // V12: validação de assinatura
  const valid = verifyMPSignature({ signatureHeader: signature, requestId, dataId });
  if (!valid) {
    console.warn("[mp/webhook] assinatura inválida");
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  // só processamos eventos de payment
  if (body.type !== "payment") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (!mpConfigured()) {
    console.warn("[mp/webhook] MP_ACCESS_TOKEN ausente — skip fetch");
    return NextResponse.json({ ok: true });
  }

  // Buscar payment completo p/ pegar status + external_reference
  let payment;
  try {
    payment = await mpPayment().get({ id: dataId });
  } catch (err) {
    console.error("[mp/webhook] mpPayment.get falhou:", err);
    return NextResponse.json({ error: "Falha ao consultar pagamento" }, { status: 502 });
  }

  const status = String(payment.status ?? "");
  const externalRef = String(payment.external_reference ?? "");
  if (!externalRef) {
    return NextResponse.json({ ok: true, note: "sem external_reference" });
  }

  const hasAirtable = !!process.env.AIRTABLE_API_KEY && !!process.env.AIRTABLE_BASE_ID;
  if (!hasAirtable) {
    return NextResponse.json({ ok: true, note: "airtable ausente" });
  }

  const { findPurchaseByIdempotencyKey, updatePurchaseStatus } = await import(
    "@/lib/airtable/client"
  );
  const purchase = await findPurchaseByIdempotencyKey(externalRef);
  if (!purchase) {
    console.warn("[mp/webhook] purchase não encontrada p/ externalRef:", externalRef);
    return NextResponse.json({ ok: true, note: "purchase ausente" });
  }

  const mapped: "approved" | "rejected" | "pending" =
    status === "approved" ? "approved" : status === "rejected" ? "rejected" : "pending";

  // V13: idempotência — se já está no status final, no-op
  if (purchase.Status === mapped) {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  await updatePurchaseStatus(purchase.id, mapped, String(payment.id ?? ""));
  return NextResponse.json({ ok: true, status: mapped });
}
