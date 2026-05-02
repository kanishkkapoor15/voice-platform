"use client";

const CATEGORY_COLORS: Record<string, string> = {
  harassment: "bg-red-50 text-red-700 ring-red-600/20",
  disability: "bg-blue-50 text-blue-700 ring-blue-600/20",
  refugee: "bg-amber-50 text-amber-700 ring-amber-600/20",
  domestic_violence: "bg-purple-50 text-purple-700 ring-purple-600/20",
  medical_neglect: "bg-pink-50 text-pink-700 ring-pink-600/20",
  workplace_discrimination: "bg-orange-50 text-orange-700 ring-orange-600/20",
  other: "bg-gray-50 text-gray-700 ring-gray-600/20",
};

const CATEGORY_LABELS: Record<string, string> = {
  harassment: "Harassment",
  disability: "Disability",
  refugee: "Refugee",
  domestic_violence: "Domestic Violence",
  medical_neglect: "Medical Neglect",
  workplace_discrimination: "Workplace Discrimination",
  other: "Other",
};

export function CategoryTag({ category }: { category: string | null }) {
  if (!category) return null;

  const color = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other;
  const label = CATEGORY_LABELS[category] ?? category;

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${color}`}>
      {label}
    </span>
  );
}
