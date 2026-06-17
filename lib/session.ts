/**
 * Sessão de convidado — cookie HMAC-assinado via Web Crypto (Edge + Node).
 * Payload: { guestKey, guestId, name, exp }.
 * V1: rota ≠ `/` & ≠ `/admin/*` → exige sessão.
 */
import { cookies } from "next/headers";

const COOKIE_NAME = "gg_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

export interface GuestSession {
  guestKey: string;
  guestId: string;
  name: string;
  exp: number; // unix ms
}

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET ausente ou curto demais (≥ 16 chars)");
  }
  return s;
}

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

let _key: CryptoKey | null = null;
async function key(): Promise<CryptoKey> {
  if (_key) return _key;
  _key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return _key;
}

async function sign(payloadB64: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await key(), enc.encode(payloadB64));
  return b64url(sig);
}

async function verify(payloadB64: string, sigB64: string): Promise<boolean> {
  const sig = b64urlDecode(sigB64);
  return crypto.subtle.verify(
    "HMAC",
    await key(),
    sig as unknown as ArrayBuffer,
    enc.encode(payloadB64),
  );
}

export async function encodeSession(s: GuestSession): Promise<string> {
  const payloadB64 = b64url(enc.encode(JSON.stringify(s)));
  const sig = await sign(payloadB64);
  return `${payloadB64}.${sig}`;
}

export async function decodeSession(token: string): Promise<GuestSession | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (!(await verify(payloadB64, sig))) return null;
  try {
    const parsed = JSON.parse(dec.decode(b64urlDecode(payloadB64))) as GuestSession;
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setGuestSession(session: Omit<GuestSession, "exp">): Promise<void> {
  const full: GuestSession = {
    ...session,
    exp: Date.now() + COOKIE_MAX_AGE * 1000,
  };
  const token = await encodeSession(full);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function getGuestSession(): Promise<GuestSession | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return decodeSession(raw);
}

export async function clearGuestSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export const SESSION_COOKIE = COOKIE_NAME;
