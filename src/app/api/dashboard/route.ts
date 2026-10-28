import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDashboardStats, seedInitialDatabase } from "@/services/dataService";

export async function GET() {
  try {
    await seedInitialDatabase();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await getDashboardStats();
    return NextResponse.json({ success: true, ...stats });
  } catch (error: any) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: error.message || "Failed to load dashboard data." }, { status: 500 });
  }
}
