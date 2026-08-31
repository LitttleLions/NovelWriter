import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import { query } from "./db";
import { ensureAiSettingsSchema } from "./ai-settings";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || "romanforge_fallback_secret_2026_x99";
  return new TextEncoder().encode(secret);
}


export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(userId: number, email: string): Promise<string> {
  return new SignJWT({ userId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as { userId: number; email: string };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  await ensureAiSettingsSchema();
  let token: string | undefined;

  try {
    const cookieStore = await cookies();
    token = cookieStore.get("auth_token")?.value;
  } catch {}

  if (!token) {
    try {
      const headerStore = await headers();
      const authHeader = headerStore.get("authorization") || headerStore.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    } catch {}
  }

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const result = await query("SELECT id, email, name, is_admin FROM users WHERE id = $1", [
    payload.userId,
  ]);
  return result.rows[0] || null;
}

export function isAdmin(user: { email?: string; is_admin?: boolean } | null): boolean {
  if (!user) return false;
  const configuredEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(user.is_admin) || configuredEmails.includes(String(user.email || "").toLowerCase());
}
