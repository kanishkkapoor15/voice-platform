import { AI } from "lua-cli";
import { z } from "zod";

type GenerateJsonInput<T> = {
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  schemaHint: string;
  maxOutputTokens?: number;
  temperature?: number;
};

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? text).trim();

  try {
    return JSON.parse(candidate);
  } catch {
    const firstObject = candidate.indexOf("{");
    const lastObject = candidate.lastIndexOf("}");
    if (firstObject !== -1 && lastObject > firstObject) {
      return JSON.parse(candidate.slice(firstObject, lastObject + 1));
    }

    const firstArray = candidate.indexOf("[");
    const lastArray = candidate.lastIndexOf("]");
    if (firstArray !== -1 && lastArray > firstArray) {
      return JSON.parse(candidate.slice(firstArray, lastArray + 1));
    }

    throw new Error(`AI response did not contain valid JSON: ${text}`);
  }
}

export async function generateJson<T>({
  schema,
  system,
  prompt,
  schemaHint,
  maxOutputTokens = 1800,
  temperature = 0.2,
}: GenerateJsonInput<T>): Promise<T> {
  let lastError: unknown = null;
  let lastText = "";

  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await AI.generate({
      system: `${system}

Return only valid, complete JSON. Do not wrap it in markdown. Do not include comments or prose. The JSON must match this shape:
${schemaHint}`,
      prompt:
        attempt === 0
          ? prompt
          : `${prompt}

The previous response was invalid JSON and could not be parsed.
Error: ${String(lastError)}
Previous response:
${lastText.slice(0, 1200)}

Return the complete corrected JSON object only.`,
      temperature: attempt === 0 ? temperature : 0,
      maxOutputTokens: attempt === 0 ? maxOutputTokens : maxOutputTokens + 800,
    });

    lastText = typeof result === "string" ? result : result.text;

    try {
      return schema.parse(extractJson(lastText));
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`AI response did not match JSON schema: ${String(lastError)}`);
}

export async function generateText(system: string, prompt: string): Promise<string> {
  const result = await AI.generate({
    system,
    prompt,
    temperature: 0.4,
    maxOutputTokens: 1600,
  });

  return (typeof result === "string" ? result : result.text).trim();
}
