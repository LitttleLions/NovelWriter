import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword, createToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { credential } = await req.json();

    if (!credential) {
      return NextResponse.json({ error: "Kein Google-Token erhalten" }, { status: 400 });
    }

    const parts = credential.split(".");
    if (parts.length !== 3) {
      return NextResponse.json({ error: "Ungültiges Token-Format" }, { status: 400 });
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8")
    );

    const { email, name, sub: googleId } = payload;

    if (!email) {
      return NextResponse.json({ error: "Keine E-Mail im Google-Token" }, { status: 400 });
    }

    let user;
    const existing = await query("SELECT * FROM users WHERE email = $1", [email]);

    if (existing.rows.length > 0) {
      user = existing.rows[0];
    } else {
      const randomPassword = await hashPassword(
        `google_${googleId}_${Date.now()}_${Math.random()}`
      );
      const result = await query(
        "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name",
        [email, randomPassword, name || email.split("@")[0]]
      );
      user = result.rows[0];
    }

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
    console.error("Google auth error:", error);
    return NextResponse.json({ error: "Google-Anmeldung fehlgeschlagen" }, { status: 500 });
  }
}
