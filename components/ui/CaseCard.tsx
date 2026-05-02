"use client";

import { CredibilityBadge } from "./CredibilityBadge";
import { CategoryTag } from "./CategoryTag";
import { GuestReadinessChip } from "./GuestReadinessChip";

interface EpisodeMatch {
  episodeId: string;
  title: string;
  relevanceScore: number;
  matchExplanation: string;
}

interface CaseCardProps {
  id: string;
  title: string;
  summary: string | null;
  credibilityScore: number | null;
  category: string | null;
  guestReadiness: string | null;
  contactPathway: string | null;
  pipelineStatus: string | null;
  episodeMatches: string | EpisodeMatch[] | null;
  onApprove: (id: string) => void;
  onArchive: (id: string) => void;
}

export function CaseCard({
  id,
  title,
  summary,
  credibilityScore,
  category,
  guestReadiness,
  contactPathway,
  pipelineStatus,
  episodeMatches,
  onApprove,
  onArchive,
}: CaseCardProps) {
  let matches: EpisodeMatch[] = [];
  try {
    if (typeof episodeMatches === "string") {
      matches = JSON.parse(episodeMatches);
    } else if (Array.isArray(episodeMatches)) {
      matches = episodeMatches;
    }
  } catch {
    // invalid JSON
  }

  const topMatch = matches[0];
  const canApprove = pipelineStatus === "matched";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <h3 className="text-base font-semibold text-gray-900 line-clamp-1">
          {title}
        </h3>
        <CredibilityBadge score={credibilityScore} />
      </div>

      {summary && (
        <p className="mt-2 text-sm text-gray-600 line-clamp-3">{summary}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <CategoryTag category={category} />
        <GuestReadinessChip readiness={guestReadiness} />
        {pipelineStatus && (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            {pipelineStatus}
          </span>
        )}
      </div>

      {topMatch && (
        <div className="mt-3 rounded-md bg-indigo-50 p-2">
          <p className="text-xs font-medium text-indigo-700">
            Top match: {topMatch.title}
          </p>
          <p className="text-xs text-indigo-600">{topMatch.matchExplanation}</p>
        </div>
      )}

      {contactPathway && (
        <p className="mt-2 text-xs text-gray-400 truncate">
          Contact: {contactPathway}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onApprove(id)}
          disabled={!canApprove}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Approve
        </button>
        <button
          onClick={() => onArchive(id)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Archive
        </button>
      </div>
    </div>
  );
}
