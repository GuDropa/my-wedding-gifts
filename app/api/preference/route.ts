/**
 * POST /api/preference {giftId} → 200 {preferenceId, publicKey, amount, giftName}
 * V1: requer sessão. V22: ACCESS_TOKEN só server. V21: amount = priceCents/100.
 * V14: bloqueia se sold-out.
 */
import { NextResponse } from "next/server";
import { getGuestSession } from "@/lib/session";
import { getGift } from "@/lib/get-gifts";
import { mpPreference, mpConfigured } from "@/lib/mp/client";
import { randomUUID } from "node:crypto";

export async function POST(req: Request) {
  const session = await getGuestSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  let body: { giftId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const giftId = typeof body.giftId === "string" ? body.giftId : "";
  if (!giftId) return NextResponse.json({ error: "giftId requerido" }, { status: 400 });

  const gift = await getGift(giftId);
  if (!gift) return NextResponse.json({ error: "Presente não encontrado" }, { status: 404 });
  if (gift.soldOut) {
    return NextResponse.json(
      { error: "Esse presente já foi todo escolhido com carinho" },
      { status: 409 },
    );
  }

  const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? "";
  const externalReference = `${session.guestKey}:${giftId}:${randomUUID()}`;

  // Modo dev / sem MP configurado → devolve preferenceId mock p/ a UI seguir
  if (!mpConfigured()) {
    return NextResponse.json({
      preferenceId: `MOCK-${externalReference}`,
      publicKey,
      amount: gift.priceCents / 100,
      giftName: gift.name,
      externalReference,
      mock: true,
    });
  }

  try {
    const pref = await mpPreference().create({
      body: {
        items: [
          {
            id: gift.id,
            title: `Presente: ${gift.name}`,
            description: `De ${session.name} para Gabriely & Gustavo`,
            quantity: 1,
            unit_price: gift.priceCents / 100,
            currency_id: "BRL",
          },
        ],
        payer: { name: session.name },
        external_reference: externalReference,
        statement_descriptor: "GG Casamento",
        payment_methods: {
          excluded_payment_types: [{ id: "ticket" }, { id: "atm" }],
        },
      },
    });

    return NextResponse.json({
      preferenceId: pref.id,
      publicKey,
      amount: gift.priceCents / 100,
      giftName: gift.name,
      externalReference,
    });
  } catch (err) {
    console.error("[/api/preference]", err);
    return NextResponse.json({ error: "Não foi possível criar a preferência" }, { status: 500 });
  }
}
