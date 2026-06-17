/**
 * PUT /api/admin/gifts/[id] → update
 * DELETE /api/admin/gifts/[id] → soft-delete (Active=false)
 */
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";

function configured() {
  return !!process.env.AIRTABLE_API_KEY && !!process.env.AIRTABLE_BASE_ID;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getAdminSession();
  if (!s) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!configured()) return NextResponse.json({ error: "Airtable não configurado" }, { status: 503 });

  const { id } = await params;
  type Body = {
    name?: string;
    description?: string;
    priceCents?: number;
    limit?: number;
    tint?: string;
  };
  const body = (await req.json().catch(() => ({}))) as Body;

  const { TABLES } = await import("@/lib/airtable/schema");
  const Airtable = (await import("airtable")).default;
  const at = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);

  const fields: Record<string, string | number | boolean> = {};
  if (body.name !== undefined) fields.Name = body.name;
  if (body.description !== undefined) fields.Description = body.description;
  if (body.priceCents !== undefined) fields.PriceCents = body.priceCents;
  if (body.limit !== undefined) fields.Limit = body.limit;
  if (body.tint !== undefined) fields.Tint = body.tint;

  await at(TABLES.gifts).update([{ id, fields }]);

  const { invalidateGiftCache } = await import("@/lib/airtable/client");
  invalidateGiftCache();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getAdminSession();
  if (!s) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!configured()) return NextResponse.json({ error: "Airtable não configurado" }, { status: 503 });

  const { id } = await params;
  const { TABLES } = await import("@/lib/airtable/schema");
  const Airtable = (await import("airtable")).default;
  const at = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);

  // Soft delete: Active=false (preserva histórico de Purchases)
  await at(TABLES.gifts).update([{ id, fields: { Active: false } }]);

  const { invalidateGiftCache } = await import("@/lib/airtable/client");
  invalidateGiftCache();
  return NextResponse.json({ ok: true, soft: true });
}
