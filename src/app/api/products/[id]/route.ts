import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProductById, updateProduct, deleteProduct, logAudit } from "@/services/dataService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const product = await getProductById(id);
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    return NextResponse.json({ success: true, product });
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
    const updated = await updateProduct(id, body);
    if (!updated) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    await logAudit({
      adminEmail: session.email,
      action: "PRODUCT_UPDATED",
      entityType: "Product",
      entityId: id,
      details: `Updated product ${updated.name}`,
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const success = await deleteProduct(id, true);
    if (!success) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    await logAudit({
      adminEmail: session.email,
      action: "PRODUCT_ARCHIVED",
      entityType: "Product",
      entityId: id,
      details: "Archived product",
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
