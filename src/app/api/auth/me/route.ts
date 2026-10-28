import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAdminByEmail, getShopSettings, seedInitialDatabase } from "@/services/dataService";

export async function GET() {
  await seedInitialDatabase();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const admin = await getAdminByEmail(session.email);
  const settings = await getShopSettings();

  return NextResponse.json({
    authenticated: true,
    user: {
      id: admin?._id || session.adminId,
      name: admin?.name || session.name,
      email: admin?.email || session.email,
      role: admin?.role || session.role,
      mustChangePassword: admin?.mustChangePassword || false,
    },
    settings,
  });
}
