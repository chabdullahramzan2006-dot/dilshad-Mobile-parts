import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSales, createSale, logAudit } from "@/services/dataService";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const customerId = searchParams.get("customerId") || undefined;
    const paymentStatus = searchParams.get("paymentStatus") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const sales = await getSales({ search, customerId, paymentStatus, startDate, endDate });
    return NextResponse.json({ success: true, sales });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: "At least one item is required for the sale" }, { status: 400 });
    }

    const result = await createSale(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await logAudit({
      adminEmail: session.email,
      action: "SALE_COMPLETED",
      entityType: "Sale",
      entityId: result.sale?._id,
      details: `Sale #${result.sale?.invoiceNumber} to ${result.sale?.customerName}. Total: Rs. ${result.sale?.totalAmount}, Paid: Rs. ${result.sale?.paidAmount}`,
    });

    return NextResponse.json({ success: true, sale: result.sale });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to process sale" }, { status: 500 });
  }
}
