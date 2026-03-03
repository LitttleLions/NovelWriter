import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword, createToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "E-Mail und Passwort erforderlich" }, { status: 400 });
    }

    const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "E-Mail bereits registriert" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const result = await query(
      "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name",
      [email, passwordHash, name || null]
    );

    const user = result.rows[0];
    const token = await createToken(user.id, user.email);

    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Registrierung fehlgeschlagen" }, { status: 500 });
  }
}
