import { createOpenAI } from "@ai-sdk/openai";

export const tensorix = createOpenAI({
  baseURL: "https://api.tensorix.ai/v1",
  apiKey: process.env.TENSORIX_API_KEY!,
});

// Primary model — used by all agents except safety screening
export const primaryModel = tensorix("deepseek/deepseek-v3.2");

// Reasoning model — used ONLY by the safety screening agent
export const reasoningModel = tensorix("deepseek/deepseek-r1-0528");

// Embedding model — used for case and episode embeddings
export const embeddingModel = tensorix.embedding("qwen/qwen3-embedding-8b");
