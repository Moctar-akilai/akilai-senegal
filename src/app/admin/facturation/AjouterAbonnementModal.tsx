"use client";

import { useState } from "react";
import { ecrireAdmin } from "@/lib/admin/ecrire";
import { ajouterUnMois } from "@/lib/admin/facturation";

type ClientSansAbonnement = { id: string; nom: string; plan: string };

function aujourdHuiISO() {
  return new Date().toISOString().slice(0, 10);
}

// Le parent démonte ce composant quand la modale est fermée : le
// formulaire repart à neuf à chaque ouverture (même schéma que
// ConfigurerBaseNotionModal.tsx / NouveauRdvModal.tsx).
export function AjouterAbonnementModal({
  ouvert,
  onFermer,
  onCree,
  clients,
  prixPlans,
}: {
  ouvert: boolean;
  onFermer: () => void;
  onCree: () => void;
  clients: ClientSansAbonnement[];
  prixPlans: Record<string, number>;
}) {
  if (!ouvert) return null;
  return (
    <FormulaireAjoutAbonnement onFermer={onFermer} onCree={onCree} clients={clients} prixPlans={prixPlans} />
  );
}

function FormulaireAjoutAbonnement({
  onFermer,
  onCree,
  clients,
  prixPlans,
}: {
  onFermer: () => void;
  onCree: () => void;
  clients: ClientSansAbonnement[];
  prixPlans: Record<string, number>;
}) {
  const premierClient = clients[0];
  const [gestionnaireId, setGestionnaireId] = useState(premierClient?.id ?? "");
  const [montant, setMontant] = useState(() => String(prixPlans[premierClient?.plan ?? ""] ?? ""));
  const [dateSignature, setDateSignature] = useState(aujourdHuiISO());
  const [dateProchainPaiement, setDateProchainPaiement] = useState(ajouterUnMois(aujourdHuiISO()));
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  function changerClient(id: string) {
    setGestionnaireId(id);
    const client = clients.find((c) => c.id === id);
    setMontant(String(prixPlans[client?.plan ?? ""] ?? ""));
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    const montantNombre = Number(montant);
    if (!gestionnaireId || !montantNombre || montantNombre <= 0 || !dateSignature || !dateProchainPaiement) {
      setErreur("Tous les champs sont requis.");
      return;
    }
    setChargement(true);
    setErreur(null);

    const resultat = await ecrireAdmin("abonnement.create", {
      gestionnaireId,
      montantMensuel: montantNombre,
      dateSignature,
      dateProchainPaiement,
    });

    if (!resultat.ok) {
      setErreur(resultat.error);
      setChargement(false);
      return;
    }

    setChargement(false);
    onCree();
    onFermer();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onFermer}>
      <div
        className="w-full max-w-md rounded-lg border border-bordure bg-carte p-6 shadow-[var(--shadow-flottant)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-base font-semibold text-encre">Ajouter un abonnement</h3>

        {clients.length === 0 ? (
          <p className="text-sm text-texte-secondaire">
            Tous les clients ont déjà un abonnement enregistré.
          </p>
        ) : (
          <form onSubmit={enregistrer} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-encre">Client</label>
              <select
                value={gestionnaireId}
                onChange={(e) => changerClient(e.target.value)}
                className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} ({c.plan})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-encre">Montant mensuel (FCFA)</label>
              <input
                required
                type="number"
                min="1"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-encre">Date de signature</label>
                <input
                  required
                  type="date"
                  value={dateSignature}
                  onChange={(e) => setDateSignature(e.target.value)}
                  className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-encre">Premier prochain paiement</label>
                <input
                  required
                  type="date"
                  value={dateProchainPaiement}
                  onChange={(e) => setDateProchainPaiement(e.target.value)}
                  className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
                />
              </div>
            </div>

            {erreur && <p className="text-sm text-erreur">{erreur}</p>}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onFermer}
                className="flex-1 rounded-lg border border-bordure py-2 text-sm font-medium text-encre hover:bg-bordure/60"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={chargement}
                className="flex-1 rounded-lg bg-argile-forte py-2 text-sm font-medium text-white hover:bg-argile disabled:opacity-50"
              >
                {chargement ? "Enregistrement..." : "Ajouter"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
