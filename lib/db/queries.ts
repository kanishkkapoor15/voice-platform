import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, desc, and, gte, lte, sql, count, countDistinct } from "drizzle-orm";
import {
  cases,
  invitations,
  episodeThemes,
  humanReviewQueue,
  type NewCase,
  type NewInvitation,
} from "./schema";

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
export const db = drizzle(pool);

// ── Cases ──

export async function getAllCases(filters?: {
  category?: string;
  status?: string;
  readiness?: string;
  minScore?: number;
  maxScore?: number;
}) {
  const conditions = [];

  if (filters?.category) {
    conditions.push(eq(cases.category, filters.category as typeof cases.category.enumValues[number]));
  }
  if (filters?.status) {
    conditions.push(eq(cases.pipelineStatus, filters.status as typeof cases.pipelineStatus.enumValues[number]));
  }
  if (filters?.readiness) {
    conditions.push(eq(cases.guestReadiness, filters.readiness as typeof cases.guestReadiness.enumValues[number]));
  }
  if (filters?.minScore !== undefined) {
    conditions.push(gte(cases.credibilityScore, filters.minScore));
  }
  if (filters?.maxScore !== undefined) {
    conditions.push(lte(cases.credibilityScore, filters.maxScore));
  }

  return db
    .select()
    .from(cases)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(cases.createdAt));
}

export async function getCaseById(id: string) {
  const result = await db.select().from(cases).where(eq(cases.id, id));
  return result[0] ?? null;
}

export async function insertCase(data: NewCase) {
  const result = await db.insert(cases).values(data).returning();
  return result[0];
}

export async function updateCase(id: string, data: Partial<NewCase>) {
  const result = await db
    .update(cases)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(cases.id, id))
    .returning();
  return result[0];
}

// ── Invitations ──

export async function getAllInvitations() {
  return db
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
}

export async function insertInvitation(data: NewInvitation) {
  const result = await db.insert(invitations).values(data).returning();
  return result[0];
}

export async function updateInvitationStatus(
  id: string,
  status: string,
) {
  const timestampField = {
    opened: "openedAt",
    responded: "respondedAt",
    confirmed: "confirmedAt",
    aired: "airedAt",
  }[status] as string | undefined;

  const updateData: Record<string, unknown> = { status };
  if (timestampField) {
    updateData[timestampField] = new Date();
  }

  const result = await db
    .update(invitations)
    .set(updateData)
    .where(eq(invitations.id, id))
    .returning();
  return result[0];
}

// ── Episode Themes ──

export async function getAllEpisodeThemes() {
  return db.select().from(episodeThemes);
}

export async function findSimilarEpisodes(caseEmbedding: number[]) {
  const embeddingStr = `[${caseEmbedding.join(",")}]`;
  const result = await db.execute(
    sql`SELECT id, title, description,
        1 - (embedding::vector <=> ${embeddingStr}::vector) as relevance_score
        FROM episode_themes
        WHERE embedding IS NOT NULL
        ORDER BY embedding::vector <=> ${embeddingStr}::vector
        LIMIT 3`
  );
  return result.rows;
}

// ── Human Review Queue ──

export async function insertHumanReview(caseId: string, flagReason: string) {
  const result = await db
    .insert(humanReviewQueue)
    .values({ caseId, flagReason })
    .returning();
  return result[0];
}

// ── Impact Metrics ──

export async function getImpactMetrics() {
  const [totalGuests] = await db
    .select({ count: count() })
    .from(invitations)
    .where(eq(invitations.status, "aired"));

  const [episodesProduced] = await db
    .select({ count: countDistinct(invitations.episodeId) })
    .from(invitations)
    .where(eq(invitations.status, "aired"));

  const airedCaseIds = db
    .select({ caseId: invitations.caseId })
    .from(invitations)
    .where(eq(invitations.status, "aired"));

  const [communities] = await db
    .select({ count: countDistinct(cases.category) })
    .from(cases)
    .where(sql`${cases.id} IN (${airedCaseIds})`);

  const guestsByCategory = await db
    .select({
      category: cases.category,
      count: count(),
    })
    .from(invitations)
    .leftJoin(cases, eq(invitations.caseId, cases.id))
    .where(eq(invitations.status, "aired"))
    .groupBy(cases.category);

  return {
    totalGuestsAppeared: totalGuests.count,
    episodesProduced: episodesProduced.count,
    communitiesRepresented: communities.count,
    guestsByCategory,
  };
}
