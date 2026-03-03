import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || "romanforge_fallback_secret_2026_x99";
  return new TextEncoder().encode(secret);
}

export async function middleware(req: NextRequest) {
  const response = NextResponse.next();

  const cookieToken = req.cookies.get("auth_token")?.value;
  if (cookieToken) {
    try {
      await jwtVerify(cookieToken, getJwtSecret());
      return response;
    } catch {
    }
  }

  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      await jwtVerify(token, getJwtSecret());
      response.cookies.set("auth_token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
      return response;
    } catch {
    }
  }

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
