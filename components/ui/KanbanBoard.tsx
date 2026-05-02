"use client";

import { useState } from "react";

interface InvitationCard {
  id: string;
  caseTitle: string;
  status: string;
  sentAt: string | null;
}

const COLUMNS = [
  { key: "sent", label: "Sent" },
  { key: "opened", label: "Opened" },
  { key: "responded", label: "Responded" },
  { key: "confirmed", label: "Confirmed" },
  { key: "recorded", label: "Recorded" },
  { key: "aired", label: "Aired" },
] as const;

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function KanbanBoard({
  invitations,
  onStatusChange,
}: {
  invitations: InvitationCard[];
  onStatusChange: (id: string, newStatus: string) => void;
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null);

  function handleDragStart(id: string) {
    setDraggedId(id);
  }

  function handleDrop(newStatus: string) {
    if (draggedId) {
      onStatusChange(draggedId, newStatus);
      setDraggedId(null);
    }
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const cards = invitations.filter((inv) => inv.status === col.key);
        return (
          <div
            key={col.key}
            className="min-w-[200px] flex-1 rounded-lg bg-gray-50 p-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(col.key)}
          >
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              {col.label}{" "}
              <span className="text-gray-400">({cards.length})</span>
            </h3>
            <div className="flex flex-col gap-2">
              {cards.map((card) => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={() => handleDragStart(card.id)}
                  className="cursor-grab rounded-md border border-gray-200 bg-white p-3 shadow-sm active:cursor-grabbing"
                >
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">
                    {card.caseTitle}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {daysSince(card.sentAt)} days in state
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
