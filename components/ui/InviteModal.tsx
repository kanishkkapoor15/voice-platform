"use client";

import { useState } from "react";
import { SafetyBanner } from "./SafetyBanner";

interface InviteModalProps {
  caseId: string;
  caseTitle: string;
  onClose: () => void;
  onSent: () => void;
}

export function InviteModal({ caseId, caseTitle, onClose, onSent }: InviteModalProps) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setSending(true);
    setError(null);

    try {
      const res = await fetch(`/api/cases/${caseId}/approve`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send invite");
      }

      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">
          Approve & Send Invite
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Sending invitation for: <strong>{caseTitle}</strong>
        </p>

        <div className="mt-4">
          <SafetyBanner />
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send Invite"}
          </button>
        </div>
      </div>
    </div>
  );
}
