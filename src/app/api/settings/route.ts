import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getShopSettings, updateShopSettings, logAudit } from "@/services/dataService";

export async function GET() {
  try {
    const settings = await getShopSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const updates = await req.json();
    const settings = await updateShopSettings(updates);

    await logAudit({
      adminEmail: session.email,
      action: "SETTINGS_UPDATED",
      entityType: "ShopSettings",
      details: "Updated shop configuration and preferences",
    });

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
