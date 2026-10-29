import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSuppliers, createSupplier, deleteSupplier, logAudit } from "@/services/dataService";

export async function GET() {
  try {
    const suppliers = await getSuppliers();
    return NextResponse.json({ success: true, suppliers });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load suppliers" },
      { status: 500 }
    );
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
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create supplier" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Supplier ID is required" }, { status: 400 });

    const result = await deleteSupplier(id);
    if (!result.success) {
      const status = result.error === "Supplier not found." ? 404 : 409;
      return NextResponse.json({ error: result.error }, { status });
    }

    await logAudit({
      adminEmail: session.email,
      action: "SUPPLIER_DELETED",
      entityType: "Supplier",
      entityId: id,
      details: `Deleted supplier: ${id}`,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete supplier" },
      { status: 500 }
    );
  }
}
