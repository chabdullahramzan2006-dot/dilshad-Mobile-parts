import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDashboardStats, seedInitialDatabase } from "@/services/dataService";

export async function GET(request: Request) {
  try {
    await seedInitialDatabase();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const timeZone = new URL(request.url).searchParams.get("timeZone") || "Asia/Karachi";
    try {
      new Intl.DateTimeFormat("en-US", { timeZone });
    } catch {
      return NextResponse.json({ error: "Invalid time zone." }, { status: 400 });
    }

    const stats = await getDashboardStats(timeZone);
    return NextResponse.json({ success: true, ...stats });
  } catch (error: unknown) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load dashboard data." },
      { status: 500 }
    );
  }
}
