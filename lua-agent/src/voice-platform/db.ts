import { env } from "lua-cli";
import { Pool, type QueryResultRow } from "pg";
import type { EpisodeMatch } from "./schemas";

let pool: Pool | null = null;

export type DbCase = {
  id: string;
  title: string;
  summary: string | null;
  credibility_score: number | null;
  category: string | null;
  region: string | null;
  guest_readiness: string | null;
  contact_pathway: string | null;
  source_urls: string[] | null;
  episode_matches: EpisodeMatch[] | null;
  pipeline_status: string | null;
  safety_cleared: boolean | null;
  approved_at: Date | string | null;
  has_minor_involved: boolean | null;
};

export type EpisodeTheme = {
  id: string;
  title: string;
  description: string | null;
};

export type NewCaseInput = {
  title: string;
  summary: string;
  credibilityScore: number;
  category: string;
  region: string;
  guestReadiness: string;
  contactPathway: string | null;
  sourceUrls: string[];
  pipelineStatus: string;
  hasMinorInvolved: boolean;
};

function requireEnv(name: string): string {
  const value = env(name) ?? process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured for this Lua environment`);
  }
  return value;
}

function getPool(): Pool {
  if (pool) return pool;

  const connectionString = requireEnv("POSTGRES_URL");
  const sslSetting = env("POSTGRES_SSL") ?? process.env.POSTGRES_SSL;
  const useSsl =
    sslSetting === "true" || connectionString.includes("sslmode=require");

  pool = new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });

  return pool;
}

async function query<T extends QueryResultRow>(
  text: string,
  values: unknown[] = []
): Promise<T[]> {
  const result = await getPool().query<T>(text, values);
  return result.rows;
}

export async function createCase(data: NewCaseInput): Promise<DbCase> {
  const rows = await query<DbCase>(
    `INSERT INTO cases (
      title,
      summary,
      credibility_score,
      category,
      region,
      guest_readiness,
      contact_pathway,
      source_urls,
      pipeline_status,
      has_minor_involved
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      data.title,
      data.summary,
      data.credibilityScore,
      data.category,
      data.region,
      data.guestReadiness,
      data.contactPathway,
      data.sourceUrls,
      data.pipelineStatus,
      data.hasMinorInvolved,
    ]
  );

  return rows[0];
}

export async function getCaseById(caseId: string): Promise<DbCase | null> {
  const rows = await query<DbCase>("SELECT * FROM cases WHERE id = $1 LIMIT 1", [
    caseId,
  ]);
  return rows[0] ?? null;
}

export async function updateCase(
  caseId: string,
  data: {
    pipelineStatus?: string;
    safetyCleared?: boolean;
    episodeMatches?: EpisodeMatch[];
    approvedAt?: Date;
  }
): Promise<DbCase | null> {
  const sets: string[] = [];
  const values: unknown[] = [];

  const add = (sql: string, value: unknown) => {
    values.push(value);
    sets.push(sql.replace("?", `$${values.length}`));
  };

  if (data.pipelineStatus !== undefined) {
    add("pipeline_status = ?", data.pipelineStatus);
  }
  if (data.safetyCleared !== undefined) {
    add("safety_cleared = ?", data.safetyCleared);
  }
  if (data.episodeMatches !== undefined) {
    add("episode_matches = ?::jsonb", JSON.stringify(data.episodeMatches));
  }
  if (data.approvedAt !== undefined) {
    add("approved_at = ?", data.approvedAt);
  }

  if (sets.length === 0) return getCaseById(caseId);

  sets.push("updated_at = now()");
  values.push(caseId);

  const rows = await query<DbCase>(
    `UPDATE cases SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
    values
  );

  return rows[0] ?? null;
}

export async function addToHumanReview(
  caseId: string,
  flagReason: string
): Promise<void> {
  await query(
    "INSERT INTO human_review_queue (case_id, flag_reason) VALUES ($1, $2)",
    [caseId, flagReason]
  );
  await updateCase(caseId, { pipelineStatus: "human_review" });
}

export async function getEpisodeThemes(): Promise<EpisodeTheme[]> {
  return query<EpisodeTheme>(
    "SELECT id, title, description FROM episode_themes ORDER BY created_at DESC"
  );
}

export async function insertInvitation(
  caseId: string,
  emailBody: string
): Promise<void> {
  await query(
    `INSERT INTO invitations (case_id, status, invite_email_body, sent_at)
     VALUES ($1, 'sent', $2, now())`,
    [caseId, emailBody]
  );
}
