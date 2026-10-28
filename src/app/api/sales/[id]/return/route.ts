import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { returnSale, logAudit } from "@/services/dataService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { reason } = await req.json();

    if (!reason) {
      return NextResponse.json({ error: "Return reason is required." }, { status: 400 });
    }

    const result = await returnSale(id, reason);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await logAudit({
      adminEmail: session.email,
      action: "SALE_RETURNED",
      entityType: "Sale",
      entityId: id,
      details: `Returned sale invoice ID: ${id}. Reason: ${reason}`,
    });

    return NextResponse.json({ success: true, message: "Sale return processed successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to process sale return" }, { status: 500 });
  }
}
