/**
 * POST /api/admin/gifts → cria novo gift (V11/V2).
 */
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";

export async function POST(req: Request) {
  const s = await getAdminSession();
  if (!s) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    return NextResponse.json({ error: "Airtable não configurado" }, { status: 503 });
  }

  type Body = {
    name?: string;
    description?: string;
    priceCents?: number;
    limit?: number;
    tint?: string;
  };
  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.name || !body.priceCents || !body.limit) {
    return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
  }

  const { TABLES } = await import("@/lib/airtable/schema");
  const Airtable = (await import("airtable")).default;
  const at = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);
  const [created] = await at(TABLES.gifts).create([
    {
      fields: {
        Name: body.name,
        Description: body.description ?? "",
        PriceCents: body.priceCents,
        Limit: body.limit,
        Tint: body.tint ?? "#E4E8DD",
        Active: true,
      },
    },
  ]);

  const { invalidateGiftCache } = await import("@/lib/airtable/client");
  invalidateGiftCache();

  return NextResponse.json({ ok: true, id: created.id });
}
