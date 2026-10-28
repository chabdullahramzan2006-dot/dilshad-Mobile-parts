import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCustomerById, updateCustomer, logAudit } from "@/services/dataService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const customer = await getCustomerById(id);
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const updated = await updateCustomer(id, body);
    if (!updated) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    await logAudit({
      adminEmail: session.email,
      action: "CUSTOMER_UPDATED",
      entityType: "Customer",
      entityId: id,
      details: `Updated customer info for: ${updated.name}`,
    });

    return NextResponse.json({ success: true, customer: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
