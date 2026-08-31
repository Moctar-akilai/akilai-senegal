"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  PRIORITE_TICKET_LABEL,
  STATUT_TICKET_LABEL,
  type PrioriteTicket,
  type StatutTicket,
} from "@/lib/crm/statuts";

const PRIORITES: PrioriteTicket[] = ["basse", "normale", "haute", "urgente"];
const STATUTS: StatutTicket[] = ["ouvert", "en_cours", "resolu", "ferme"];

export function TicketStatutPrioriteForm({
  ticketId,
  prioriteInitiale,
  statutInitial,
}: {
  ticketId: string;
  prioriteInitiale: PrioriteTicket;
  statutInitial: StatutTicket;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [priorite, setPriorite] = useState(prioriteInitiale);
  const [statut, setStatut] = useState(statutInitial);
  const [message, setMessage] = useState<string | null>(null);

  async function enregistrer(champs: { priorite?: PrioriteTicket; statut?: StatutTicket }) {
    setMessage(null);
    const { error } = await supabase
      .from("tickets")
      .update({ ...champs, updated_at: new Date().toISOString() })
      .eq("id", ticketId);
    setMessage(error ? error.message : "Enregistré.");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">Priorité</label>
        <select
          value={priorite}
          onChange={(e) => {
            const v = e.target.value as PrioriteTicket;
            setPriorite(v);
            enregistrer({ priorite: v });
          }}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-900"
        >
          {PRIORITES.map((p) => (
            <option key={p} value={p}>
              {PRIORITE_TICKET_LABEL[p]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">Statut</label>
        <select
          value={statut}
          onChange={(e) => {
            const v = e.target.value as StatutTicket;
            setStatut(v);
            enregistrer({ statut: v });
          }}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-900"
        >
          {STATUTS.map((s) => (
            <option key={s} value={s}>
              {STATUT_TICKET_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
      {message && <p className="text-xs text-neutral-400">{message}</p>}
    </div>
  );
}
