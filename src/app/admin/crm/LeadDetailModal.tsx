"use client";

import { useState } from "react";
import Link from "next/link";
import { ecrireAdmin } from "@/lib/admin/ecrire";
import { STATUT_LEAD_LABEL, type Lead } from "@/lib/admin/leads";

const PLANS = ["Essentiel", "Croissance", "Pro"];

export function LeadDetailModal({
  lead,
  onFermer,
  onMisAJour,
  onDemanderRaisonPerte,
}: {
  lead: Lead;
  onFermer: () => void;
  onMisAJour: (lead: Lead) => void;
  onDemanderRaisonPerte: () => void;
}) {
  const [nom, setNom] = useState(lead.nom);
  const [entreprise, setEntreprise] = useState(lead.entreprise ?? "");
  const [telephone, setTelephone] = useState(lead.telephone ?? "");
  const [email, setEmail] = useState(lead.email ?? "");
  const [source, setSource] = useState(lead.source ?? "");
  const [planEstime, setPlanEstime] = useState(lead.planEstime ?? "");
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [conversionOuverte, setConversionOuverte] = useState(false);

  async function enregistrer() {
    setChargement(true);
    setErreur(null);
    setMessage(null);
    const resultat = await ecrireAdmin("lead.update", {
      leadId: lead.id,
      nom,
      entreprise: entreprise || null,
      telephone: telephone || null,
      email: email || null,
      source: source || null,
      planEstime: planEstime || null,
      notes: notes || null,
    });
    setChargement(false);
    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }
    setMessage("Enregistré.");
    onMisAJour({
      ...lead,
      nom,
      entreprise: entreprise || null,
      telephone: telephone || null,
      email: email || null,
      source: source || null,
      planEstime: planEstime || null,
      notes: notes || null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onFermer}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-bordure bg-carte p-6 shadow-[var(--shadow-flottant)]"
        onClick={(e) => e.stopPropagation()}
      >
        {conversionOuverte ? (
          <ConvertirClientForm
            lead={{ ...lead, nom, telephone: telephone || null, email: email || null }}
            onAnnuler={() => setConversionOuverte(false)}
            onCompteCree={(gestionnaireId) => onMisAJour({ ...lead, gestionnaireIdConverti: gestionnaireId })}
            onFermerTout={onFermer}
          />
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-encre">Détail du lead</h3>
              <span className="rounded-full bg-neutre-pastel px-2 py-0.5 text-xs font-medium text-neutre-pastel-texte">
                {STATUT_LEAD_LABEL[lead.statut]}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-encre">Nom</label>
                <input
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-encre">Entreprise</label>
                <input
                  value={entreprise}
                  onChange={(e) => setEntreprise(e.target.value)}
                  className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-encre">Téléphone</label>
                  <input
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
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-encre">Source</label>
                  <input
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="closer, entrant…"
                    className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-encre">Plan estimé</label>
                  <select
                    value={planEstime}
                    onChange={(e) => setPlanEstime(e.target.value)}
                    className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
                  >
                    <option value="">—</option>
                    {PLANS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
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

              {lead.raisonPerte && (
                <p className="rounded-lg bg-erreur-pastel/40 px-3 py-2 text-xs text-erreur-pastel-texte">
                  Raison de la perte : {lead.raisonPerte}
                </p>
              )}
              {lead.gestionnaireIdConverti && (
                <p className="text-xs text-texte-secondaire">
                  Converti en client —{" "}
                  <Link
                    href={`/admin/clients/${lead.gestionnaireIdConverti}`}
                    className="underline hover:text-encre"
                  >
                    voir la fiche
                  </Link>
                </p>
              )}

              {erreur && <p className="text-sm text-erreur">{erreur}</p>}
              {message && <p className="text-sm text-texte-secondaire">{message}</p>}

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={onFermer}
                  className="rounded-lg border border-bordure px-4 py-2 text-sm font-medium text-encre hover:bg-bordure/60"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  disabled={chargement}
                  onClick={enregistrer}
                  className="rounded-lg bg-argile-forte px-4 py-2 text-sm font-medium text-white hover:bg-argile disabled:opacity-50"
                >
                  {chargement ? "Enregistrement..." : "Enregistrer"}
                </button>
                {lead.statut !== "perdu" && (
                  <button
                    type="button"
                    onClick={onDemanderRaisonPerte}
                    className="rounded-lg border border-bordure px-4 py-2 text-sm font-medium text-erreur hover:bg-erreur-pastel/40"
                  >
                    Marquer comme perdu
                  </button>
                )}
                {lead.statut === "gagne" && !lead.gestionnaireIdConverti && (
                  <button
                    type="button"
                    onClick={() => setConversionOuverte(true)}
                    className="ml-auto rounded-lg bg-succes-pastel px-4 py-2 text-sm font-medium text-succes-pastel-texte hover:opacity-80"
                  >
                    Convertir en client
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Crée le vrai compte AkilAI pour ce lead gagné : utilisateur Supabase
// Auth via l'API admin (service_role) puis profil applicatif — voir
// l'action lead.convertir dans /api/admin/write pour le détail de la
// cascade (profils -> parametres_compte + automatisation par défaut, via
// le trigger déjà en place).
function ConvertirClientForm({
  lead,
  onAnnuler,
  onCompteCree,
  onFermerTout,
}: {
  lead: Lead;
  onAnnuler: () => void;
  onCompteCree: (gestionnaireId: string) => void;
  onFermerTout: () => void;
}) {
  const [email, setEmail] = useState(lead.email ?? "");
  const [nom, setNom] = useState(lead.nom);
  const [telephone, setTelephone] = useState(lead.telephone ?? "");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultatSucces, setResultatSucces] = useState<{ gestionnaireId: string; motDePasse: string } | null>(
    null
  );

  async function convertir(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !nom.trim() || !telephone.trim()) return;
    setChargement(true);
    setErreur(null);
    const resultat = await ecrireAdmin<{ gestionnaireId: string; motDePasse: string }>("lead.convertir", {
      leadId: lead.id,
      email: email.trim(),
      nom: nom.trim(),
      telephone: telephone.trim(),
    });
    setChargement(false);
    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }
    setResultatSucces(resultat.data);
    // Synchronise tout de suite l'état local du Kanban (le bouton
    // "Convertir en client" doit disparaître sans attendre une fermeture
    // de modale) — sans fermer quoi que ce soit : l'admin doit encore voir
    // le mot de passe généré ci-dessous.
    onCompteCree(resultat.data.gestionnaireId);
  }

  if (resultatSucces) {
    return (
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-encre">Compte créé</h3>
        <p className="text-sm text-texte-secondaire">
          Communiquez ces identifiants au client — le mot de passe ne sera plus jamais affiché.
        </p>
        <div className="space-y-1 rounded-lg border border-bordure bg-sable p-3 text-sm">
          <p>
            <span className="text-texte-secondaire">Email : </span>
            {email}
          </p>
          <p>
            <span className="text-texte-secondaire">Mot de passe : </span>
            <span className="font-mono">{resultatSucces.motDePasse}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/clients/${resultatSucces.gestionnaireId}`}
            className="flex-1 rounded-lg bg-argile-forte py-2 text-center text-sm font-medium text-white hover:bg-argile"
          >
            Voir la fiche client
          </Link>
          <button
            type="button"
            onClick={onFermerTout}
            className="flex-1 rounded-lg border border-bordure py-2 text-sm font-medium text-encre hover:bg-bordure/60"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={convertir} className="space-y-3">
      <h3 className="text-base font-semibold text-encre">Convertir en client</h3>
      <p className="text-sm text-texte-secondaire">Crée un vrai compte AkilAI (Supabase Auth + profil) pour ce lead.</p>
      <div>
        <label className="mb-1 block text-sm font-medium text-encre">Nom</label>
        <input
          required
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-encre">Email (identifiant de connexion)</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-encre">Téléphone</label>
        <input
          required
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
        />
      </div>
      {erreur && <p className="text-sm text-erreur">{erreur}</p>}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onAnnuler}
          className="flex-1 rounded-lg border border-bordure py-2 text-sm font-medium text-encre hover:bg-bordure/60"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={chargement}
          className="flex-1 rounded-lg bg-argile-forte py-2 text-sm font-medium text-white hover:bg-argile disabled:opacity-50"
        >
          {chargement ? "Création..." : "Créer le compte"}
        </button>
      </div>
    </form>
  );
}
