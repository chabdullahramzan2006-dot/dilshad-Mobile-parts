import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSaleById } from "@/services/dataService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const sale = await getSaleById(id);
    if (!sale) return NextResponse.json({ error: "Sale not found" }, { status: 404 });

    return NextResponse.json({ success: true, sale });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
