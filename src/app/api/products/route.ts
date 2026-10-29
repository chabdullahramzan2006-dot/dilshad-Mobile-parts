import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProducts, createProduct, logAudit, seedInitialDatabase } from "@/services/dataService";

export async function GET(req: NextRequest) {
  try {
    await seedInitialDatabase();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;
    const brand = searchParams.get("brand") || undefined;
    const lowStock = searchParams.get("lowStock") === "true";
    const outOfStock = searchParams.get("outOfStock") === "true";

    const products = await getProducts({ search, category, brand, lowStock, outOfStock });
    return NextResponse.json(
      { success: true, products },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (!body.name || !body.sku || !body.category || !body.brand) {
      return NextResponse.json({ error: "Name, SKU, category, and brand are required" }, { status: 400 });
    }

    const newProduct = await createProduct(body);

    await logAudit({
      adminEmail: session.email,
      action: "PRODUCT_CREATED",
      entityType: "Product",
      entityId: newProduct._id,
      details: `Created product: ${newProduct.name} (${newProduct.sku})`,
    });

    return NextResponse.json({ success: true, product: newProduct });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create product" }, { status: 500 });
  }
}
