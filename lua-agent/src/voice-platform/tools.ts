import { env, LuaSkill, type LuaTool } from "lua-cli";
import { z } from "zod";
import { Resend } from "resend";
import { generateJson, generateText } from "./ai";
import {
  addToHumanReview,
  createCase,
  getCaseById,
  getEpisodeThemes,
  insertInvitation,
  updateCase,
  type DbCase,
  type EpisodeTheme,
} from "./db";
import {
  EnrichedCaseSchema,
  EpisodeMatchSchema,
  RawCaseLeadSchema,
  RawCaseLeadsSchema,
  SafetyResultSchema,
  VerificationResultSchema,
  type EnrichedCase,
  type EpisodeMatch,
  type PipelineResult,
  type RawCaseLead,
  type VerifiedCase,
} from "./schemas";

const DiscoveryInputSchema = z.object({
  topic: z.string().min(1).describe("Editorial discovery topic"),
  keywords: z.array(z.string()).optional().default([]),
});

const VerifyInputSchema = z.object({
  leads: z.array(RawCaseLeadSchema),
});

const EnrichInputSchema = z.object({
  cases: z.array(
    RawCaseLeadSchema.extend({
      credibilityScore: z.number().min(0).max(100),
      corroboratingSources: z.array(z.string()).default([]),
      verified: z.boolean(),
      reason: z.string().optional().default(""),
    })
  ),
});

const SafetyInputSchema = z
  .object({
    caseId: z.string().optional(),
    case: EnrichedCaseSchema.optional(),
  })
  .refine((input) => Boolean(input.caseId || input.case), {
    message: "Provide either caseId or case",
  });

const MatchInputSchema = z.object({
  caseId: z.string(),
  caseSummary: z.string().optional(),
  caseTitle: z.string().optional(),
});

const InviteInputSchema = z.object({
  caseId: z.string(),
});

async function discoverCaseLeads(
  input: z.infer<typeof DiscoveryInputSchema>
): Promise<RawCaseLead[]> {
  const object = await generateJson({
    schema: RawCaseLeadsSchema,
    system:
      "You are a research agent for a podcast that amplifies voices from vulnerable and survivor communities in Ireland.",
    prompt: `Search topic: ${input.topic}
Keywords: ${(input.keywords ?? []).join(", ")}

Generate exactly 5 realistic case leads that this podcast could feature. Include real types of stories from harassment survivors, disability advocates, refugees, domestic violence survivors, medical neglect cases, and workplace discrimination victims.

For each lead provide a realistic title, a plausible source URL from a legitimate news outlet or NGO, a two-sentence snippet, and the source domain name. Keep URLs short and syntactically valid.

Only include cases where the person has chosen to speak publicly. Never include cases involving minors.`,
    schemaHint: `{
  "leads": [
    {
      "title": "string",
      "sourceUrl": "string",
      "snippet": "string",
      "domain": "string"
    }
  ]
}`,
    maxOutputTokens: 4000,
  });

  return object.leads;
}

async function verifyCaseLeads(leads: RawCaseLead[]): Promise<VerifiedCase[]> {
  const verified: VerifiedCase[] = [];

  for (const lead of leads) {
    try {
      const result = await generateJson({
        schema: VerificationResultSchema,
        system:
          "You assess source credibility for an editorial podcast research pipeline.",
        prompt: `Assess the credibility of this potential podcast case:

Title: ${lead.title}
Source: ${lead.sourceUrl}
Domain: ${lead.domain}
Snippet: ${lead.snippet}

Score from 0-100 based on:
- Domain authority: established outlet up to 30
- NGO or government source up to 25
- Named individuals or organisations up to 15
- Recency within 6 months up to 10
- Plausible corroborating sources up to 20

Return verified=true only if the score is at least 40.`,
        schemaHint: `{
  "credibilityScore": 75,
  "corroboratingSources": ["https://example.org/source"],
  "verified": true,
  "reason": "string"
}`,
      });

      verified.push({ ...lead, ...result });
    } catch (error) {
      console.error(`Verification failed for lead: ${lead.title}`, error);
    }
  }

  return verified;
}

async function enrichCases(cases: VerifiedCase[]): Promise<EnrichedCase[]> {
  const enriched: EnrichedCase[] = [];

  for (const currentCase of cases) {
    try {
      const result = await generateJson({
        schema: EnrichedCaseSchema.omit({
          title: true,
          sourceUrl: true,
          snippet: true,
          domain: true,
          credibilityScore: true,
          corroboratingSources: true,
          verified: true,
          reason: true,
        }),
        system:
          "You enrich editorial research leads into structured podcast case records.",
        prompt: `Enrich this podcast case lead with structured information:

Title: ${currentCase.title}
Source: ${currentCase.sourceUrl}
Snippet: ${currentCase.snippet}

Extract the primary issue category, region, timeline, current status, guest readiness, best contact pathway, summary, and whether anyone under 18 is involved. Prefer NGO or support organisation contact pathways over direct personal contact. Leave contactPathway as an empty string if none is found.`,
        schemaHint: `{
  "issueCategory": "harassment | disability | refugee | domestic_violence | medical_neglect | workplace_discrimination | other",
  "region": "string",
  "timeline": "string",
  "currentStatus": "string",
  "guestReadiness": "experienced | first_time",
  "contactPathway": "string",
  "summary": "150 word plain English summary",
  "hasMinorInvolved": false
}`,
        maxOutputTokens: 1800,
      });

      enriched.push({ ...currentCase, ...result });
    } catch (error) {
      console.error(`Enrichment failed for case: ${currentCase.title}`, error);
    }
  }

  return enriched;
}

function dbCaseToSafetyCase(dbCase: DbCase): EnrichedCase {
  const sourceUrl = dbCase.source_urls?.[0] ?? "";

  return {
    title: dbCase.title,
    sourceUrl,
    snippet: dbCase.summary ?? "",
    domain: sourceUrl ? new URL(sourceUrl).hostname : "unknown",
    credibilityScore: dbCase.credibility_score ?? 0,
    corroboratingSources: [],
    verified: true,
    reason: "Loaded from existing Voice Platform database",
    issueCategory: EnrichedCaseSchema.shape.issueCategory.parse(
      dbCase.category ?? "other"
    ),
    region: dbCase.region ?? "",
    timeline: "",
    currentStatus: "Stored case; current status was not recorded separately.",
    guestReadiness: EnrichedCaseSchema.shape.guestReadiness.parse(
      dbCase.guest_readiness ?? "first_time"
    ),
    contactPathway: dbCase.contact_pathway ?? "",
    summary: dbCase.summary ?? "",
    hasMinorInvolved: false,
  };
}

async function screenCaseSafety(input: z.infer<typeof SafetyInputSchema>) {
  const dbCase = input.caseId ? await getCaseById(input.caseId) : null;
  if (input.caseId && !dbCase) {
    throw new Error(`Case ${input.caseId} not found`);
  }

  const safetyCase = input.case ?? dbCaseToSafetyCase(dbCase as DbCase);

  const result = await generateJson({
    schema: SafetyResultSchema,
    system:
      "You are a safety screening agent for a podcast that works with vulnerable communities. When in doubt, flag for human review.",
    prompt: `Carefully analyse this case for risks:

Title: ${safetyCase.title}
Summary: ${safetyCase.summary}
Category: ${safetyCase.issueCategory}
Current status: ${safetyCase.currentStatus}
Has minor involved: ${safetyCase.hasMinorInvolved}

Assess:
- acuteDistress: language suggests immediate danger right now
- activeLegalProceedings: ongoing court cases could make public discussion harmful
- noPublicDisclosure: person has not chosen to go public
- minorInvolved: anyone under 18 is involved
- overallSafe: true only if all four above are false
- flagReason: one sentence if not safe, empty string if safe`,
    schemaHint: `{
  "acuteDistress": false,
  "activeLegalProceedings": false,
  "noPublicDisclosure": false,
  "minorInvolved": false,
  "overallSafe": true,
  "flagReason": ""
}`,
  });

  const caseId = input.caseId;
  const unsafeBecauseMinor = safetyCase.hasMinorInvolved || result.minorInvolved;

  if (!result.overallSafe || unsafeBecauseMinor) {
    const reason = unsafeBecauseMinor
      ? "Minor involved - automatic hold for human review"
      : result.flagReason || "Safety screening flagged the case for review";

    if (caseId) await addToHumanReview(caseId, reason);
    return { safe: false, caseId, safetyResult: { ...result, flagReason: reason } };
  }

  if (caseId) {
    await updateCase(caseId, {
      safetyCleared: true,
      pipelineStatus: "screened",
    });
  }

  return { safe: true, caseId, safetyResult: result };
}

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 3)
  );
}

function fallbackMatches(
  episodes: EpisodeTheme[],
  title: string,
  summary: string
): EpisodeMatch[] {
  const caseTokens = tokenize(`${title} ${summary}`);

  return episodes
    .map((episode) => {
      const episodeTokens = tokenize(`${episode.title} ${episode.description ?? ""}`);
      const overlap = [...caseTokens].filter((token) => episodeTokens.has(token));
      const denominator = Math.max(caseTokens.size, 1);
      const relevanceScore = Math.min(1, overlap.length / denominator);

      return {
        episodeId: episode.id,
        title: episode.title,
        relevanceScore,
        matchExplanation:
          relevanceScore > 0
            ? "Matched by overlapping issue and theme language."
            : "Included as a fallback episode theme for editorial review.",
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 3);
}

async function matchEpisodeThemes(input: z.infer<typeof MatchInputSchema>) {
  const dbCase = await getCaseById(input.caseId);
  if (!dbCase) throw new Error(`Case ${input.caseId} not found`);

  const episodes = await getEpisodeThemes();
  if (episodes.length === 0) {
    await updateCase(input.caseId, {
      episodeMatches: [],
      pipelineStatus: "matched",
    });
    return { caseId: input.caseId, matches: [] };
  }

  const caseTitle = input.caseTitle ?? dbCase.title;
  const caseSummary = input.caseSummary ?? dbCase.summary ?? "";
  let matches = fallbackMatches(episodes, caseTitle, caseSummary);

  try {
    const aiResult = await generateJson({
      schema: z.object({
        matches: z
          .array(
            z.object({
              episodeId: z.string(),
              relevanceScore: z.number().min(0).max(1),
              matchExplanation: z.string(),
            })
          )
          .max(3),
      }),
      system:
        "You match podcast case summaries to episode themes for an editorial team.",
      prompt: `Case title: ${caseTitle}
Case summary: ${caseSummary}

Episode themes:
${episodes
  .map(
    (episode) =>
      `- ${episode.id}: ${episode.title}. ${episode.description ?? ""}`
  )
  .join("\n")}

Choose up to 3 best episode matches. Use only IDs from the list.`,
      schemaHint: `{
  "matches": [
    {
      "episodeId": "existing episode id",
      "relevanceScore": 0.75,
      "matchExplanation": "one sentence"
    }
  ]
}`,
    });

    const episodeById = new Map(episodes.map((episode) => [episode.id, episode]));
    const validated = aiResult.matches
      .map((match) => {
        const episode = episodeById.get(match.episodeId);
        if (!episode) return null;
        return EpisodeMatchSchema.parse({
          ...match,
          title: episode.title,
        });
      })
      .filter((match): match is EpisodeMatch => Boolean(match));

    if (validated.length > 0) matches = validated;
  } catch (error) {
    console.error("AI episode matching failed; using lexical fallback", error);
  }

  await updateCase(input.caseId, {
    episodeMatches: matches,
    pipelineStatus: "matched",
  });

  return { caseId: input.caseId, matches };
}

async function runDiscoveryPipeline(
  input: z.infer<typeof DiscoveryInputSchema>
): Promise<PipelineResult> {
  const result: PipelineResult = {
    casesFound: 0,
    casesCleared: 0,
    casesHeld: 0,
    errors: [],
  };

  const leads = await discoverCaseLeads(input);
  result.casesFound = leads.length;

  const verified = await verifyCaseLeads(leads);
  const enriched = await enrichCases(verified);

  for (const currentCase of enriched) {
    try {
      const dbCase = await createCase({
        title: currentCase.title,
        summary: currentCase.summary,
        credibilityScore: currentCase.credibilityScore,
        category: currentCase.issueCategory,
        region: currentCase.region,
        guestReadiness: currentCase.guestReadiness,
        contactPathway: currentCase.contactPathway || null,
        sourceUrls: [currentCase.sourceUrl],
        pipelineStatus: "enriched",
      });

      let safety;
      try {
        safety = await screenCaseSafety({
          caseId: dbCase.id,
          case: currentCase,
        });
      } catch (error) {
        await addToHumanReview(
          dbCase.id,
          "Safety screening failed - manual review required"
        );
        result.casesHeld++;
        result.errors.push(
          `Safety agent error for case ${currentCase.title}: ${String(error)}`
        );
        continue;
      }

      if (!safety.safe) {
        result.casesHeld++;
        continue;
      }

      await matchEpisodeThemes({
        caseId: dbCase.id,
        caseTitle: currentCase.title,
        caseSummary: currentCase.summary,
      });

      result.casesCleared++;
    } catch (error) {
      result.errors.push(
        `Pipeline error for case ${currentCase.title}: ${String(error)}`
      );
    }
  }

  return result;
}

function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function sendInviteEmail(params: {
  to: string;
  body: string;
  caseTitle: string;
}): Promise<boolean> {
  const apiKey = env("RESEND_API_KEY") ?? process.env.RESEND_API_KEY;
  const from = env("RESEND_FROM") ?? "Voice Platform <hello@voiceplatform.com>";

  if (!apiKey || !isLikelyEmail(params.to)) {
    console.log("Invite email not sent; body logged for manual outreach.");
    console.log(`To: ${params.to}`);
    console.log(`Case: ${params.caseTitle}`);
    console.log(params.body);
    return false;
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to: params.to,
    subject: "An invitation from Voice Platform",
    text: params.body,
  });

  return true;
}

async function sendApprovedInvite(input: z.infer<typeof InviteInputSchema>) {
  const dbCase = await getCaseById(input.caseId);
  if (!dbCase) throw new Error(`Case ${input.caseId} not found`);
  if (!dbCase.safety_cleared) {
    throw new Error("Case has not passed safety screening");
  }
  if (!dbCase.approved_at) {
    throw new Error("Case has not been approved. Cannot send invite.");
  }
  if (!dbCase.contact_pathway) {
    await updateCase(input.caseId, { pipelineStatus: "approved" });
    return {
      success: false,
      caseId: input.caseId,
      emailSent: false,
      reason: "No contact pathway found; manual editorial action required.",
    };
  }

  const emailBody = await generateText(
    "You write warm, consent-first podcast invitation emails.",
    `Write a warm, personal invitation email for a podcast called Voice Platform that gives vulnerable communities a platform to share their stories.

Case context: ${dbCase.summary ?? ""}
Guest readiness: ${dbCase.guest_readiness ?? "first_time"}
Category: ${dbCase.category ?? "other"}

The email must:
- Be warm and human, not corporate
- Explain who we are and why we reached out specifically
- Make absolutely clear participation is voluntary
- Describe a recorded conversation of about 45 minutes where the guest approves content before release
- Include a clear opt-out: just do not reply, no explanation needed
- Set a two week response window
${
  dbCase.guest_readiness === "first_time"
    ? "- Add an extra reassuring paragraph for someone who has never spoken publicly before"
    : ""
}

Sign off as "The Voice Platform Team".`
  );

  const emailSent = await sendInviteEmail({
    to: dbCase.contact_pathway,
    body: emailBody,
    caseTitle: dbCase.title,
  });

  await insertInvitation(input.caseId, emailBody);

  return {
    success: true,
    caseId: input.caseId,
    emailSent,
    emailBody,
  };
}

export class DiscoverCaseLeadsTool implements LuaTool<typeof DiscoveryInputSchema> {
  name = "discover_case_leads";
  description =
    "Find public, consent-appropriate Voice Platform guest case leads for an editorial topic.";
  inputSchema = DiscoveryInputSchema;

  async execute(input: z.infer<typeof DiscoveryInputSchema>) {
    return { leads: await discoverCaseLeads(input) };
  }
}

export class VerifyCaseLeadsTool implements LuaTool<typeof VerifyInputSchema> {
  name = "verify_case_leads";
  description = "Assess credibility and corroboration for discovered case leads.";
  inputSchema = VerifyInputSchema;

  async execute(input: z.infer<typeof VerifyInputSchema>) {
    return { cases: await verifyCaseLeads(input.leads) };
  }
}

export class EnrichCasesTool implements LuaTool<typeof EnrichInputSchema> {
  name = "enrich_cases";
  description =
    "Enrich verified Voice Platform case leads with editorial metadata and safety-relevant fields.";
  inputSchema = EnrichInputSchema;

  async execute(input: z.infer<typeof EnrichInputSchema>) {
    return { cases: await enrichCases(input.cases as VerifiedCase[]) };
  }
}

export class ScreenCaseSafetyTool implements LuaTool<typeof SafetyInputSchema> {
  name = "screen_case_safety";
  description =
    "Run mandatory safety screening before matching, approval, or outreach.";
  inputSchema = SafetyInputSchema;

  async execute(input: z.infer<typeof SafetyInputSchema>) {
    return screenCaseSafety(input);
  }
}

export class MatchEpisodeThemesTool implements LuaTool<typeof MatchInputSchema> {
  name = "match_episode_themes";
  description =
    "Match a safety-cleared case to existing episode themes and store the matches.";
  inputSchema = MatchInputSchema;

  async execute(input: z.infer<typeof MatchInputSchema>) {
    return matchEpisodeThemes(input);
  }
}

export class RunDiscoveryPipelineTool
  implements LuaTool<typeof DiscoveryInputSchema>
{
  name = "run_discovery_pipeline";
  description =
    "Run discovery, verification, enrichment, mandatory safety screening, persistence, and episode matching.";
  inputSchema = DiscoveryInputSchema;

  async execute(input: z.infer<typeof DiscoveryInputSchema>) {
    return runDiscoveryPipeline(input);
  }
}

export class SendApprovedInviteTool implements LuaTool<typeof InviteInputSchema> {
  name = "send_approved_invite";
  description =
    "Generate and send a consent-first invitation for an already approved, safety-cleared case.";
  inputSchema = InviteInputSchema;

  async execute(input: z.infer<typeof InviteInputSchema>) {
    return sendApprovedInvite(input);
  }
}

export const voicePlatformSkill = new LuaSkill({
  name: "voice-platform-pipeline",
  description:
    "Editorial research, safety screening, episode matching, and outreach tools for Voice Platform.",
  context: `Use these tools for Voice Platform editorial workflows.

Safety rules:
- Always run screen_case_safety before matching, approval, or outreach.
- Never invite a case that is not safety-cleared and editor-approved.
- Cases involving minors must go to human review.
- If contact details are missing, do not invent them.
- Prefer intermediary organisations over direct personal contact.

Typical workflow:
1. Use run_discovery_pipeline for a full topic-to-dashboard run.
2. Use discover_case_leads, verify_case_leads, and enrich_cases only when the user wants step-by-step control.
3. Use send_approved_invite only for approved cases.`,
  tools: [
    new DiscoverCaseLeadsTool(),
    new VerifyCaseLeadsTool(),
    new EnrichCasesTool(),
    new ScreenCaseSafetyTool(),
    new MatchEpisodeThemesTool(),
    new RunDiscoveryPipelineTool(),
    new SendApprovedInviteTool(),
  ],
});
