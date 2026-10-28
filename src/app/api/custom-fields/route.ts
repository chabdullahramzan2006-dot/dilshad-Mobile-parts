import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCustomFields, createCustomField, deleteCustomField } from "@/services/dataService";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType") || undefined;
    const fields = await getCustomFields(entityType);
    return NextResponse.json({ success: true, fields });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    if (!body.entityType || !body.fieldName || !body.fieldLabel || !body.fieldType) {
      return NextResponse.json({ error: "Entity type, field name, label, and type are required." }, { status: 400 });
    }

    const field = await createCustomField(body);
    return NextResponse.json({ success: true, field });
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
    if (!id) return NextResponse.json({ error: "Field ID is required." }, { status: 400 });

    await deleteCustomField(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
