/**
 * POST /api/admin/login {user,pass} → cookie admin (V11/C9).
 */
import { NextResponse } from "next/server";
import { verifyAdminCredentials, setAdminSession } from "@/lib/admin-session";

export async function POST(req: Request) {
  let body: { user?: string; pass?: string };
  try {
    body = (await req.json()) as { user?: string; pass?: string };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const user = body.user?.trim();
  const pass = body.pass;
  if (!user || !pass) return NextResponse.json({ error: "Faltando credenciais" }, { status: 400 });

  const ok = await verifyAdminCredentials(user, pass);
  if (!ok) return NextResponse.json({ error: "Usuário ou senha incorretos" }, { status: 401 });

  await setAdminSession(user);
  return NextResponse.json({ ok: true });
}
