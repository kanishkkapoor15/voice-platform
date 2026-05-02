"use client";

export function CredibilityBadge({ score }: { score: number | null }) {
  if (score === null) return null;

  let color = "bg-red-100 text-red-800";
  if (score >= 70) color = "bg-green-100 text-green-800";
  else if (score >= 40) color = "bg-yellow-100 text-yellow-800";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {score}%
    </span>
  );
}
