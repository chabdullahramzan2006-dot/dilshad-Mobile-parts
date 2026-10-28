import { NextRequest, NextResponse } from "next/server";
import { getSession, hashPassword, verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { getAdminByEmail, updateAdminPassword, logAudit } from "@/services/dataService";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters long." }, { status: 400 });
    }

    const admin = await getAdminByEmail(session.email);
    if (!admin) {
      return NextResponse.json({ error: "Admin not found." }, { status: 404 });
    }

    // Verify current password if provided (unless first-time mandatory password change)
    if (!admin.mustChangePassword && currentPassword) {
      const isMatch = await verifyPassword(currentPassword, admin.passwordHash);
      if (!isMatch) {
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
      }
    }

    const newHash = await hashPassword(newPassword);
    await updateAdminPassword(admin._id!, newHash);

    // Refresh session cookie with mustChangePassword = false
    const token = await createSessionToken({
      adminId: admin._id!,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      mustChangePassword: false,
    });
    await setSessionCookie(token);

    await logAudit({
      adminEmail: admin.email,
      action: "PASSWORD_CHANGED",
      entityType: "Admin",
      entityId: admin._id,
      details: "Password successfully updated",
    });

    return NextResponse.json({ success: true, message: "Password updated successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update password." }, { status: 500 });
  }
}
