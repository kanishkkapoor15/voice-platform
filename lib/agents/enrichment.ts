import { generateObject, embed } from "ai";
import { z } from "zod";
import { primaryModel, embeddingModel } from "@/lib/ai/client";
import type { VerifiedCase } from "./verification";

const EnrichmentSchema = z.object({
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
  summary: z.string().max(800),
  hasMinorInvolved: z.boolean(),
});

export type EnrichedCase = VerifiedCase &
  z.infer<typeof EnrichmentSchema> & {
    embedding: number[];
  };

export async function runEnrichmentAgent(
  cases: VerifiedCase[]
): Promise<EnrichedCase[]> {
  const results: EnrichedCase[] = [];

  for (const c of cases) {
    try {
      const { object } = await generateObject({
        model: primaryModel,
        schema: EnrichmentSchema,
        prompt: `Enrich this podcast case lead with structured information:

Title: ${c.title}
Source: ${c.sourceUrl}
Snippet: ${c.snippet}

Extract:
- issueCategory: the primary issue type
- region: geographic region of the story
- timeline: when events occurred
- currentStatus: current situation of the person
- guestReadiness: 'experienced' if they have given interviews before,
  'first_time' if this appears to be their first public sharing
- contactPathway: best contact route — prefer NGO or support org
  over direct personal contact. Leave empty string if none found.
- summary: 150 word plain English summary, no jargon
- hasMinorInvolved: true if anyone under 18 is mentioned`,
      });

      const { embedding } = await embed({
        model: embeddingModel,
        value: object.summary,
      });

      results.push({ ...c, ...object, embedding });
    } catch (err) {
      console.error(`Enrichment failed for case: ${c.title}`, err);
    }
  }

  return results;
}
