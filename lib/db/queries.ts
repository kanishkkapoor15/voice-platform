import { db } from "./index";
import {
  cases,
  invitations,
  episodeThemes,
  humanReviewQueue,
  type NewCase,
} from "./schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

// ── Cases ──

export async function getAllCases(filters?: {
  category?: string;
  status?: string;
  readiness?: string;
  minScore?: number;
  maxScore?: number;
}) {
  try {
    const conditions = [];
    if (filters?.category) conditions.push(eq(cases.category, filters.category));
    if (filters?.status) conditions.push(eq(cases.pipelineStatus, filters.status));
    if (filters?.readiness) conditions.push(eq(cases.guestReadiness, filters.readiness));
    if (filters?.minScore !== undefined)
      conditions.push(gte(cases.credibilityScore, filters.minScore));
    if (filters?.maxScore !== undefined)
      conditions.push(lte(cases.credibilityScore, filters.maxScore));

    return await db
      .select()
      .from(cases)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(cases.createdAt));
  } catch (err) {
    console.error("getAllCases error:", err);
    return [];
  }
}

export async function getCaseById(id: string) {
  try {
    const result = await db.select().from(cases).where(eq(cases.id, id)).limit(1);
    return result[0] ?? null;
  } catch (err) {
    console.error("getCaseById error:", err);
    return null;
  }
}

export async function createCase(data: NewCase) {
  try {
    const result = await db.insert(cases).values(data).returning();
    return result[0] ?? null;
  } catch (err) {
    console.error("createCase error:", err);
    return null;
  }
}

export async function updateCase(id: string, data: Partial<NewCase>) {
  try {
    const result = await db
      .update(cases)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cases.id, id))
      .returning();
    return result[0] ?? null;
  } catch (err) {
    console.error("updateCase error:", err);
    return null;
  }
}

export async function approveCase(id: string) {
  return updateCase(id, {
    approvedAt: new Date(),
    pipelineStatus: "approved",
  });
}

export async function addToHumanReview(caseId: string, flagReason: string) {
  try {
    await db.insert(humanReviewQueue).values({ caseId, flagReason });
    return await updateCase(caseId, { pipelineStatus: "human_review" });
  } catch (err) {
    console.error("addToHumanReview error:", err);
    return null;
  }
}

// ── Invitations ──

export async function getAllInvitations() {
  try {
    return await db
      .select({
        id: invitations.id,
        caseId: invitations.caseId,
        episodeId: invitations.episodeId,
        status: invitations.status,
        inviteEmailBody: invitations.inviteEmailBody,
        sentAt: invitations.sentAt,
        openedAt: invitations.openedAt,
        respondedAt: invitations.respondedAt,
        confirmedAt: invitations.confirmedAt,
        airedAt: invitations.airedAt,
        caseTitle: cases.title,
      })
      .from(invitations)
      .leftJoin(cases, eq(invitations.caseId, cases.id))
      .orderBy(desc(invitations.sentAt));
  } catch (err) {
    console.error("getAllInvitations error:", err);
    return [];
  }
}

export async function updateInvitationStatus(id: string, status: string) {
  try {
    const timestampField = {
      opened: "openedAt",
      responded: "respondedAt",
      confirmed: "confirmedAt",
      aired: "airedAt",
    }[status] as string | undefined;

    const updateData: Record<string, unknown> = { status };
    if (timestampField) updateData[timestampField] = new Date();

    const result = await db
      .update(invitations)
      .set(updateData)
      .where(eq(invitations.id, id))
      .returning();
    return result[0] ?? null;
  } catch (err) {
    console.error("updateInvitationStatus error:", err);
    return null;
  }
}

// ── Episode Themes ──

export async function getEpisodeThemesWithEmbeddings() {
  try {
    return await db.select().from(episodeThemes);
  } catch (err) {
    console.error("getEpisodeThemesWithEmbeddings error:", err);
    return [];
  }
}

// ── Impact Metrics ──

export async function getImpactMetrics() {
  try {
    const aired = await db
      .select({
        id: invitations.id,
        episodeId: invitations.episodeId,
        caseId: invitations.caseId,
        category: cases.category,
      })
      .from(invitations)
      .leftJoin(cases, eq(invitations.caseId, cases.id))
      .where(eq(invitations.status, "aired"));

    const episodeIds = new Set(aired.map((i) => i.episodeId).filter(Boolean));
    const categories = new Set(aired.map((i) => i.category).filter(Boolean));

    const counts = new Map<string, number>();
    for (const row of aired) {
      const cat = row.category ?? "other";
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }

    const guestsByCategory = Array.from(counts.entries()).map(([category, count]) => ({
      category,
      count,
    }));

    return {
      totalGuestsAppeared: aired.length,
      episodesProduced: episodeIds.size,
      communitiesRepresented: categories.size,
      guestsByCategory,
    };
  } catch (err) {
    console.error("getImpactMetrics error:", err);
    return {
      totalGuestsAppeared: 0,
      episodesProduced: 0,
      communitiesRepresented: 0,
      guestsByCategory: [],
    };
  }
}

// keep sql export available for raw queries if needed
export { sql };
