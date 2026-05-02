import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { getImpactMetrics } from "@/lib/db/queries";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const metrics = await getImpactMetrics();
  return NextResponse.json(metrics);
}
