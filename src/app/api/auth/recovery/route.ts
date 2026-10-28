import { NextRequest, NextResponse } from "next/server";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { getAdminByEmail, updateAdminPassword, logAudit } from "@/services/dataService";

export async function POST(req: NextRequest) {
  try {
    const { email, securityAnswer, newPassword } = await req.json();

    if (!email || !securityAnswer || !newPassword) {
      return NextResponse.json({ error: "Email, security answer, and new password are required." }, { status: 400 });
    }

    const admin = await getAdminByEmail(email);
    if (!admin) {
      return NextResponse.json({ error: "Invalid recovery details provided." }, { status: 400 });
    }

    if (!admin.securityAnswerHash) {
      return NextResponse.json({ error: "Security recovery question is not set for this account." }, { status: 400 });
    }

    const isMatch = await verifyPassword(securityAnswer.toLowerCase().trim(), admin.securityAnswerHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Incorrect security answer." }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword);
    await updateAdminPassword(admin._id!, newHash);

    await logAudit({
      adminEmail: admin.email,
      action: "PASSWORD_RECOVERED",
      entityType: "Admin",
      entityId: admin._id,
      details: "Password recovered via security question verification",
    });

    return NextResponse.json({ success: true, message: "Password reset successfully. You can now login with your new password." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to process recovery." }, { status: 500 });
  }
}
