import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { getAllCases, insertCase } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const url = new URL(request.url);
  const filters = {
    category: url.searchParams.get("category") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    readiness: url.searchParams.get("readiness") ?? undefined,
    minScore: url.searchParams.get("minScore")
      ? Number(url.searchParams.get("minScore"))
      : undefined,
    maxScore: url.searchParams.get("maxScore")
      ? Number(url.searchParams.get("maxScore"))
      : undefined,
  };

  const cases = await getAllCases(filters);
  return NextResponse.json(cases);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const body = await request.json();
  const newCase = await insertCase(body);
  return NextResponse.json(newCase, { status: 201 });
}
