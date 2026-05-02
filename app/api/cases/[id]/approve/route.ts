import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { getCaseById, updateCase } from "@/lib/db/queries";
import { runOutreachAgent } from "@/lib/agents/outreach";

export async function POST(
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

  if (!caseRecord.safetyCleared) {
    return NextResponse.json(
      { error: "Case has not been safety cleared" },
      { status: 400 }
    );
  }

  if (caseRecord.pipelineStatus !== "matched") {
    return NextResponse.json(
      { error: "Case must be in 'matched' status to approve" },
      { status: 400 }
    );
  }

  await updateCase(id, {
    approvedAt: new Date(),
    pipelineStatus: "approved",
  });

  try {
    const invitation = await runOutreachAgent(id);
    return NextResponse.json({ invitation });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Outreach failed",
        note: "Case is approved but outreach could not be sent. Manual action required.",
      },
      { status: 500 }
    );
  }
}
