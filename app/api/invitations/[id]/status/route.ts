import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { updateInvitationStatus } from "@/lib/db/queries";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const { status } = body as { status: string };

  const validStatuses = [
    "sent",
    "opened",
    "responded",
    "confirmed",
    "pre_interview",
    "recorded",
    "aired",
  ];

  if (!validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
      { status: 400 }
    );
  }

  const updated = await updateInvitationStatus(id, status);

  if (!updated) {
    return NextResponse.json(
      { error: "Invitation not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(updated);
}
