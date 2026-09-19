import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getJwtSecretBytes } from "@/lib/jwt-secret";

export async function middleware(req: NextRequest) {
  const response = NextResponse.next();

  const cookieToken = req.cookies.get("auth_token")?.value;
  if (cookieToken) {
    try {
      await jwtVerify(cookieToken, getJwtSecretBytes());
      return response;
    } catch {
    }
  }

  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      await jwtVerify(token, getJwtSecretBytes());
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
