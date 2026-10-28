import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { exportDatabaseBackup, restoreDatabaseBackup, logAudit } from "@/services/dataService";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const backupJson = await exportDatabaseBackup();
    return NextResponse.json({ success: true, backupJson });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { backupJson } = await req.json();
    if (!backupJson) return NextResponse.json({ error: "Backup JSON is required" }, { status: 400 });

    const result = await restoreDatabaseBackup(backupJson);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });

    await logAudit({
      adminEmail: session.email,
      action: "DATABASE_RESTORED",
      entityType: "System",
      details: "Full database restore from JSON backup",
    });

    return NextResponse.json({ success: true, message: "Database restored successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
