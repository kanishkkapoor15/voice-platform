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
  const trimmed = text.trim();

  // 1. Direct parse — model obeyed "no markdown" instruction
  try { return JSON.parse(trimmed); } catch {}

  // 2. Outermost braces on raw text — handles URLs containing ```json inside string values
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)); } catch {}
  }

  const firstBracket = trimmed.indexOf("[");
  const lastBracket = trimmed.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try { return JSON.parse(trimmed.slice(firstBracket, lastBracket + 1)); } catch {}
  }

  // 3. Fenced code block — last resort; can be tripped by backticks inside string values
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const inner = fenced[1].trim();
    try { return JSON.parse(inner); } catch {}
    const fb = inner.indexOf("{"), lb = inner.lastIndexOf("}");
    if (fb !== -1 && lb > fb) {
      try { return JSON.parse(inner.slice(fb, lb + 1)); } catch {}
    }
  }

  throw new Error(`AI response did not contain valid JSON: ${text}`);
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
