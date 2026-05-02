import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./config";

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { authorized: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { authorized: true as const, session };
}
