/**
 * POST /api/preference {giftId} → 200 {publicKey, amount, giftName, externalReference, mock?}
 * Prepara o checkout: sold-out check + `externalReference` (IdempotencyKey da Purchase).
 * V40: ⊥ cria MP Preference — o pagamento nasce no nosso backend (V30), então
 * a Preference era só uma chamada ao MP sem uso a cada abertura da tela.
 * V1: requer sessão. V21: amount = priceCents/100. V14: bloqueia se sold-out.
 */
import { NextResponse } from "next/server";
import { getGuestSession } from "@/lib/session";
import { getGift } from "@/lib/get-gifts";
import { mpConfigured, mockAllowed } from "@/lib/mp/client";
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

  // V29/B4: em produção sem MP configurado ⊥ existe caminho mock — 503 explícito.
  if (!mpConfigured() && !mockAllowed()) {
    console.error("[/api/preference] MP_ACCESS_TOKEN ausente em produção — recusando");
    return NextResponse.json(
      { error: "O pagamento está indisponível agora. Já estamos resolvendo ♥" },
      { status: 503 },
    );
  }

  // Modo dev / sem MP configurado → `mock` p/ a UI mostrar o botão de simular
  return NextResponse.json({
    publicKey,
    amount: gift.priceCents / 100,
    giftName: gift.name,
    externalReference,
    ...(mpConfigured() ? {} : { mock: true }),
  });
}
