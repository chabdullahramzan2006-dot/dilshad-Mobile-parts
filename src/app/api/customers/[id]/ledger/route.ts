import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCustomerById, getCustomerLedger } from "@/services/dataService";

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

    const ledger = await getCustomerLedger(id);
    return NextResponse.json({
      success: true,
      customer,
      ledger,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
