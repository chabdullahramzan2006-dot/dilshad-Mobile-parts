import { NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { logAudit } from "@/services/dataService";

export async function POST() {
  const session = await getSession();
  if (session) {
    await logAudit({
      adminEmail: session.email,
      action: "LOGOUT",
      entityType: "Admin",
      details: "Admin logged out",
    });
  }
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
