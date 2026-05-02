import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { z } from "zod";
import { insertCase } from "@/lib/db/queries";
import type { VerifiedCase, EnrichedCase } from "./types";

const enrichmentSchema = z.object({
  issueCategory: z.enum([
    "harassment",
    "disability",
    "refugee",
    "domestic_violence",
    "medical_neglect",
    "workplace_discrimination",
    "other",
  ]),
  region: z.string(),
  timeline: z.string(),
  currentStatus: z.string(),
  guestReadiness: z.enum(["experienced", "first_time"]),
  contactPathway: z.string(),
  summary: z.string(),
  hasMinorInvolved: z.boolean(),
});

export async function runEnrichmentAgent(
  verifiedCases: VerifiedCase[]
): Promise<EnrichedCase[]> {
  const enriched: EnrichedCase[] = [];

  for (const vc of verifiedCases) {
    const { object: enrichment } = await generateObject({
      model: openai("gpt-4o"),
      schema: enrichmentSchema,
      prompt: `You are an enrichment agent for a podcast platform serving Irish vulnerable, challenged, and survivor communities.

Analyse this verified case and extract structured information.

Title: ${vc.title}
Source: ${vc.sourceUrl}
Domain: ${vc.domain}
Snippet: ${vc.snippet}
Credibility Score: ${vc.credibilityScore}
Corroborating Sources: ${vc.corroboratingSources.join(", ")}

RULES:
- issueCategory: classify into one of the 7 categories
- region: geographic region in Ireland/UK/EU
- timeline: when events occurred
- currentStatus: current state of the situation
- guestReadiness: "experienced" if evidence of prior interviews, op-eds, public advocacy; "first_time" otherwise
- contactPathway: prefer intermediary org email > official support contact > direct public email. NEVER invent a contact — leave as empty string if none found in source material
- summary: max 150 words, plain language, no jargon
- hasMinorInvolved: true if any person under 18 is mentioned in any capacity`,
    });

    const { embedding: embeddingResult } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: enrichment.summary,
    });

    const dbCase = await insertCase({
      title: vc.title,
      summary: enrichment.summary,
      credibilityScore: vc.credibilityScore,
      category: enrichment.issueCategory,
      region: enrichment.region,
      guestReadiness: enrichment.guestReadiness,
      contactPathway: enrichment.contactPathway || null,
      sourceUrls: [vc.sourceUrl, ...vc.corroboratingSources],
      pipelineStatus: "enriched",
      embedding: JSON.stringify(embeddingResult),
    });

    enriched.push({
      id: dbCase.id,
      title: vc.title,
      sourceUrl: vc.sourceUrl,
      credibilityScore: vc.credibilityScore,
      ...enrichment,
      embedding: embeddingResult,
    });
  }

  return enriched;
}
