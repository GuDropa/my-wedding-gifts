/**
 * POST /api/identify {guestKey} → 200 {ok:true}
 * V4: guest ∈ 28 lista fechada. ⊥ self-register.
 */
import { NextResponse } from "next/server";
import { findGuest } from "@/lib/get-guests";
import { setGuestSession } from "@/lib/session";

export async function POST(req: Request) {
  let body: { guestKey?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const guestKey = typeof body.guestKey === "string" ? body.guestKey : "";
  if (!guestKey) {
    return NextResponse.json({ error: "guestKey requerido" }, { status: 400 });
  }

  const guest = await findGuest(guestKey);
  if (!guest) {
    return NextResponse.json(
      { error: "Não encontramos esse nome na nossa lista ♥" },
      { status: 404 },
    );
  }

  await setGuestSession({
    guestKey: guest.guestKey,
    guestId: guest.id,
    name: guest.name,
  });

  return NextResponse.json({ ok: true, name: guest.name });
}
