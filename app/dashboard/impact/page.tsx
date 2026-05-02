"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/ui/StatCard";

interface ImpactMetrics {
  totalGuestsAppeared: number;
  episodesProduced: number;
  communitiesRepresented: number;
  guestsByCategory: { category: string | null; count: number }[];
}

const CATEGORY_LABELS: Record<string, string> = {
  harassment: "Harassment",
  disability: "Disability",
  refugee: "Refugee",
  domestic_violence: "Domestic Violence",
  medical_neglect: "Medical Neglect",
  workplace_discrimination: "Workplace Disc.",
  other: "Other",
};

export default function ImpactPage() {
  const [metrics, setMetrics] = useState<ImpactMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/impact");
      if (res.ok) {
        setMetrics(await res.json());
      }
      setLoading(false);
    }
    load();
  }, []);

  const maxCount = metrics
    ? Math.max(...metrics.guestsByCategory.map((g) => g.count), 1)
    : 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">Voice Platform</h1>
          <nav className="flex gap-4 text-sm">
            <a href="/dashboard" className="text-gray-500 hover:text-gray-900">
              Cases
            </a>
            <a
              href="/dashboard/tracker"
              className="text-gray-500 hover:text-gray-900"
            >
              Tracker
            </a>
            <span className="font-medium text-indigo-600">Impact</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <h2 className="mb-6 text-lg font-semibold text-gray-900">
          Impact Metrics
        </h2>

        {loading ? (
          <p className="text-gray-500">Loading metrics...</p>
        ) : !metrics ? (
          <p className="text-gray-500">Unable to load metrics.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total Guests Appeared"
                value={metrics.totalGuestsAppeared}
              />
              <StatCard
                label="Episodes Produced"
                value={metrics.episodesProduced}
              />
              <StatCard
                label="Communities Represented"
                value={metrics.communitiesRepresented}
              />
              <StatCard label="Audience Reach" value="—" />
            </div>

            <div className="mt-8">
              <h3 className="mb-4 text-sm font-semibold text-gray-700">
                Guests by Issue Category
              </h3>
              <div className="space-y-3">
                {metrics.guestsByCategory.map((g) => (
                  <div key={g.category ?? "unknown"} className="flex items-center gap-3">
                    <span className="w-36 text-sm text-gray-600 text-right">
                      {CATEGORY_LABELS[g.category ?? ""] ?? g.category ?? "Unknown"}
                    </span>
                    <div className="flex-1">
                      <div
                        className="h-6 rounded bg-indigo-500"
                        style={{
                          width: `${(g.count / maxCount) * 100}%`,
                          minWidth: g.count > 0 ? "1rem" : "0",
                        }}
                      />
                    </div>
                    <span className="w-8 text-sm font-medium text-gray-700">
                      {g.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
