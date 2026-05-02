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
  const [filters, setFilters] = useState({
    category: "",
    status: "",
    readiness: "",
  });

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
    return () => { cancelled = true; };
  }, [filters]);

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
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        {/* Filter bar */}
        <div className="mb-6 flex flex-wrap gap-3">
          <select
            value={filters.category}
            onChange={(e) =>
              setFilters((f) => ({ ...f, category: e.target.value }))
            }
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700"
          >
            <option value="">All Categories</option>
            <option value="harassment">Harassment</option>
            <option value="disability">Disability</option>
            <option value="refugee">Refugee</option>
            <option value="domestic_violence">Domestic Violence</option>
            <option value="medical_neglect">Medical Neglect</option>
            <option value="workplace_discrimination">Workplace Discrimination</option>
            <option value="other">Other</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((f) => ({ ...f, status: e.target.value }))
            }
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700"
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
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700"
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
              No cases yet. Run a discovery workflow to find potential guests.
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
                  Running pipeline... this can take 1–5 minutes for the agents to
                  discover, verify, enrich, screen, and match cases. Please wait.
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
                <p className="text-sm font-medium text-red-800">Pipeline error</p>
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
