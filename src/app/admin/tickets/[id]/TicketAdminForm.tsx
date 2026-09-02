"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ecrireAdmin } from "@/lib/admin/ecrire";
import {
  STATUT_TICKET_LABEL,
  PRIORITE_TICKET_LABEL,
  type StatutTicket,
  type PrioriteTicket,
} from "@/lib/crm/statuts";

const STATUTS: StatutTicket[] = ["ouvert", "en_cours", "resolu", "ferme"];
const PRIORITES: PrioriteTicket[] = ["basse", "normale", "haute", "urgente"];

export function TicketAdminForm({
  ticketId,
  statutInitial,
  prioriteInitiale,
}: {
  ticketId: string;
  statutInitial: StatutTicket;
  prioriteInitiale: PrioriteTicket;
}) {
  const router = useRouter();
  const [statut, setStatut] = useState(statutInitial);
  const [priorite, setPriorite] = useState(prioriteInitiale);
  const [messageStatut, setMessageStatut] = useState<string | null>(null);

  const [contenu, setContenu] = useState("");
  const [chargementReponse, setChargementReponse] = useState(false);
  const [erreurReponse, setErreurReponse] = useState<string | null>(null);

  async function changerStatut(nouveauStatut: StatutTicket) {
    setStatut(nouveauStatut);
    setMessageStatut(null);
    const resultat = await ecrireAdmin("ticket.updateStatutPriorite", { ticketId, statut: nouveauStatut });
    setMessageStatut(!resultat.ok ? resultat.error : "Enregistré.");
    router.refresh();
  }

  async function changerPriorite(nouvellePriorite: PrioriteTicket) {
    setPriorite(nouvellePriorite);
    setMessageStatut(null);
    const resultat = await ecrireAdmin("ticket.updateStatutPriorite", { ticketId, priorite: nouvellePriorite });
    setMessageStatut(!resultat.ok ? resultat.error : "Enregistré.");
    router.refresh();
  }

  async function envoyerReponse(e: React.FormEvent) {
    e.preventDefault();
    if (!contenu.trim()) return;
    setChargementReponse(true);
    setErreurReponse(null);

    // Insère le message support, marque lu_par_gestionnaire=false et
    // envoie l'email de notification au gestionnaire — le tout côté
    // serveur, voir /api/admin/write (action ticket.addMessageSupport).
    const resultat = await ecrireAdmin("ticket.addMessageSupport", { ticketId, contenu: contenu.trim() });

    if (!resultat.ok) {
      setErreurReponse(resultat.error);
      setChargementReponse(false);
      return;
    }

    setContenu("");
    setChargementReponse(false);
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-texte-secondaire">Statut</label>
          <select
            value={statut}
            onChange={(e) => changerStatut(e.target.value as StatutTicket)}
            className="rounded-lg border border-bordure px-3 py-1.5 text-sm outline-none focus:border-argile-forte"
          >
            {STATUTS.map((s) => (
              <option key={s} value={s}>
                {STATUT_TICKET_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-texte-secondaire">Priorité</label>
          <select
            value={priorite}
            onChange={(e) => changerPriorite(e.target.value as PrioriteTicket)}
            className="rounded-lg border border-bordure px-3 py-1.5 text-sm outline-none focus:border-argile-forte"
          >
            {PRIORITES.map((p) => (
              <option key={p} value={p}>
                {PRIORITE_TICKET_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
        {messageStatut && <p className="text-xs text-texte-secondaire">{messageStatut}</p>}
      </div>

      <form onSubmit={envoyerReponse} className="mt-4 border-t border-bordure pt-4">
        <textarea
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          rows={3}
          placeholder="Répondre au client…"
          className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
        />
        {erreurReponse && <p className="mt-1 text-sm text-erreur">{erreurReponse}</p>}
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-texte-secondaire">
            Une notification par email sera envoyée au gestionnaire.
          </p>
          <button
            type="submit"
            disabled={chargementReponse || !contenu.trim()}
            className="rounded-lg bg-argile-forte px-4 py-2 text-sm font-medium text-white hover:bg-argile disabled:opacity-50"
          >
            {chargementReponse ? "Envoi..." : "Répondre"}
          </button>
        </div>
      </form>
    </div>
  );
}
