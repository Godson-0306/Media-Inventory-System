import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/constants";

type SessionClaims = {
  role?: string;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

async function readSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = getSecret();
  if (!token || !secret) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const claims = payload as SessionClaims;
    return {
      role: claims.role === "OWNER" ? "OWNER" : "STAFF",
    } as const;
  } catch {
    return null;
  }
}

function homeFor(role: "OWNER" | "STAFF") {
  return role === "OWNER" ? "/admin" : "/workspace";
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await readSession(request);
  const authed = Boolean(session);

  if ((pathname === "/" || pathname === "") && authed && session) {
    return NextResponse.redirect(new URL(homeFor(session.role), request.url));
  }

  if (pathname.startsWith("/join") && authed && session) {
    return NextResponse.redirect(new URL(homeFor(session.role), request.url));
  }

  if (pathname.startsWith("/workspace") && !authed) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/admin") && !authed) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/org") && !authed) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/admin") && session?.role === "STAFF") {
    return NextResponse.redirect(new URL("/workspace", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/workspace/:path*", "/admin/:path*", "/join/:path*", "/org/:path*"],
};
