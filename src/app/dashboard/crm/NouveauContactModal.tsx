"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ecrireDashboard } from "@/lib/dashboard/ecrire";

type Statut = "prospect" | "contacte" | "client" | "inactif";

export function NouveauContactModal() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [statut, setStatut] = useState<Statut>("prospect");
  const [notes, setNotes] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  function reinitialiser() {
    setNom("");
    setTelephone("");
    setEmail("");
    setStatut("prospect");
    setNotes("");
    setErreur(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setErreur(null);

    // ⚠️ Contournement temporaire de l'authentification — écrit via
    // /api/dashboard/write (service_role côté serveur), RLS-bloqué sinon
    // tant que le bypass est actif. Voir le commentaire en haut de cette
    // route API. Le gestionnaire cible vient de getGestionnaireActuel()
    // côté serveur, pas d'un id transmis par le client.
    const resultat = await ecrireDashboard("contact.create", {
      nom: nom.trim() || null,
      telephone: telephone.trim(),
      email: email.trim() || null,
      statut,
      notes: notes.trim() || null,
    });

    if (!resultat.ok) {
      setErreur(resultat.error);
      setChargement(false);
      return;
    }

    setChargement(false);
    setOuvert(false);
    reinitialiser();
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="rounded-lg bg-argile-forte px-4 py-2 text-sm font-medium text-white hover:bg-argile"
      >
        + Nouveau contact
      </button>

      {ouvert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
          onClick={() => setOuvert(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-bordure bg-carte p-6 shadow-[var(--shadow-flottant)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-base font-semibold text-encre">Nouveau contact</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-encre">Nom</label>
                <input
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-encre">Téléphone</label>
                <input
                  required
                  placeholder="+221771234567"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-encre">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-encre">Statut</label>
                <select
                  value={statut}
                  onChange={(e) => setStatut(e.target.value as Statut)}
                  className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
                >
                  <option value="prospect">Prospect</option>
                  <option value="contacte">Contacté</option>
                  <option value="client">Client</option>
                  <option value="inactif">Inactif</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-encre">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
                />
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
                  {chargement ? "Ajout..." : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
