import { generateObject } from "ai";
import { z } from "zod";
import { reasoningModel } from "@/lib/ai/client";
import { addToHumanReview, updateCase } from "@/lib/db/queries";
import type { EnrichedCase } from "./enrichment";

const SafetyResultSchema = z.object({
  acuteDistress: z.boolean(),
  activeLegalProceedings: z.boolean(),
  noPublicDisclosure: z.boolean(),
  minorInvolved: z.boolean(),
  overallSafe: z.boolean(),
  flagReason: z.string(),
});

export type SafetyResult = z.infer<typeof SafetyResultSchema>;

export async function runSafetyScreeningAgent(
  enrichedCase: EnrichedCase,
  dbCaseId: string
): Promise<{ safe: boolean }> {
  // THIS FUNCTION MUST NEVER BE SKIPPED
  // If it throws, the pipeline runner must catch and halt this case

  const { object } = await generateObject({
    model: reasoningModel,
    schema: SafetyResultSchema,
    prompt: `You are a safety screening agent for a podcast that works
with vulnerable communities. Carefully analyse this case for risks:

Title: ${enrichedCase.title}
Summary: ${enrichedCase.summary}
Category: ${enrichedCase.issueCategory}
Current status: ${enrichedCase.currentStatus}
Has minor involved: ${enrichedCase.hasMinorInvolved}

Assess:
- acuteDistress: does the language suggest the person is in
  immediate danger right now?
- activeLegalProceedings: are there mentions of ongoing court
  cases that would make public discussion harmful?
- noPublicDisclosure: has this person NOT chosen to go public?
- minorInvolved: is anyone under 18 involved in this case?
- overallSafe: true ONLY if all four above are false
- flagReason: if not safe, explain exactly why in one sentence.
  If safe, return empty string.

When in doubt, flag it. Err on the side of caution.`,
  });

  if (!object.overallSafe || enrichedCase.hasMinorInvolved) {
    const reason = enrichedCase.hasMinorInvolved
      ? "Minor involved — automatic hold for human review"
      : object.flagReason;

    await addToHumanReview(dbCaseId, reason);
    return { safe: false };
  }

  await updateCase(dbCaseId, {
    safetyCleared: true,
    pipelineStatus: "screened",
  });
  return { safe: true };
}
