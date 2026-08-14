import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/constants";

export type UserRoleValue = "OWNER" | "STAFF";

export type SessionPayload = {
  userId: string;
  orgId: string;
  email: string;
  name: string;
  role: UserRoleValue;
  orgName: string;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifyToken<T>(token: string) {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as T;
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = await verifyToken<SessionPayload>(token);
    return {
      ...payload,
      role: payload.role === "OWNER" ? "OWNER" : "STAFF",
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function homePathForRole(role: UserRoleValue) {
  return role === "OWNER" ? "/admin" : "/workspace";
}
