import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSuppliers, createSupplier, logAudit } from "@/services/dataService";

export async function GET() {
  try {
    const suppliers = await getSuppliers();
    return NextResponse.json({ success: true, suppliers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    if (!body.name || !body.phone) {
      return NextResponse.json({ error: "Supplier name and phone are required" }, { status: 400 });
    }

    const supplier = await createSupplier(body);

    await logAudit({
      adminEmail: session.email,
      action: "SUPPLIER_CREATED",
      entityType: "Supplier",
      entityId: supplier._id,
      details: `Created supplier: ${supplier.name}`,
    });

    return NextResponse.json({ success: true, supplier });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
