"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ecrireDashboard } from "@/lib/dashboard/ecrire";
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
  const router = useRouter();
  const [priorite, setPriorite] = useState(prioriteInitiale);
  const [message, setMessage] = useState<string | null>(null);

  // ⚠️ Contournement temporaire de l'authentification — écrit via
  // /api/dashboard/write (service_role côté serveur), RLS-bloqué sinon
  // tant que le bypass est actif. Voir le commentaire en haut de cette
  // route API.
  async function changerPriorite(nouvellePriorite: PrioriteTicket) {
    setPriorite(nouvellePriorite);
    setMessage(null);
    const resultat = await ecrireDashboard("ticket.updatePriorite", {
      id: ticketId,
      priorite: nouvellePriorite,
    });
    setMessage(!resultat.ok ? resultat.error : "Enregistré.");
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
