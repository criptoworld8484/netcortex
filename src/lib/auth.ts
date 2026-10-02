import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { one, run } from "./db";

export const SESSION_COOKIE = "nc_session";
const encoder = new TextEncoder();

function getSecret(): string {
  const row = one<{ value: string }>("SELECT value FROM settings WHERE key = 'auth_secret'");
  if (row) return row.value;
  const secret = randomBytes(32).toString("hex");
  run("INSERT INTO settings (key, value) VALUES ('auth_secret', ?)", secret);
  return secret;
}

export function hasPassword(): boolean {
  return !!one("SELECT value FROM settings WHERE key = 'auth_hash'");
}

export async function setPassword(pw: string): Promise<void> {
  const hash = await bcrypt.hash(pw, 10);
  run(
    "INSERT INTO settings (key, value) VALUES ('auth_hash', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    hash
  );
}

export function verifyPassword(pw: string): boolean {
  const row = one<{ value: string }>("SELECT value FROM settings WHERE key = 'auth_hash'");
  if (!row) return false;
  return bcrypt.compareSync(pw, row.value);
}

export async function createSession(): Promise<void> {
  const jwt = await new SignJWT({ sub: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(encoder.encode(getSecret()));
  const store = await cookies();
  store.set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, encoder.encode(getSecret()));
    return true;
  } catch {
    return false;
  }
}

export async function requireAuth(): Promise<void> {
  if (!(await getSession())) throw new Error("Unauthorized");
}
