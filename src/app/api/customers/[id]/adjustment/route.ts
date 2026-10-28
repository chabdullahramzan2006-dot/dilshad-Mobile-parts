import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { addManualKhataAdjustment, logAudit } from "@/services/dataService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { type, amount, reason, notes } = await req.json();

    if (!type || !amount || !reason) {
      return NextResponse.json(
        { error: "Adjustment type (DEBIT/CREDIT), amount, and documented reason are required." },
        { status: 400 }
      );
    }

    const result = await addManualKhataAdjustment({
      customerId: id,
      type,
      amount: Number(amount),
      reason,
      notes,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await logAudit({
      adminEmail: session.email,
      action: "KHATA_MANUAL_ADJUSTMENT",
      entityType: "Customer",
      entityId: id,
      details: `${type} adjustment of Rs. ${amount}. Reason: ${reason}. New balance: Rs. ${result.newBalance}`,
    });

    return NextResponse.json({ success: true, newBalance: result.newBalance });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to adjust Khata" }, { status: 500 });
  }
}
