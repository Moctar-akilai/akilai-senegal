"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ecrireDashboard } from "@/lib/dashboard/ecrire";
import { STATUT_CONTACT_LABEL, type StatutContact } from "@/lib/crm/statuts";

const STATUTS: StatutContact[] = ["prospect", "contacte", "client", "inactif"];

export function ContactInfoForm({
  contactId,
  statutInitial,
  notesInitial,
}: {
  contactId: string;
  statutInitial: StatutContact;
  notesInitial: string;
}) {
  const router = useRouter();
  const [statut, setStatut] = useState(statutInitial);
  const [notes, setNotes] = useState(notesInitial);
  const [messageStatut, setMessageStatut] = useState<string | null>(null);
  const [messageNotes, setMessageNotes] = useState<string | null>(null);
  const [chargementNotes, setChargementNotes] = useState(false);

  // ⚠️ Contournement temporaire de l'authentification — écrit via
  // /api/dashboard/write (service_role côté serveur), RLS-bloqué sinon
  // tant que le bypass est actif. Voir le commentaire en haut de cette
  // route API.
  async function changerStatut(nouveauStatut: StatutContact) {
    setStatut(nouveauStatut);
    setMessageStatut(null);
    const resultat = await ecrireDashboard("contact.updateStatut", {
      id: contactId,
      statut: nouveauStatut,
    });
    setMessageStatut(!resultat.ok ? resultat.error : "Statut mis à jour.");
    router.refresh();
  }

  async function enregistrerNotes() {
    setChargementNotes(true);
    setMessageNotes(null);
    const resultat = await ecrireDashboard("contact.updateNotes", {
      id: contactId,
      notes: notes.trim() || null,
    });
    setMessageNotes(!resultat.ok ? resultat.error : "Notes enregistrées.");
    setChargementNotes(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Statut</label>
        <select
          value={statut}
          onChange={(e) => changerStatut(e.target.value as StatutContact)}
          className="w-full max-w-xs rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        >
          {STATUTS.map((s) => (
            <option key={s} value={s}>
              {STATUT_CONTACT_LABEL[s]}
            </option>
          ))}
        </select>
        {messageStatut && <p className="mt-1 text-xs text-neutral-500">{messageStatut}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder="Notes internes sur ce contact…"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            disabled={chargementNotes}
            onClick={enregistrerNotes}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {chargementNotes ? "Enregistrement..." : "Enregistrer"}
          </button>
          {messageNotes && <p className="text-xs text-neutral-500">{messageNotes}</p>}
        </div>
      </div>
    </div>
  );
}
