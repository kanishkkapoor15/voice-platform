import { generateObject } from "ai";
import { z } from "zod";
import { primaryModel } from "@/lib/ai/client";

const RawCaseLeadSchema = z.object({
  leads: z.array(
    z.object({
      title: z.string(),
      sourceUrl: z.string(),
      snippet: z.string(),
      domain: z.string(),
    })
  ),
});

export type RawCaseLead = z.infer<typeof RawCaseLeadSchema>["leads"][number];

export async function runDiscoveryAgent(input: {
  topic: string;
  keywords: string[];
}): Promise<RawCaseLead[]> {
  const { object } = await generateObject({
    model: primaryModel,
    schema: RawCaseLeadSchema,
    prompt: `You are a research agent for a podcast that amplifies voices from vulnerable and survivor communities.

Search topic: ${input.topic}
Keywords: ${input.keywords.join(", ")}

Generate 5-10 realistic case leads that this podcast could feature.
These should represent real types of stories from: harassment survivors,
disability advocates, refugees, domestic violence survivors, medical
neglect cases, workplace discrimination victims.

For each lead provide a realistic title, a plausible source URL from
a legitimate news outlet or NGO, a 2-sentence snippet summarising
the case, and the source domain name.

Only include cases where the person has chosen to speak publicly.
Never include cases involving minors.`,
  });
  return object.leads;
}
