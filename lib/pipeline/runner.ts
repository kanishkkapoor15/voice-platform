import { runDiscoveryAgent } from "@/lib/agents/discovery";
import { runVerificationAgent } from "@/lib/agents/verification";
import { runEnrichmentAgent } from "@/lib/agents/enrichment";
import { runSafetyScreeningAgent } from "@/lib/agents/safety";
import { runEpisodeMatchingAgent } from "@/lib/agents/matching";
import { insertHumanReview, updateCase } from "@/lib/db/queries";
import type { PipelineResult } from "@/lib/agents/types";

export async function runFullPipeline(input: {
  topic: string;
  keywords: string[];
}): Promise<PipelineResult> {
  let casesFound = 0;
  let casesCleared = 0;
  let casesHeld = 0;

  // Stage 1: Discovery
  const rawLeads = await runDiscoveryAgent(input);
  casesFound = rawLeads.length;

  // Stage 2: Verification
  const verifiedCases = await runVerificationAgent(rawLeads);
  const passedVerification = verifiedCases.filter((c) => c.verified);
  const failedVerification = verifiedCases.filter((c) => !c.verified);
  casesHeld += failedVerification.length;

  // Stage 3: Enrichment
  const enrichedCases = await runEnrichmentAgent(passedVerification);

  // Stage 4: Safety Screening — REQUIRED, MUST NOT BE SKIPPED
  for (const enrichedCase of enrichedCases) {
    let safetyRan = false;

    try {
      const safetyResult = await runSafetyScreeningAgent(enrichedCase);
      safetyRan = true;

      if (!safetyResult.safe) {
        casesHeld++;
        continue;
      }

      // Stage 5: Episode Matching — only if safety passed
      try {
        await runEpisodeMatchingAgent(enrichedCase.id, enrichedCase.embedding);
        casesCleared++;
      } catch (matchError) {
        console.error(
          `Matching failed for case ${enrichedCase.id}:`,
          matchError
        );
        await updateCase(enrichedCase.id, { pipelineStatus: "screened" });
        casesCleared++;
      }
    } catch (error) {
      console.error(
        `Pipeline error for case ${enrichedCase.id}:`,
        error
      );
      await updateCase(enrichedCase.id, { pipelineStatus: "human_review" });
      await insertHumanReview(
        enrichedCase.id,
        `Pipeline error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      casesHeld++;
    }

    if (!safetyRan) {
      throw new Error(
        `CRITICAL: Safety screening was not executed for case ${enrichedCase.id}. Pipeline halted. This is a safety violation.`
      );
    }
  }

  return { casesFound, casesCleared, casesHeld };
}
