import { NextResponse } from "next/server";
import { clearAdminSession } from "@/lib/admin-session";

export async function POST(req: Request) {
  await clearAdminSession();
  return NextResponse.redirect(new URL("/admin/login", req.url), { status: 303 });
}
