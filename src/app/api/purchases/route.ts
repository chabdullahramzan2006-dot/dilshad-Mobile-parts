import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPurchases, createPurchase, logAudit } from "@/services/dataService";

export async function GET() {
  try {
    const purchases = await getPurchases();
    return NextResponse.json({ success: true, purchases });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    if (!body.supplierId || !body.items || body.items.length === 0) {
      return NextResponse.json({ error: "Supplier and purchase items are required" }, { status: 400 });
    }

    const result = await createPurchase(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await logAudit({
      adminEmail: session.email,
      action: "PURCHASE_CREATED",
      entityType: "Purchase",
      entityId: result.purchase?._id,
      details: `Purchase #${result.purchase?.invoiceNumber} from ${result.purchase?.supplierName}. Total: Rs. ${result.purchase?.totalAmount}`,
    });

    return NextResponse.json({ success: true, purchase: result.purchase });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create purchase" }, { status: 500 });
  }
}
