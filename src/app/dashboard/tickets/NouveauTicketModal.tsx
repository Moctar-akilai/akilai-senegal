"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PrioriteTicket } from "@/lib/crm/statuts";

type Option = { id: string; label: string };

export function NouveauTicketModal({
  gestionnaireId,
  contacts,
  automatisations,
}: {
  gestionnaireId: string;
  contacts: Option[];
  automatisations: Option[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [contactId, setContactId] = useState("");
  const [automatisationId, setAutomatisationId] = useState("");
  const [priorite, setPriorite] = useState<PrioriteTicket>("normale");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  function reinitialiser() {
    setTitre("");
    setDescription("");
    setContactId("");
    setAutomatisationId("");
    setPriorite("normale");
    setErreur(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setErreur(null);

    const { data, error } = await supabase
      .from("tickets")
      .insert({
        gestionnaire_id: gestionnaireId,
        contact_id: contactId || null,
        automatisation_id: automatisationId || null,
        titre: titre.trim(),
        description: description.trim() || null,
        priorite,
      })
      .select("id")
      .single();

    if (error || !data) {
      setErreur(error?.message ?? "Impossible de créer le ticket.");
      setChargement(false);
      return;
    }

    setChargement(false);
    setOuvert(false);
    reinitialiser();
    router.push(`/dashboard/tickets/${data.id}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
      >
        + Nouveau ticket
      </button>

      {ouvert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
          onClick={() => setOuvert(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-base font-semibold text-neutral-900">Nouveau ticket</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Titre</label>
                <input
                  required
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Contact lié (optionnel)
                </label>
                <select
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
                >
                  <option value="">Aucun</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Automatisation concernée (optionnel)
                </label>
                <select
                  value={automatisationId}
                  onChange={(e) => setAutomatisationId(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
                >
                  <option value="">Aucune</option>
                  {automatisations.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Priorité</label>
                <select
                  value={priorite}
                  onChange={(e) => setPriorite(e.target.value as PrioriteTicket)}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
                >
                  <option value="basse">Basse</option>
                  <option value="normale">Normale</option>
                  <option value="haute">Haute</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

              {erreur && <p className="text-sm text-red-600">{erreur}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOuvert(false)}
                  className="flex-1 rounded-md border border-neutral-300 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={chargement}
                  className="flex-1 rounded-md bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {chargement ? "Création..." : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
