import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCustomers, createCustomer, logAudit } from "@/services/dataService";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const hasBalance = searchParams.get("hasBalance") === "true";
    const isOverdue = searchParams.get("isOverdue") === "true";
    const status = searchParams.get("status") || undefined;

    const customers = await getCustomers({ search, hasBalance, isOverdue, status });
    return NextResponse.json({ success: true, customers });
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
      return NextResponse.json({ error: "Customer name and phone number are required" }, { status: 400 });
    }

    const result = await createCustomer(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await logAudit({
      adminEmail: session.email,
      action: "CUSTOMER_CREATED",
      entityType: "Customer",
      entityId: result.customer?._id,
      details: `Created customer: ${result.customer?.name} (${result.customer?.phone})`,
    });

    return NextResponse.json({ success: true, customer: result.customer });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create customer" }, { status: 500 });
  }
}
