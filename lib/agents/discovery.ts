import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { RawCaseLead } from "./types";

const discoveryResultSchema = z.object({
  leads: z.array(
    z.object({
      title: z.string(),
      sourceUrl: z.string().url(),
      snippet: z.string(),
      domain: z.string(),
    })
  ),
});

export async function runDiscoveryAgent(input: {
  topic: string;
  keywords: string[];
}): Promise<RawCaseLead[]> {
  const { object } = await generateObject({
    model: openai("gpt-4o"),
    schema: discoveryResultSchema,
    prompt: `You are a discovery agent for an Irish podcast platform that highlights stories from vulnerable, challenged, and survivor communities.

Search for potential guest cases related to: "${input.topic}"
Keywords: ${input.keywords.join(", ")}

RULES:
- Only return leads from verified public sources: major news outlets (RTE, Irish Times, BBC, Guardian), NGO reports, ReliefWeb, government publications, court record summaries
- NEVER use: Reddit, Twitter/X, Facebook, anonymous forums, unverified blogs
- Each lead must have a real, verifiable source URL from established outlets
- Focus on Irish communities but include UK/EU sources where relevant
- Return between 3 and 10 leads
- Each snippet should be 2-3 sentences summarising the story

Return leads that represent real stories of people who might benefit from sharing their experience on a podcast.`,
  });

  return object.leads;
}
