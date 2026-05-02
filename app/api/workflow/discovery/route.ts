import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { runFullPipeline } from "@/lib/pipeline/runner";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { topic, keywords } = body as {
      topic: string;
      keywords?: string[];
    };

    if (!topic || typeof topic !== "string") {
      return NextResponse.json(
        { error: "topic is required" },
        { status: 400 }
      );
    }

    const result = await runFullPipeline({
      topic,
      keywords: keywords ?? [],
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Discovery pipeline error:", err);
    return NextResponse.json(
      {
        error: "Pipeline failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
