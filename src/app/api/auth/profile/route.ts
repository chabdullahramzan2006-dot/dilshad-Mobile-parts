import { NextRequest, NextResponse } from "next/server";
import { getSession, createSessionToken, setSessionCookie } from "@/lib/auth";
import { getAdminByEmail, updateAdminProfile, logAudit } from "@/services/dataService";

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email } = await req.json();
    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }

    const admin = await getAdminByEmail(session.email);
    if (!admin) {
      return NextResponse.json({ error: "Admin not found." }, { status: 404 });
    }

    await updateAdminProfile(admin._id!, name.trim(), email.trim().toLowerCase());

    const token = await createSessionToken({
      adminId: admin._id!,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      role: admin.role,
      mustChangePassword: admin.mustChangePassword,
    });
    await setSessionCookie(token);

    await logAudit({
      adminEmail: email,
      action: "PROFILE_UPDATED",
      entityType: "Admin",
      entityId: admin._id,
      details: `Profile updated: ${name} (${email})`,
    });

    return NextResponse.json({ success: true, message: "Profile updated successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update profile." }, { status: 500 });
  }
}
