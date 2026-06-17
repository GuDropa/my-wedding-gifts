/**
 * POST /api/track/view — registra que o convidado da sessão atual visualizou
 * a lista. V15: marca uma vez (no-op se já viewed).
 */
import { NextResponse } from "next/server";
import { getGuestSession } from "@/lib/session";

export async function POST() {
  const session = await getGuestSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const hasAirtable = !!process.env.AIRTABLE_API_KEY && !!process.env.AIRTABLE_BASE_ID;
  if (!hasAirtable) {
    return NextResponse.json({ ok: true, mock: true });
  }

  const { findGuestByKey, markGuestViewed } = await import("@/lib/airtable/client");
  const guest = await findGuestByKey(session.guestKey);
  if (!guest) return NextResponse.json({ error: "Convidado não encontrado" }, { status: 404 });
  if (guest.Viewed) return NextResponse.json({ ok: true, alreadyTracked: true });

  await markGuestViewed(guest.id);
  return NextResponse.json({ ok: true });
}
