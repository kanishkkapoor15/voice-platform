import { generateObject } from "ai";
import { reasoningModel } from "@/lib/ai/client";
import { z } from "zod";
import { updateCase } from "@/lib/db/queries";
import { insertHumanReview } from "@/lib/db/queries";
import type { EnrichedCase, SafetyResult } from "./types";

const safetySchema = z.object({
  acuteDistress: z
    .boolean()
    .describe("Language suggesting person is in immediate danger"),
  activeLegalProceedings: z
    .boolean()
    .describe("Mentions ongoing court case that precludes public discussion"),
  noPublicDisclosure: z
    .boolean()
    .describe("Person has not chosen to go public with their story"),
  minorInvolved: z
    .boolean()
    .describe("Any mention of a person under 18"),
  overallSafe: z
    .boolean()
    .describe("True ONLY if all four flags above are false"),
  flagReason: z
    .string()
    .describe("Required if overallSafe is false, blank otherwise"),
});

export async function runSafetyScreeningAgent(
  enrichedCase: EnrichedCase
): Promise<SafetyResult> {
  const { object: screening } = await generateObject({
    model: reasoningModel,
    schema: safetySchema,
    prompt: `You are a safety screening agent for a podcast platform that invites vulnerable and survivor communities to share their stories. Analyse the following case for safety concerns.

You MUST flag as unsafe if ANY of these conditions are true:
- The person appears to be in acute distress or immediate danger
- There are active legal proceedings that would preclude public discussion
- The person has not publicly disclosed their story
- Any person under 18 is involved in ANY capacity

Case Title: ${enrichedCase.title}
Case Summary: ${enrichedCase.summary}
Category: ${enrichedCase.issueCategory}
Region: ${enrichedCase.region}
Timeline: ${enrichedCase.timeline}
Current Status: ${enrichedCase.currentStatus}
Has Minor Involved (from enrichment): ${enrichedCase.hasMinorInvolved}
Source URL: ${enrichedCase.sourceUrl}

Respond with your safety assessment. overallSafe must be true ONLY if acuteDistress, activeLegalProceedings, noPublicDisclosure, and minorInvolved are ALL false. If any are true, overallSafe must be false and flagReason must explain why.`,
  });

  if (enrichedCase.hasMinorInvolved && !screening.minorInvolved) {
    screening.minorInvolved = true;
    screening.overallSafe = false;
    screening.flagReason = screening.flagReason
      ? `${screening.flagReason}; Minor involvement detected in enrichment stage`
      : "Minor involvement detected in enrichment stage";
  }

  if (!screening.overallSafe) {
    await insertHumanReview(enrichedCase.id, screening.flagReason);
    await updateCase(enrichedCase.id, { pipelineStatus: "human_review" });
    return { safe: false, ...screening };
  }

  await updateCase(enrichedCase.id, {
    safetyCleared: true,
    pipelineStatus: "screened",
  });

  return { safe: true, ...screening };
}
