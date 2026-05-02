"use client";

import { useEffect, useState, useCallback } from "react";
import { KanbanBoard } from "@/components/ui/KanbanBoard";

interface InvitationRecord {
  id: string;
  caseTitle: string;
  status: string;
  sentAt: string | null;
}

export default function TrackerPage() {
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvitations = useCallback(async () => {
    const res = await fetch("/api/invitations");
    if (res.ok) {
      setInvitations(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/invitations");
      if (!cancelled && res.ok) {
        setInvitations(await res.json());
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handleStatusChange(id: string, newStatus: string) {
    await fetch(`/api/invitations/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchInvitations();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">Voice Platform</h1>
          <nav className="flex gap-4 text-sm">
            <a href="/dashboard" className="text-gray-500 hover:text-gray-900">
              Cases
            </a>
            <span className="font-medium text-indigo-600">Tracker</span>
            <a
              href="/dashboard/impact"
              className="text-gray-500 hover:text-gray-900"
            >
              Impact
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <h2 className="mb-6 text-lg font-semibold text-gray-900">
          Follow-up Tracker
        </h2>
        {loading ? (
          <p className="text-gray-500">Loading invitations...</p>
        ) : invitations.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-500">
              No invitations yet. Approve cases from the dashboard to see them
              here.
            </p>
          </div>
        ) : (
          <KanbanBoard
            invitations={invitations}
            onStatusChange={handleStatusChange}
          />
        )}
      </main>
    </div>
  );
}
