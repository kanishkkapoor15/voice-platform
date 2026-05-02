import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { getCaseById, approveCase } from "@/lib/db/queries";
import { runOutreachAgent } from "@/lib/agents/outreach";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    const c = await getCaseById(id);

    if (!c) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    if (!c.safetyCleared) {
      return NextResponse.json(
        { error: "Case has not passed safety screening" },
        { status: 400 }
      );
    }

    await approveCase(id);
    await runOutreachAgent(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Approve error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to approve case" },
      { status: 500 }
    );
  }
}
