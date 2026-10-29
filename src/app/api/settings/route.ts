import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getShopSettings, updateShopSettings, logAudit } from "@/services/dataService";

export async function GET() {
  try {
    const settings = await getShopSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const updates = await req.json();
    if (updates.timeZone !== undefined) {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: updates.timeZone });
      } catch {
        return NextResponse.json({ error: "Enter a valid IANA time zone, such as Asia/Karachi." }, { status: 400 });
      }
    }
    if (updates.theme !== undefined && !["sky", "emerald", "violet"].includes(updates.theme)) {
      return NextResponse.json({ error: "Select one of the available color themes." }, { status: 400 });
    }
    if (
      updates.shopLogo !== undefined &&
      updates.shopLogo !== "" &&
      (typeof updates.shopLogo !== "string" ||
        !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(updates.shopLogo) ||
        updates.shopLogo.length > 2_800_000)
    ) {
      return NextResponse.json(
        { error: "Logo must be a PNG, JPEG, or WebP image smaller than 2 MB." },
        { status: 400 }
      );
    }

    const settings = await updateShopSettings(updates);

    await logAudit({
      adminEmail: session.email,
      action: "SETTINGS_UPDATED",
      entityType: "ShopSettings",
      details: "Updated shop configuration and preferences",
    });

    return NextResponse.json({ success: true, settings });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update settings" },
      { status: 500 }
    );
  }
}
