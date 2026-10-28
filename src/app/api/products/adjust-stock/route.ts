import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { adjustStock, logAudit } from "@/services/dataService";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { productId, quantityChange, type, reason } = await req.json();

    if (!productId || quantityChange === undefined || !type || !reason) {
      return NextResponse.json(
        { error: "Product, quantity change, adjustment type, and reason are required" },
        { status: 400 }
      );
    }

    const result = await adjustStock(
      productId,
      Number(quantityChange),
      type,
      reason,
      session.name || "Admin"
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await logAudit({
      adminEmail: session.email,
      action: "STOCK_ADJUSTMENT",
      entityType: "Product",
      entityId: productId,
      details: `${type}: ${quantityChange} units. Reason: ${reason}. New stock: ${result.newStock}`,
    });

    return NextResponse.json({ success: true, newStock: result.newStock });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to adjust stock" }, { status: 500 });
  }
}
