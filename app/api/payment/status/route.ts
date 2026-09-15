/**
 * GET /api/payment/status?ref=<externalReference> → 200 {status}
 *
 * Lê `Purchases.Status` por `IdempotencyKey` — ⊥ consulta o MP.
 * A confirmação em si é do webhook (V12/V3); como webhook é server→server,
 * ele nunca acorda o browser do convidado parado no QR do Pix. Esta rota é
 * só o olho mágico do PixPanel sobre o estado que o webhook já gravou.
 *
 * V1: exige sessão de convidado.
 */
import { NextResponse } from "next/server";
import { getGuestSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getGuestSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const ref = new URL(req.url).searchParams.get("ref") ?? "";
  if (!ref) return NextResponse.json({ error: "ref requerido" }, { status: 400 });

  // externalReference = `${guestKey}:${giftId}:${uuid}` — convidado ⊥ lê pagamento alheio
  if (!ref.startsWith(`${session.guestKey}:`)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const hasAirtable = !!process.env.AIRTABLE_API_KEY && !!process.env.AIRTABLE_BASE_ID;
  if (!hasAirtable) return NextResponse.json({ status: "unknown", mock: true });

  const { findPurchaseByIdempotencyKey } = await import("@/lib/airtable/client");
  const purchase = await findPurchaseByIdempotencyKey(ref);
  if (!purchase) return NextResponse.json({ status: "unknown" });

  return NextResponse.json({ status: purchase.Status });
}
