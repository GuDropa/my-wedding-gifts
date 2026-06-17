/**
 * Sessão admin — cookie HMAC separado (V11/C9).
 * Credenciais: ADMIN_USER + ADMIN_PASS_HASH (sha256 hex de senha).
 */
import { cookies } from "next/headers";

const COOKIE_NAME = "gg_admin";
const COOKIE_MAX_AGE = 60 * 60 * 12; // 12h

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET ausente ou curto");
  return s;
}

let _key: CryptoKey | null = null;
async function key(): Promise<CryptoKey> {
  if (_key) return _key;
  _key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret() + ":admin"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return _key;
}

export interface AdminSession {
  user: string;
  exp: number;
}

async function sign(payload: string): Promise<string> {
  return b64url(await crypto.subtle.sign("HMAC", await key(), enc.encode(payload)));
}

async function encode(s: AdminSession): Promise<string> {
  const p = b64url(enc.encode(JSON.stringify(s)));
  return `${p}.${await sign(p)}`;
}

async function decode(token: string): Promise<AdminSession | null> {
  const [p, sig] = token.split(".");
  if (!p || !sig) return null;
  const ok = await crypto.subtle.verify(
    "HMAC",
    await key(),
    b64urlDecode(sig) as unknown as ArrayBuffer,
    enc.encode(p),
  );
  if (!ok) return null;
  try {
    const parsed = JSON.parse(dec.decode(b64urlDecode(p))) as AdminSession;
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyAdminCredentials(user: string, pass: string): Promise<boolean> {
  const expectedUser = process.env.ADMIN_USER ?? "";
  const expectedHash = process.env.ADMIN_PASS_HASH ?? "";
  if (!expectedUser || !expectedHash) return false;
  if (user !== expectedUser) return false;
  const givenHash = await sha256Hex(pass);
  // comparação simples por igualdade — entropia já foi reduzida em sha256
  return givenHash === expectedHash;
}

export async function setAdminSession(user: string): Promise<void> {
  const token = await encode({ user, exp: Date.now() + COOKIE_MAX_AGE * 1000 });
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  const t = jar.get(COOKIE_NAME)?.value;
  if (!t) return null;
  return decode(t);
}

export async function clearAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export const ADMIN_COOKIE = COOKIE_NAME;
export const decodeAdminToken = decode;
