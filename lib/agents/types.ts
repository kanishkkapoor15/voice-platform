export interface RawCaseLead {
  title: string;
  sourceUrl: string;
  snippet: string;
  domain: string;
}

export interface VerifiedCase {
  title: string;
  sourceUrl: string;
  snippet: string;
  domain: string;
  credibilityScore: number;
  corroboratingSources: string[];
  verified: boolean;
}

export interface SocialMediaHandles {
  twitter?: string;
  linkedin?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  other?: string;
}

export interface EnrichedCase {
  id: string;
  title: string;
  sourceUrl: string;
  credibilityScore: number;
  issueCategory:
    | "harassment"
    | "disability"
    | "refugee"
    | "domestic_violence"
    | "medical_neglect"
    | "workplace_discrimination"
    | "other";
  region: string;
  timeline: string;
  currentStatus: string;
  guestReadiness: "experienced" | "first_time";
  contactPathway: string;
  personName: string;
  personEmail: string;
  personPhone: string;
  socialMedia: SocialMediaHandles;
  sourceLink: string;
  summary: string;
  hasMinorInvolved: boolean;
  embedding: number[];
}

export interface SafetyResult {
  safe: boolean;
  acuteDistress: boolean;
  activeLegalProceedings: boolean;
  noPublicDisclosure: boolean;
  minorInvolved: boolean;
  flagReason: string;
}

export interface EpisodeMatch {
  episodeId: string;
  title: string;
  relevanceScore: number;
  matchExplanation: string;
}

export interface PipelineResult {
  casesFound: number;
  casesCleared: number;
  casesHeld: number;
}
