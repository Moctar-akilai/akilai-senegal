"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ecrireDashboard } from "@/lib/dashboard/ecrire";
import type { PrioriteTicket } from "@/lib/crm/statuts";

type Option = { id: string; label: string };

export function NouveauTicketModal({ automatisations }: { automatisations: Option[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [automatisationId, setAutomatisationId] = useState("");
  const [priorite, setPriorite] = useState<PrioriteTicket>("normale");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  function reinitialiser() {
    setTitre("");
    setDescription("");
    setAutomatisationId("");
    setPriorite("normale");
    setErreur(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setErreur(null);

    // ⚠️ Contournement temporaire de l'authentification — écrit via
    // /api/dashboard/write (service_role côté serveur), RLS-bloqué sinon
    // tant que le bypass est actif. Voir le commentaire en haut de cette
    // route API.
    const resultat = await ecrireDashboard<{ id: string }>("ticket.create", {
      titre: titre.trim(),
      description: description.trim() || null,
      automatisationId: automatisationId || null,
      priorite,
    });

    if (!resultat.ok) {
      setErreur(resultat.error);
      setChargement(false);
      return;
    }

    setChargement(false);
    setOuvert(false);
    reinitialiser();
    router.push(`/dashboard/tickets/${resultat.data.id}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="rounded-lg bg-argile-forte px-4 py-2 text-sm font-medium text-white hover:bg-argile"
      >
        + Nouveau ticket
      </button>

      {ouvert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
          onClick={() => setOuvert(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-bordure bg-carte p-6 shadow-[var(--shadow-flottant)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-base font-semibold text-encre">Nouveau ticket</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-encre">Titre</label>
                <input
                  required
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-encre">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-encre">
                  Automatisation concernée (optionnel)
                </label>
                <select
                  value={automatisationId}
                  onChange={(e) => setAutomatisationId(e.target.value)}
                  className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
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
                <label className="mb-1 block text-sm font-medium text-encre">Priorité</label>
                <select
                  value={priorite}
                  onChange={(e) => setPriorite(e.target.value as PrioriteTicket)}
                  className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
                >
                  <option value="basse">Basse</option>
                  <option value="normale">Normale</option>
                  <option value="haute">Haute</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

              {erreur && <p className="text-sm text-erreur">{erreur}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOuvert(false)}
                  className="flex-1 rounded-lg border border-bordure py-2 text-sm font-medium text-encre hover:bg-bordure/60"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={chargement}
                  className="flex-1 rounded-lg bg-argile-forte py-2 text-sm font-medium text-white hover:bg-argile disabled:opacity-50"
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
