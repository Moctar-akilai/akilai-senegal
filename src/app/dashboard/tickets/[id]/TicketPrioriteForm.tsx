"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PRIORITE_TICKET_LABEL, type PrioriteTicket } from "@/lib/crm/statuts";

const PRIORITES: PrioriteTicket[] = ["basse", "normale", "haute", "urgente"];

// Le gestionnaire peut ajuster la priorité perçue de son côté, mais pas le
// statut du ticket (ouvert/en_cours/résolu/fermé) : ce sera une action
// réservée à l'équipe support, via le futur backoffice.
export function TicketPrioriteForm({
  ticketId,
  prioriteInitiale,
}: {
  ticketId: string;
  prioriteInitiale: PrioriteTicket;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [priorite, setPriorite] = useState(prioriteInitiale);
  const [message, setMessage] = useState<string | null>(null);

  async function changerPriorite(nouvellePriorite: PrioriteTicket) {
    setPriorite(nouvellePriorite);
    setMessage(null);
    const { error } = await supabase
      .from("tickets")
      .update({ priorite: nouvellePriorite, updated_at: new Date().toISOString() })
      .eq("id", ticketId);
    setMessage(error ? error.message : "Enregistré.");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">Priorité</label>
        <select
          value={priorite}
          onChange={(e) => changerPriorite(e.target.value as PrioriteTicket)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-900"
        >
          {PRIORITES.map((p) => (
            <option key={p} value={p}>
              {PRIORITE_TICKET_LABEL[p]}
            </option>
          ))}
        </select>
      </div>
      {message && <p className="text-xs text-neutral-400">{message}</p>}
    </div>
  );
}
