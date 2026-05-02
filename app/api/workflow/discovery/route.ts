import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { runFullPipeline } from "@/lib/pipeline/runner";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const body = await request.json();
  const { topic, keywords } = body as { topic: string; keywords: string[] };

  if (!topic || !keywords?.length) {
    return NextResponse.json(
      { error: "topic and keywords are required" },
      { status: 400 }
    );
  }

  const result = await runFullPipeline({ topic, keywords });

  return NextResponse.json(result);
}
