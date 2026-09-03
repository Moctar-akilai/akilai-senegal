"use client";

import type { Lead } from "@/lib/admin/leads";

// draggable natif (HTML5 DnD, pas de librairie) : le seul payload transmis
// est l'id du lead, lu par la colonne cible dans LeadsKanban.tsx.
export function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", lead.id)}
      onClick={onClick}
      className="cursor-grab rounded-lg border border-bordure bg-carte p-3 shadow-[var(--shadow-carte)] hover:border-argile-forte active:cursor-grabbing"
    >
      <p className="truncate text-sm font-medium text-encre">{lead.nom}</p>
      {lead.entreprise && <p className="truncate text-xs text-texte-secondaire">{lead.entreprise}</p>}
      {(lead.planEstime || lead.source) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {lead.planEstime && (
            <span className="rounded-full bg-neutre-pastel px-2 py-0.5 text-[11px] font-medium text-neutre-pastel-texte">
              {lead.planEstime}
            </span>
          )}
          {lead.source && (
            <span className="rounded-full bg-bordure px-2 py-0.5 text-[11px] font-medium text-texte-secondaire">
              {lead.source}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
