import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getBrands, createBrand, deleteBrand } from "@/services/dataService";

export async function GET() {
  try {
    const brands = await getBrands();
    return NextResponse.json({ success: true, brands });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, description } = await req.json();
    if (!name) return NextResponse.json({ error: "Brand name is required" }, { status: 400 });

    const newBrand = await createBrand(name, description);
    return NextResponse.json({ success: true, brand: newBrand });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await deleteBrand(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
