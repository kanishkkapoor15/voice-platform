import { z } from "zod";

export const IssueCategorySchema = z.enum([
  "harassment",
  "disability",
  "refugee",
  "domestic_violence",
  "medical_neglect",
  "workplace_discrimination",
  "other",
]);

export const GuestReadinessSchema = z.enum(["experienced", "first_time"]);

export const RawCaseLeadSchema = z.object({
  title: z.string().min(1),
  sourceUrl: z.string().min(1),
  snippet: z.string().min(1),
  domain: z.string().min(1),
});

export const RawCaseLeadsSchema = z.object({
  leads: z.array(RawCaseLeadSchema).max(10),
});

export const VerificationResultSchema = z.object({
  credibilityScore: z.number().min(0).max(100),
  corroboratingSources: z.array(z.string()).max(3),
  verified: z.boolean(),
  reason: z.string().min(1),
});

export const VerifiedCaseSchema = RawCaseLeadSchema.merge(
  VerificationResultSchema
);

export const EnrichedCaseSchema = VerifiedCaseSchema.extend({
  issueCategory: IssueCategorySchema,
  region: z.string(),
  timeline: z.string(),
  currentStatus: z.string(),
  guestReadiness: GuestReadinessSchema,
  contactPathway: z.string(),
  summary: z.string().max(1200),
  hasMinorInvolved: z.boolean(),
});

export const SafetyResultSchema = z.object({
  acuteDistress: z.boolean(),
  activeLegalProceedings: z.boolean(),
  noPublicDisclosure: z.boolean(),
  minorInvolved: z.boolean(),
  overallSafe: z.boolean(),
  flagReason: z.string(),
});

export const EpisodeMatchSchema = z.object({
  episodeId: z.string(),
  title: z.string(),
  relevanceScore: z.number().min(0).max(1),
  matchExplanation: z.string(),
});

export const PipelineResultSchema = z.object({
  casesFound: z.number(),
  casesCleared: z.number(),
  casesHeld: z.number(),
  errors: z.array(z.string()),
});

export type RawCaseLead = z.infer<typeof RawCaseLeadSchema>;
export type VerifiedCase = z.infer<typeof VerifiedCaseSchema>;
export type EnrichedCase = z.infer<typeof EnrichedCaseSchema>;
export type SafetyResult = z.infer<typeof SafetyResultSchema>;
export type EpisodeMatch = z.infer<typeof EpisodeMatchSchema>;
export type PipelineResult = z.infer<typeof PipelineResultSchema>;
