import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { findSimilarEpisodes, updateCase, getCaseById } from "@/lib/db/queries";
import type { EpisodeMatch } from "./types";

export async function runEpisodeMatchingAgent(
  caseId: string,
  caseEmbedding: number[]
): Promise<EpisodeMatch[]> {
  const episodes = await findSimilarEpisodes(caseEmbedding);

  const caseRecord = await getCaseById(caseId);
  if (!caseRecord) throw new Error(`Case ${caseId} not found`);

  const matches: EpisodeMatch[] = [];

  for (const ep of episodes) {
    const row = ep as { id: string; title: string; description: string; relevance_score: number };
    const { text: explanation } = await generateText({
      model: openai("gpt-4o"),
      prompt: `In one sentence, explain why this podcast episode theme is a good match for this guest case.

Episode: "${row.title}" — ${row.description}
Case: "${caseRecord.title}" — ${caseRecord.summary}`,
    });

    matches.push({
      episodeId: row.id,
      title: row.title,
      relevanceScore: row.relevance_score,
      matchExplanation: explanation,
    });
  }

  await updateCase(caseId, {
    episodeMatches: JSON.stringify(matches),
    pipelineStatus: "matched",
  });

  return matches;
}
