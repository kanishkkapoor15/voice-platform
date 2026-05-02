import { generateText } from "ai";
import { primaryModel } from "@/lib/ai/client";
import { getCaseById, updateCase } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { sendInviteEmail } from "@/lib/email/invite-template";

export async function runOutreachAgent(caseId: string): Promise<void> {
  const c = await getCaseById(caseId);

  if (!c) throw new Error(`Case ${caseId} not found`);
  if (!c.approvedAt) {
    throw new Error(
      `Case ${caseId} has not been approved. Cannot send invite.`
    );
  }
  if (!c.contactPathway) {
    console.warn(
      `Case ${caseId} has no contact pathway. Flagging for manual action.`
    );
    await updateCase(caseId, { pipelineStatus: "approved" });
    return;
  }

  const { text: emailBody } = await generateText({
    model: primaryModel,
    prompt: `Write a warm, personal invitation email for a podcast
called Voice Platform that gives vulnerable communities a platform
to share their stories.

Case context: ${c.summary}
Guest readiness: ${c.guestReadiness}
Category: ${c.category}

The email must:
- Be warm and human, not corporate
- Explain who we are and why we reached out to them specifically
- Make absolutely clear participation is voluntary
- Describe what appearing on the podcast involves (recorded conversation,
  ~45 minutes, guest approves content before release)
- Include clear opt-out: just don't reply, no explanation needed
- Set a 2 week response window
${
  c.guestReadiness === "first_time"
    ? "- Add an extra reassuring paragraph for someone who has never spoken publicly before"
    : ""
}

Subject line should be warm and specific to their story.
Sign off as "The Voice Platform Team".`,
  });

  await sendInviteEmail({
    to: c.contactPathway,
    body: emailBody,
    caseTitle: c.title ?? "",
  });

  await db.insert(invitations).values({
    caseId,
    status: "sent",
    inviteEmailBody: emailBody,
    sentAt: new Date(),
  });
}
