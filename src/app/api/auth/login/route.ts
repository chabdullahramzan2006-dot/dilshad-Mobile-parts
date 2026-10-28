import { NextRequest, NextResponse } from "next/server";
import {
  checkLoginRateLimit,
  recordLoginAttempt,
  verifyPassword,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";
import { getAdminByEmail, logAudit, seedInitialDatabase } from "@/services/dataService";

export async function POST(req: NextRequest) {
  try {
    await seedInitialDatabase();
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "";
    const rateLimitCheck = checkLoginRateLimit(email.toLowerCase().trim());

    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed login attempts. Please wait ${rateLimitCheck.waitSeconds} seconds before trying again.`,
        },
        { status: 429 }
      );
    }

    const admin = await getAdminByEmail(email);
    if (!admin) {
      recordLoginAttempt(email.toLowerCase().trim(), false);
      await logAudit({
        adminEmail: email,
        action: "LOGIN_FAILED",
        entityType: "Admin",
        details: "Invalid email attempt",
        ipAddress: ip,
        userAgent,
      });
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const isValid = await verifyPassword(password, admin.passwordHash);
    if (!isValid) {
      recordLoginAttempt(email.toLowerCase().trim(), false);
      await logAudit({
        adminEmail: email,
        action: "LOGIN_FAILED",
        entityType: "Admin",
        details: "Incorrect password attempt",
        ipAddress: ip,
        userAgent,
      });
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    recordLoginAttempt(email.toLowerCase().trim(), true);

    const token = await createSessionToken({
      adminId: admin._id || "admin",
      email: admin.email,
      name: admin.name,
      role: admin.role,
      mustChangePassword: admin.mustChangePassword,
    });

    await setSessionCookie(token);

    await logAudit({
      adminEmail: admin.email,
      action: "LOGIN_SUCCESS",
      entityType: "Admin",
      entityId: admin._id,
      details: "Successful admin login",
      ipAddress: ip,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        mustChangePassword: admin.mustChangePassword,
      },
    });
  } catch (error: any) {
    console.error("Login API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
