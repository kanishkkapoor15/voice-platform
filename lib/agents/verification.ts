import { generateObject } from "ai";
import { primaryModel } from "@/lib/ai/client";
import { z } from "zod";
import type { RawCaseLead, VerifiedCase } from "./types";

const verificationSchema = z.object({
  credibilityScore: z.number().min(0).max(100),
  corroboratingSources: z.array(z.string()),
  verified: z.boolean(),
  reasoning: z.string(),
});

export async function runVerificationAgent(
  leads: RawCaseLead[]
): Promise<VerifiedCase[]> {
  const results: VerifiedCase[] = [];

  for (const lead of leads) {
    const { object: verification } = await generateObject({
      model: primaryModel,
      schema: verificationSchema,
      prompt: `You are a verification agent. Assess the credibility of this case lead for a podcast platform.

Title: ${lead.title}
Source: ${lead.sourceUrl}
Domain: ${lead.domain}
Snippet: ${lead.snippet}

SCORING RULES (add points for each that applies):
- Domain authority — established news outlet or recognised publication: +30
- Number of corroborating sources (each independent source: +20, max 3 sources = +60)
- Named individuals or organisations present in the story: +15
- Recent publication within 6 months: +10
- Government or NGO source: +25

Maximum possible score: 100
Minimum to pass verification: 40

Assess credibility, list any corroborating sources you can identify, and determine if this lead meets the 40-point threshold.
Set verified=true only if credibilityScore >= 40.`,
    });

    results.push({
      ...lead,
      credibilityScore: verification.credibilityScore,
      corroboratingSources: verification.corroboratingSources,
      verified: verification.verified,
    });
  }

  return results;
}
