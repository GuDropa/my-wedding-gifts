/**
 * POST /api/process-payment — chamado pelo `onSubmit` do Payment Brick.
 * Body: { paymentData (do Brick), giftId, externalReference }
 *
 * Fluxo:
 *   1. V1: requer sessão.
 *   2. V3a: re-checar `claimed < limit` ANTES de criar payment (anti-race).
 *   3. V13: criar Purchase pending com IdempotencyKey = externalReference.
 *   4. V22: payments.create server-side (ACCESS_TOKEN só aqui).
 *   5. Update Purchase status conforme retorno (approved | rejected | pending).
 *   6. Retorna {status, paymentId} p/ Brick mostrar Status Screen.
 */
import { NextResponse } from "next/server";
import { getGuestSession } from "@/lib/session";
import { getGift } from "@/lib/get-gifts";
import { mpPayment, mpConfigured } from "@/lib/mp/client";

export async function POST(req: Request) {
  const session = await getGuestSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  type Body = {
    paymentData?: Record<string, unknown>;
    giftId?: string;
    externalReference?: string;
    method?: "card" | "pix";
  };
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const { paymentData, giftId, externalReference, method } = body;
  if (!paymentData || !giftId || !externalReference) {
    return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
  }

  const gift = await getGift(giftId);
  if (!gift) return NextResponse.json({ error: "Presente não encontrado" }, { status: 404 });

  // ---------- V3a: re-check anti-race ----------
  if (gift.claimed >= gift.limit) {
    return NextResponse.json(
      { error: "Esse presente já foi todo escolhido com carinho" },
      { status: 409 },
    );
  }

  const hasAirtable = !!process.env.AIRTABLE_API_KEY && !!process.env.AIRTABLE_BASE_ID;

  // ---------- V13: idempotência via IdempotencyKey = externalReference ----------
  let purchaseRecordId: string | null = null;
  if (hasAirtable) {
    const { findPurchaseByIdempotencyKey, createPurchase, countApprovedForGift } = await import(
      "@/lib/airtable/client"
    );

    // V3a: contar aprovados em tempo real diretamente da fonte
    try {
      const approved = await countApprovedForGift(gift.id);
      if (approved >= gift.limit) {
        return NextResponse.json(
          { error: "Esse presente já foi todo escolhido com carinho" },
          { status: 409 },
        );
      }
    } catch (err) {
      console.warn("[process-payment] countApprovedForGift falhou, prosseguindo:", err);
    }

    const existing = await findPurchaseByIdempotencyKey(externalReference);
    if (existing) {
      return NextResponse.json({
        status: existing.Status,
        paymentId: existing.MPPaymentId ?? null,
        idempotent: true,
      });
    }

    const created = await createPurchase({
      Guest: [session.guestId],
      Gift: [gift.id],
      Status: "pending",
      Method: method ?? "card",
      AmountCents: gift.priceCents,
      CreatedAt: new Date().toISOString(),
      IdempotencyKey: externalReference,
    });
    purchaseRecordId = created.id;
  }

  // ---------- V22: pagamento server-side ----------
  if (!mpConfigured()) {
    // Modo dev — simula "approved" imediatamente
    if (hasAirtable && purchaseRecordId) {
      const { updatePurchaseStatus } = await import("@/lib/airtable/client");
      await updatePurchaseStatus(purchaseRecordId, "approved", `MOCK-${Date.now()}`);
    }
    return NextResponse.json({
      status: "approved",
      paymentId: `MOCK-${Date.now()}`,
      mock: true,
    });
  }

  try {
    const result = await mpPayment().create({
      body: {
        ...(paymentData as object),
        external_reference: externalReference,
        statement_descriptor: "GG Casamento",
        description: `Presente: ${gift.name}`,
        metadata: {
          guest_key: session.guestKey,
          gift_id: gift.id,
        },
      },
    });

    const status = (result.status ?? "pending") as "approved" | "rejected" | "pending" | string;
    const paymentId = String(result.id ?? "");

    if (hasAirtable && purchaseRecordId) {
      const { updatePurchaseStatus } = await import("@/lib/airtable/client");
      const mapped: "approved" | "rejected" | "pending" =
        status === "approved" ? "approved" : status === "rejected" ? "rejected" : "pending";
      await updatePurchaseStatus(purchaseRecordId, mapped, paymentId);
    }

    return NextResponse.json({ status, paymentId });
  } catch (err) {
    console.error("[/api/process-payment]", err);
    if (hasAirtable && purchaseRecordId) {
      const { updatePurchaseStatus } = await import("@/lib/airtable/client");
      await updatePurchaseStatus(purchaseRecordId, "rejected");
    }
    return NextResponse.json({ error: "Pagamento não pôde ser processado" }, { status: 500 });
  }
}
