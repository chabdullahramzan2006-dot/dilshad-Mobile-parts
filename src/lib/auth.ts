import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { IAdmin } from "@/types";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dilshad-mobile-parts-super-secret-jwt-key-2026-secure"
);

export const AUTH_COOKIE_NAME = "dmp_auth_session";

// Hash password with bcryptjs
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Compare plain password against hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Create signed session JWT token
export async function createSessionToken(payload: {
  adminId: string;
  email: string;
  name: string;
  role: string;
  mustChangePassword?: boolean;
}): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

// Verify session JWT token
export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as {
      adminId: string;
      email: string;
      name: string;
      role: string;
      mustChangePassword?: boolean;
    };
  } catch (error) {
    return null;
  }
}

// Get current session from Next.js server context
export async function getSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch (error) {
    return null;
  }
}

// Set HTTP-only session cookie
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

// Clear session cookie
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

// In-Memory Login Rate Limiter (Max 5 attempts in 15 minutes)
interface RateLimitRecord {
  attempts: number;
  blockedUntil?: number;
}
const loginRateLimitStore = new Map<string, RateLimitRecord>();

export function checkLoginRateLimit(identifier: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const record = loginRateLimitStore.get(identifier);

  if (!record) {
    return { allowed: true };
  }

  if (record.blockedUntil && record.blockedUntil > now) {
    const waitSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, waitSeconds };
  }

  return { allowed: true };
}

export function recordLoginAttempt(identifier: string, success: boolean) {
  const now = Date.now();
  const record = loginRateLimitStore.get(identifier) || { attempts: 0 };

  if (success) {
    loginRateLimitStore.delete(identifier);
    return;
  }

  record.attempts += 1;
  if (record.attempts >= 5) {
    record.blockedUntil = now + 15 * 60 * 1000; // 15 mins block
    record.attempts = 0;
  }
  loginRateLimitStore.set(identifier, record);
}
