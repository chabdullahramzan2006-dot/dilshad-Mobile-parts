import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { addCustomerPayment, logAudit } from "@/services/dataService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { amount, paymentMethod, date, reference, notes } = body;

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Valid payment amount is required" }, { status: 400 });
    }

    const result = await addCustomerPayment({
      customerId: id,
      amount: Number(amount),
      paymentMethod: paymentMethod || "Cash",
      date,
      reference,
      notes,
      receivedBy: session.name || "Admin",
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await logAudit({
      adminEmail: session.email,
      action: "KHATA_PAYMENT_COLLECTED",
      entityType: "Customer",
      entityId: id,
      details: `Collected Rs. ${amount} via ${paymentMethod || "Cash"}. New balance: Rs. ${result.newBalance}`,
    });

    return NextResponse.json({ success: true, newBalance: result.newBalance });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to process payment" }, { status: 500 });
  }
}
