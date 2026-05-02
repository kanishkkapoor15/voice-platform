import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  vector,
} from "drizzle-orm/pg-core";

export const cases = pgTable("cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  summary: text("summary"),
  credibilityScore: integer("credibility_score"),
  category: text("category"),
  region: text("region"),
  guestReadiness: text("guest_readiness"),
  contactPathway: text("contact_pathway"),
  sourceUrls: text("source_urls").array(),
  episodeMatches: jsonb("episode_matches"),
  pipelineStatus: text("pipeline_status").default("pending"),
  safetyCleared: boolean("safety_cleared").default(false),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  embedding: vector("embedding", { dimensions: 1536 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const episodeThemes = pgTable("episode_themes", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  airDate: timestamp("air_date", { withTimezone: true }),
  embedding: vector("embedding", { dimensions: 1536 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "cascade" }),
  episodeId: uuid("episode_id").references(() => episodeThemes.id),
  status: text("status").default("sent"),
  inviteEmailBody: text("invite_email_body"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  airedAt: timestamp("aired_at", { withTimezone: true }),
});

export const humanReviewQueue = pgTable("human_review_queue", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").references(() => cases.id, { onDelete: "cascade" }),
  flagReason: text("flag_reason").notNull(),
  assignedTo: text("assigned_to"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type Case = typeof cases.$inferSelect;
export type NewCase = typeof cases.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type EpisodeTheme = typeof episodeThemes.$inferSelect;
export type HumanReview = typeof humanReviewQueue.$inferSelect;
