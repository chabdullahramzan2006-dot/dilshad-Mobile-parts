import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getExpenses, createExpense, deleteExpense, logAudit } from "@/services/dataService";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const expenses = await getExpenses({ category, startDate, endDate });
    return NextResponse.json({ success: true, expenses });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    if (!body.title || !body.category || !body.amount) {
      return NextResponse.json({ error: "Title, category, and amount are required." }, { status: 400 });
    }

    const expense = await createExpense(body);

    await logAudit({
      adminEmail: session.email,
      action: "EXPENSE_CREATED",
      entityType: "Expense",
      entityId: expense._id,
      details: `Expense: ${expense.title} - Rs. ${expense.amount} (${expense.category})`,
    });

    return NextResponse.json({ success: true, expense });
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
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    await deleteExpense(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
