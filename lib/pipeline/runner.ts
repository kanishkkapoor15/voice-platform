import { runDiscoveryAgent } from "@/lib/agents/discovery";
import { runVerificationAgent } from "@/lib/agents/verification";
import { runEnrichmentAgent } from "@/lib/agents/enrichment";
import { runSafetyScreeningAgent } from "@/lib/agents/safety";
import { runEpisodeMatchingAgent } from "@/lib/agents/matching";
import {
  createCase,
  addToHumanReview,
} from "@/lib/db/queries";

export type PipelineResult = {
  casesFound: number;
  casesCleared: number;
  casesHeld: number;
  errors: string[];
};

export async function runFullPipeline(input: {
  topic: string;
  keywords: string[];
}): Promise<PipelineResult> {
  const result: PipelineResult = {
    casesFound: 0,
    casesCleared: 0,
    casesHeld: 0,
    errors: [],
  };

  // Step 1: Discovery
  const leads = await runDiscoveryAgent(input);
  result.casesFound = leads.length;

  // Step 2: Verification
  const verified = await runVerificationAgent(leads);

  // Step 3: Enrichment
  const enriched = await runEnrichmentAgent(verified);

  // Step 4-6: Per-case pipeline
  for (const c of enriched) {
    try {
      // Save to database first
      const dbCase = await createCase({
        title: c.title,
        summary: c.summary,
        credibilityScore: c.credibilityScore,
        category: c.issueCategory,
        region: c.region,
        guestReadiness: c.guestReadiness,
        contactPathway: c.contactPathway || null,
        personName: c.personName || null,
        personEmail: c.personEmail || null,
        personPhone: c.personPhone || null,
        socialMedia: c.socialMedia || null,
        sourceLink: c.sourceLink || c.sourceUrl || null,
        sourceUrls: [c.sourceUrl],
        pipelineStatus: "enriched",
        embedding: c.embedding,
      });

      if (!dbCase) {
        result.errors.push(`Failed to save case: ${c.title}`);
        continue;
      }

      // SAFETY SCREENING — CANNOT BE SKIPPED
      let safetyResult: { safe: boolean };
      try {
        safetyResult = await runSafetyScreeningAgent(c, dbCase.id);
      } catch (err) {
        // Safety agent failed — treat as unsafe, hold for review
        await addToHumanReview(
          dbCase.id,
          "Safety screening failed — manual review required"
        );
        result.casesHeld++;
        result.errors.push(
          `Safety agent error for case ${c.title}: ${String(err)}`
        );
        continue;
      }

      if (!safetyResult.safe) {
        result.casesHeld++;
        continue;
      }

      // Episode matching
      await runEpisodeMatchingAgent(dbCase.id, c.summary ?? "", c.embedding);

      result.casesCleared++;
    } catch (err) {
      result.errors.push(`Pipeline error for case ${c.title}: ${String(err)}`);
    }
  }

  return result;
}
