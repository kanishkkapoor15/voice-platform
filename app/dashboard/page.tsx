"use client";

import { useEffect, useState, useCallback } from "react";
import { CaseCard } from "@/components/ui/CaseCard";
import { InviteModal } from "@/components/ui/InviteModal";

interface CaseRecord {
  id: string;
  title: string;
  summary: string | null;
  credibilityScore: number | null;
  category: string | null;
  guestReadiness: string | null;
  contactPathway: string | null;
  pipelineStatus: string | null;
  episodeMatches: string | null;
}

const CATEGORIES = [
  { value: "harassment", label: "Harassment" },
  { value: "disability", label: "Disability" },
  { value: "refugee", label: "Refugee" },
  { value: "domestic_violence", label: "Domestic Violence" },
  { value: "medical_neglect", label: "Medical Neglect" },
  { value: "workplace_discrimination", label: "Workplace Discrimination" },
  { value: "other", label: "Other" },
];

const CATEGORY_COLORS: Record<string, string> = {
  harassment: "#6366f1",
  disability: "#22c55e",
  refugee: "#f59e0b",
  domestic_violence: "#ef4444",
  medical_neglect: "#3b82f6",
  workplace_discrimination: "#8b5cf6",
  other: "#6b7280",
};

const STATUSES = [
  { value: "pending", label: "Pending", color: "#9ca3af" },
  { value: "verified", label: "Verified", color: "#60a5fa" },
  { value: "enriched", label: "Enriched", color: "#34d399" },
  { value: "screened", label: "Screened", color: "#fbbf24" },
  { value: "matched", label: "Matched", color: "#a78bfa" },
  { value: "approved", label: "Approved", color: "#4ade80" },
  { value: "archived", label: "Archived", color: "#6b7280" },
  { value: "human_review", label: "Human Review", color: "#f87171" },
];

function PieChart({
  slices,
  size = 120,
}: {
  slices: { label: string; count: number; color: string }[];
  size?: number;
}) {
  const total = slices.reduce((s, d) => s + d.count, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  if (total === 0) {
    return (
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="#f3f4f6" />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize={11} fill="#9ca3af">
          No cases
        </text>
      </svg>
    );
  }

  const active = slices.filter((d) => d.count > 0);

  if (active.length === 1) {
    return (
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill={active[0].color} opacity={0.85} />
      </svg>
    );
  }

  let angle = -Math.PI / 2;
  return (
    <svg width={size} height={size}>
      {active.map((d, i) => {
        const sweep = (d.count / total) * 2 * Math.PI;
        const end = angle + sweep;
        const x1 = cx + r * Math.cos(angle);
        const y1 = cy + r * Math.sin(angle);
        const x2 = cx + r * Math.cos(end);
        const y2 = cy + r * Math.sin(end);
        const large = sweep > Math.PI ? 1 : 0;
        const path = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
        angle = end;
        return <path key={i} d={path} fill={d.color} opacity={0.85} />;
      })}
    </svg>
  );
}

function CategoryPieCard({
  category,
  label,
  cases,
}: {
  category: string;
  label: string;
  cases: CaseRecord[];
}) {
  const catCases = cases.filter((c) => c.category === category);
  const slices = STATUSES.map((s) => ({
    label: s.label,
    count: catCases.filter((c) => c.pipelineStatus === s.value).length,
    color: s.color,
  }));
  const activeSlices = slices.filter((s) => s.count > 0);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">{label}</h3>
      <div className="flex flex-col items-center gap-3">
        <PieChart slices={slices} size={120} />
        <div className="w-full space-y-1">
          {activeSlices.length === 0 ? (
            <p className="text-xs text-gray-400 text-center">No cases</p>
          ) : (
            activeSlices.map((s) => (
              <div key={s.label} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-xs text-gray-600">{s.label}</span>
                </div>
                <span className="text-xs font-semibold text-gray-800">{s.count}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryBarChart({ cases }: { cases: CaseRecord[] }) {
  const counts = CATEGORIES.map(({ value, label }) => ({
    label,
    value,
    count: cases.filter((c) => c.category === value).length,
  }));

  const max = Math.max(...counts.map((c) => c.count), 1);
  const barHeight = 32;
  const gap = 12;
  const labelWidth = 180;
  const chartWidth = 420;
  const svgHeight = counts.length * (barHeight + gap);

  return (
    <div className="overflow-x-auto">
      <svg
        width={labelWidth + chartWidth + 60}
        height={svgHeight}
        role="img"
        aria-label="Cases by category bar chart"
      >
        {counts.map(({ label, value, count }, i) => {
          const y = i * (barHeight + gap);
          const barW = count === 0 ? 0 : Math.max(4, (count / max) * chartWidth);
          const color = CATEGORY_COLORS[value] ?? "#6b7280";
          return (
            <g key={value}>
              <text
                x={labelWidth - 8}
                y={y + barHeight / 2 + 5}
                textAnchor="end"
                fontSize={13}
                fill="#374151"
              >
                {label}
              </text>
              <rect
                x={labelWidth}
                y={y}
                width={barW}
                height={barHeight}
                rx={4}
                fill={color}
                opacity={0.85}
              />
              <text
                x={labelWidth + barW + 8}
                y={y + barHeight / 2 + 5}
                fontSize={13}
                fill="#111827"
                fontWeight={600}
              >
                {count}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function DashboardPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteCase, setInviteCase] = useState<CaseRecord | null>(null);
  const [discoveryOpen, setDiscoveryOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [running, setRunning] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<string | null>(null);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"cases" | "analytics">("cases");

  const [filters, setFilters] = useState({
    category: "",
    status: "",
    readiness: "",
  });

  const [analyticsFilters, setAnalyticsFilters] = useState({
    status: "",
    readiness: "",
  });

  const [analyticsCases, setAnalyticsCases] = useState<CaseRecord[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const fetchCasesRef = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.category) params.set("category", filters.category);
    if (filters.status) params.set("status", filters.status);
    if (filters.readiness) params.set("readiness", filters.readiness);

    const res = await fetch(`/api/cases?${params}`);
    if (res.ok) {
      setCases(await res.json());
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const params = new URLSearchParams();
      if (filters.category) params.set("category", filters.category);
      if (filters.status) params.set("status", filters.status);
      if (filters.readiness) params.set("readiness", filters.readiness);
      const res = await fetch(`/api/cases?${params}`);
      if (!cancelled && res.ok) {
        setCases(await res.json());
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  useEffect(() => {
    if (activeTab !== "analytics") return;
    let cancelled = false;
    async function load() {
      setAnalyticsLoading(true);
      const params = new URLSearchParams();
      if (analyticsFilters.status) params.set("status", analyticsFilters.status);
      if (analyticsFilters.readiness) params.set("readiness", analyticsFilters.readiness);
      const res = await fetch(`/api/cases?${params}`);
      if (!cancelled && res.ok) {
        setAnalyticsCases(await res.json());
      }
      if (!cancelled) setAnalyticsLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [activeTab, analyticsFilters]);

  async function handleDiscovery() {
    setRunning(true);
    setDiscoveryError(null);
    setDiscoveryResult(null);
    const kw = keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/workflow/discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, keywords: kw }),
      });

      const data = await res.json();

      if (!res.ok) {
        setDiscoveryError(
          data.detail || data.error || `Request failed (${res.status})`
        );
      } else {
        setDiscoveryResult(
          `Found ${data.casesFound}, cleared ${data.casesCleared}, held ${data.casesHeld}` +
            (data.errors?.length ? ` — ${data.errors.length} error(s)` : "")
        );
        if (data.errors?.length) {
          console.error("Pipeline errors:", data.errors);
        }
        fetchCasesRef();
      }
    } catch (err) {
      setDiscoveryError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  async function handleArchive(id: string) {
    await fetch(`/api/cases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipeline_status: "archived" }),
    });
    fetchCasesRef();
  }

  const selectClass =
    "rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">Voice Platform</h1>
          <button
            onClick={() => setDiscoveryOpen(true)}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Run Discovery
          </button>
        </div>

        {/* Tabs */}
        <div className="mx-auto max-w-7xl px-6">
          <nav className="-mb-px flex gap-6">
            {(["cases", "analytics"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`border-b-2 pb-3 pt-1 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab === "cases" ? "Cases" : "Analytics"}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        {/* CASES TAB */}
        {activeTab === "cases" && (
          <>
            <div className="mb-6 flex flex-wrap gap-3">
              <select
                value={filters.category}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, category: e.target.value }))
                }
                className={selectClass}
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, status: e.target.value }))
                }
                className={selectClass}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="enriched">Enriched</option>
                <option value="screened">Screened</option>
                <option value="matched">Matched</option>
                <option value="approved">Approved</option>
                <option value="archived">Archived</option>
                <option value="human_review">Human Review</option>
              </select>

              <select
                value={filters.readiness}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, readiness: e.target.value }))
                }
                className={selectClass}
              >
                <option value="">All Readiness</option>
                <option value="experienced">Experienced</option>
                <option value="first_time">First Time</option>
              </select>
            </div>

            {loading ? (
              <p className="text-gray-500">Loading cases...</p>
            ) : cases.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                <p className="text-gray-500">
                  No cases yet. Run a discovery workflow to find potential
                  guests.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {cases.map((c) => (
                  <CaseCard
                    key={c.id}
                    {...c}
                    onApprove={(id) => {
                      const found = cases.find((x) => x.id === id);
                      if (found) setInviteCase(found);
                    }}
                    onArchive={handleArchive}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === "analytics" && (
          <>
            <div className="mb-6 flex flex-wrap gap-3">
              <select
                value={analyticsFilters.status}
                onChange={(e) =>
                  setAnalyticsFilters((f) => ({ ...f, status: e.target.value }))
                }
                className={selectClass}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="enriched">Enriched</option>
                <option value="screened">Screened</option>
                <option value="matched">Matched</option>
                <option value="approved">Approved</option>
                <option value="archived">Archived</option>
                <option value="human_review">Human Review</option>
              </select>

              <select
                value={analyticsFilters.readiness}
                onChange={(e) =>
                  setAnalyticsFilters((f) => ({
                    ...f,
                    readiness: e.target.value,
                  }))
                }
                className={selectClass}
              >
                <option value="">All Readiness</option>
                <option value="experienced">Experienced</option>
                <option value="first_time">First Time</option>
              </select>
            </div>

            {analyticsLoading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : (
              <div className="space-y-6">
                {/* Bar chart */}
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-6 text-base font-semibold text-gray-900">
                    Cases by Category
                    {analyticsFilters.status || analyticsFilters.readiness ? (
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        (filtered
                        {analyticsFilters.status ? ` · ${analyticsFilters.status}` : ""}
                        {analyticsFilters.readiness ? ` · ${analyticsFilters.readiness}` : ""}
                        )
                      </span>
                    ) : null}
                  </h2>
                  <CategoryBarChart cases={analyticsCases} />
                  <p className="mt-4 text-xs text-gray-400">
                    {analyticsCases.length} total case{analyticsCases.length !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Pie charts */}
                <div>
                  <h2 className="mb-4 text-base font-semibold text-gray-900">
                    Status Breakdown by Category
                  </h2>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {CATEGORIES.map(({ value, label }) => (
                      <CategoryPieCard
                        key={value}
                        category={value}
                        label={label}
                        cases={analyticsCases}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Discovery Modal */}
      {discoveryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">
              Run Discovery
            </h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Topic
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  placeholder="e.g. disability rights in Ireland"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  placeholder="e.g. accessibility, inclusion, advocacy"
                />
              </div>
            </div>

            {running && (
              <div className="mt-4 rounded-md bg-blue-50 border border-blue-200 p-3">
                <p className="text-sm text-blue-800">
                  Running pipeline... this can take 1–5 minutes for the agents
                  to discover, verify, enrich, screen, and match cases. Please
                  wait.
                </p>
              </div>
            )}

            {discoveryResult && (
              <div className="mt-4 rounded-md bg-green-50 border border-green-200 p-3">
                <p className="text-sm text-green-800">{discoveryResult}</p>
              </div>
            )}

            {discoveryError && (
              <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-3">
                <p className="text-sm font-medium text-red-800">
                  Pipeline error
                </p>
                <p className="mt-1 text-xs text-red-700 whitespace-pre-wrap">
                  {discoveryError}
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDiscoveryOpen(false)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDiscovery}
                disabled={running || !topic}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {running ? "Running..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {inviteCase && (
        <InviteModal
          caseId={inviteCase.id}
          caseTitle={inviteCase.title}
          onClose={() => setInviteCase(null)}
          onSent={() => {
            setInviteCase(null);
            fetchCasesRef();
          }}
        />
      )}
    </div>
  );
}
