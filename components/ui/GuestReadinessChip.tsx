"use client";

export function GuestReadinessChip({ readiness }: { readiness: string | null }) {
  if (!readiness) return null;

  const isExperienced = readiness === "experienced";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isExperienced
          ? "bg-emerald-50 text-emerald-700"
          : "bg-sky-50 text-sky-700"
      }`}
    >
      {isExperienced ? "Experienced" : "First Time"}
    </span>
  );
}
