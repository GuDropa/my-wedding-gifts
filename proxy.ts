/**
 * V1: guest session p/ rotas não-públicas.
 * V11: admin session p/ rotas /admin/* (exceto /admin/login).
 */
import { NextRequest, NextResponse } from "next/server";
import { decodeSession, SESSION_COOKIE } from "@/lib/session";
import { decodeAdminToken, ADMIN_COOKIE } from "@/lib/admin-session";

const GUEST_PUBLIC = new Set(["/", "/api/identify", "/api/mp/webhook"]);

function isAdminPath(p: string): boolean {
  return p.startsWith("/admin") || p.startsWith("/api/admin");
}

function isPublicAsset(p: string): boolean {
  return (
    p.startsWith("/_next") ||
    p.startsWith("/assets") ||
    p === "/favicon.ico"
  );
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublicAsset(pathname)) return NextResponse.next();

  // ---------- Admin (V11) ----------
  if (isAdminPath(pathname)) {
    // login & seu endpoint são públicos dentro do espaço admin
    if (pathname === "/admin/login" || pathname === "/api/admin/login") {
      return NextResponse.next();
    }
    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    if (!token) return NextResponse.redirect(new URL("/admin/login", req.url));
    const session = await decodeAdminToken(token);
    if (!session) {
      const res = NextResponse.redirect(new URL("/admin/login", req.url));
      res.cookies.delete(ADMIN_COOKIE);
      return res;
    }
    return NextResponse.next();
  }

  // ---------- Guest (V1) ----------
  if (GUEST_PUBLIC.has(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.redirect(new URL("/", req.url));
  const session = await decodeSession(token);
  if (!session) {
    const res = NextResponse.redirect(new URL("/", req.url));
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets/).*)"],
};
