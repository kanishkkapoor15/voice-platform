import { generateObject } from "ai";
import { z } from "zod";
import { primaryModel } from "@/lib/ai/client";
import type { RawCaseLead } from "./discovery";

const VerificationResultSchema = z.object({
  credibilityScore: z.number().min(0).max(100),
  corroboratingSources: z.array(z.string()),
  verified: z.boolean(),
  reason: z.string(),
});

export type VerifiedCase = RawCaseLead & z.infer<typeof VerificationResultSchema>;

export async function runVerificationAgent(
  leads: RawCaseLead[]
): Promise<VerifiedCase[]> {
  const results: VerifiedCase[] = [];

  for (const lead of leads) {
    try {
      const { object } = await generateObject({
        model: primaryModel,
        schema: VerificationResultSchema,
        prompt: `Assess the credibility of this potential podcast case:

Title: ${lead.title}
Source: ${lead.sourceUrl}
Domain: ${lead.domain}
Snippet: ${lead.snippet}

Score from 0-100 based on:
- Domain authority (established outlet = +30)
- Whether the source is an NGO or government body (+25)
- Whether named individuals or organisations are mentioned (+15)
- Whether the story is recent within 6 months (+10)
- Plausibility of corroborating sources (+20)

Return credibilityScore, up to 3 corroborating source URLs,
verified (true if score >= 40), and a reason explaining the score.`,
      });

      results.push({ ...lead, ...object });
    } catch (err) {
      console.error(`Verification failed for lead: ${lead.title}`, err);
    }
  }

  return results;
}
