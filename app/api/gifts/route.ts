/**
 * GET /api/gifts → 200 [{id,name,description,priceCents,limit,claimed,photo,tint,soldOut}]
 * V1: requer sessão (proxy garante). V2: claimed ≤ limit (rollup).
 */
import { NextResponse } from "next/server";
import { getGuestSession } from "@/lib/session";
import { getGifts } from "@/lib/get-gifts";

export async function GET() {
  const session = await getGuestSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const gifts = await getGifts();
  return NextResponse.json(gifts);
}
