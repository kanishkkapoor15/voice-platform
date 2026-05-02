import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { getCaseById, updateCase } from "@/lib/db/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const caseRecord = await getCaseById(id);

  if (!caseRecord) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  return NextResponse.json(caseRecord);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const updated = await updateCase(id, body);

  if (!updated) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
