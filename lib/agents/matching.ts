import { generateText } from "ai";
import { primaryModel } from "@/lib/ai/client";
import {
  getEpisodeThemesWithEmbeddings,
  updateCase,
} from "@/lib/db/queries";

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

export async function runEpisodeMatchingAgent(
  caseId: string,
  caseSummary: string,
  caseEmbedding: number[]
): Promise<void> {
  const episodes = await getEpisodeThemesWithEmbeddings();

  if (episodes.length === 0) {
    await updateCase(caseId, { pipelineStatus: "matched", episodeMatches: [] });
    return;
  }

  const scored = episodes
    .filter((e) => e.embedding !== null)
    .map((e) => ({
      episodeId: e.id,
      title: e.title,
      relevanceScore: cosineSimilarity(caseEmbedding, e.embedding as number[]),
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 3);

  const matches = await Promise.all(
    scored.map(async (match) => {
      try {
        const { text } = await generateText({
          model: primaryModel,
          prompt: `In one sentence, explain why this podcast case would be a good fit for the episode theme.

Case summary: ${caseSummary}
Episode theme: ${match.title}`,
        });
        return { ...match, matchExplanation: text.trim() };
      } catch (err) {
        console.error("Match explanation generation failed:", err);
        return { ...match, matchExplanation: "" };
      }
    })
  );

  await updateCase(caseId, {
    episodeMatches: matches,
    pipelineStatus: "matched",
  });
}
