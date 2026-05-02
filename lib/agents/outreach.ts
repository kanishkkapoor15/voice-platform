import { generateText } from "ai";
import { primaryModel } from "@/lib/ai/client";
import { Resend } from "resend";
import { getCaseById, insertInvitation } from "@/lib/db/queries";
import type { Invitation } from "@/lib/db/schema";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function runOutreachAgent(caseId: string): Promise<Invitation> {
  const caseRecord = await getCaseById(caseId);
  if (!caseRecord) throw new Error(`Case ${caseId} not found`);

  if (!caseRecord.approvedAt) {
    throw new Error(
      `HARD RULE VIOLATION: Case ${caseId} has not been approved. approvedAt is null. Outreach cannot proceed without explicit editorial approval.`
    );
  }

  if (!caseRecord.contactPathway) {
    console.warn(
      `Case ${caseId}: No contact pathway found. Flagging for manual editorial action.`
    );
    throw new Error(
      `Case ${caseId} has no contact pathway. Manual editorial action required.`
    );
  }

  const firstTimeExtra = caseRecord.guestReadiness === "first_time"
    ? "\nIMPORTANT: This person has not appeared on a podcast before. Include an extra paragraph of reassurance explaining what the experience is like, that they will have full editorial control over their segment, and that a pre-interview call will happen first."
    : "";

  const { text: emailBody } = await generateText({
    model: primaryModel,
    prompt: `You are drafting an invitation email for Voice Platform, an Irish podcast that amplifies stories from vulnerable, challenged, and survivor communities.

Draft a warm, human invitation email for this potential guest:

Name/Case: ${caseRecord.title}
Summary: ${caseRecord.summary}
Category: ${caseRecord.category}
Region: ${caseRecord.region}
Guest Readiness: ${caseRecord.guestReadiness}
${firstTimeExtra}

TONE AND CONTENT RULES:
- Warm and human — not corporate or formulaic
- Explain who Voice Platform is and why this person's story matters
- Make absolutely clear that participation is entirely voluntary
- Describe what appearing on the podcast involves (pre-interview, recording, editorial review)
- Include clear opt-out instructions
- Set a 2-week response window
- Sign off as "The Voice Platform Team"

Do NOT include a subject line — just the email body.`,
  });

  const episodeMatch = caseRecord.episodeMatches
    ? (JSON.parse(caseRecord.episodeMatches as string) as Array<{ episodeId: string }>)[0]
    : null;

  await getResend().emails.send({
    from: "Voice Platform <invite@voiceplatform.com>",
    to: caseRecord.contactPathway,
    subject: `Voice Platform — Invitation to Share Your Story`,
    text: emailBody,
  });

  const invitation = await insertInvitation({
    caseId,
    episodeId: episodeMatch?.episodeId ?? null,
    status: "sent",
    inviteEmailBody: emailBody,
    sentAt: new Date(),
  });

  return invitation;
}
