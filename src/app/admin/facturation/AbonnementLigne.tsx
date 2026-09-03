"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ecrireAdmin } from "@/lib/admin/ecrire";
import {
  STATUT_PAIEMENT_BADGE,
  STATUT_PAIEMENT_LABEL,
  SANTE_PAIEMENT_BADGE,
  type StatutPaiement,
  type SantePaiement,
} from "@/lib/admin/facturation";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatMontant(montant: number) {
  return `${montant.toLocaleString("fr-FR")} FCFA`;
}

function aujourdHuiISO() {
  return new Date().toISOString().slice(0, 10);
}

export type AbonnementAffiche = {
  gestionnaireId: string;
  nom: string;
  plan: string;
  montantMensuel: number;
  dateSignature: string;
  dateProchainPaiement: string;
  statutPaiement: StatutPaiement;
  santePaiement: SantePaiement;
};

export function AbonnementLigne({ abonnement }: { abonnement: AbonnementAffiche }) {
  const router = useRouter();
  const [montant, setMontant] = useState(abonnement.montantMensuel);
  const [editionMontant, setEditionMontant] = useState(false);
  const [nouveauMontant, setNouveauMontant] = useState(String(abonnement.montantMensuel));
  const [confirmationMontant, setConfirmationMontant] = useState(false);
  const [chargementMontant, setChargementMontant] = useState(false);

  const [modalePaiement, setModalePaiement] = useState(false);
  const [modaleResiliation, setModaleResiliation] = useState(false);

  const resilie = abonnement.statutPaiement === "resilie";

  async function confirmerMontant() {
    const valeur = Number(nouveauMontant);
    if (!valeur || valeur <= 0) return;
    setChargementMontant(true);
    const resultat = await ecrireAdmin("abonnement.updateMontant", {
      gestionnaireId: abonnement.gestionnaireId,
      montantMensuel: valeur,
    });
    if (resultat.ok) setMontant(valeur);
    setChargementMontant(false);
    setConfirmationMontant(false);
    setEditionMontant(false);
    router.refresh();
  }

  return (
    <tr className="border-b border-bordure last:border-0 hover:bg-bordure/30">
      <td className="px-4 py-3">
        <Link href={`/admin/clients/${abonnement.gestionnaireId}`} className="font-medium text-encre hover:underline">
          {abonnement.nom}
        </Link>
      </td>
      <td className="px-4 py-3">
        <span className="rounded-full bg-neutre-pastel px-2 py-0.5 text-xs font-medium text-neutre-pastel-texte">
          {abonnement.plan}
        </span>
      </td>
      <td className="px-4 py-3">
        {!editionMontant ? (
          <button
            type="button"
            onClick={() => {
              setNouveauMontant(String(montant));
              setEditionMontant(true);
            }}
            className="text-encre underline decoration-dotted hover:decoration-solid"
          >
            {formatMontant(montant)}
          </button>
        ) : confirmationMontant ? (
          <div className="space-y-1">
            <p className="text-xs text-texte-secondaire">
              {formatMontant(montant)} → <span className="font-medium text-encre">{formatMontant(Number(nouveauMontant))}</span>
            </p>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={chargementMontant}
                onClick={confirmerMontant}
                className="rounded-lg bg-argile-forte px-2 py-1 text-xs font-medium text-white hover:bg-argile disabled:opacity-50"
              >
                {chargementMontant ? "..." : "Confirmer"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmationMontant(false)}
                className="rounded-lg border border-bordure px-2 py-1 text-xs font-medium text-encre hover:bg-bordure/60"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="1"
              autoFocus
              value={nouveauMontant}
              onChange={(e) => setNouveauMontant(e.target.value)}
              className="w-24 rounded-lg border border-bordure px-2 py-1 text-sm outline-none focus:border-argile-forte"
            />
            <button
              type="button"
              onClick={() => setConfirmationMontant(true)}
              disabled={!Number(nouveauMontant) || Number(nouveauMontant) <= 0}
              className="rounded-lg bg-argile-forte px-2 py-1 text-xs font-medium text-white hover:bg-argile disabled:opacity-50"
            >
              OK
            </button>
            <button
              type="button"
              onClick={() => setEditionMontant(false)}
              className="text-xs text-texte-secondaire hover:text-encre"
            >
              ✕
            </button>
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-texte-secondaire">{formatDate(abonnement.dateSignature)}</td>
      <td className="px-4 py-3 text-texte-secondaire">{formatDate(abonnement.dateProchainPaiement)}</td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_PAIEMENT_BADGE[abonnement.statutPaiement]}`}>
          {STATUT_PAIEMENT_LABEL[abonnement.statutPaiement]}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${SANTE_PAIEMENT_BADGE[abonnement.santePaiement]}`}
        >
          {abonnement.santePaiement}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        {!resilie && (
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setModalePaiement(true)}
              className="rounded-lg border border-bordure px-2.5 py-1 text-xs font-medium text-encre hover:bg-bordure/60"
            >
              Marquer payé
            </button>
            <button
              type="button"
              onClick={() => setModaleResiliation(true)}
              className="rounded-lg border border-bordure px-2.5 py-1 text-xs font-medium text-erreur hover:bg-erreur-pastel/40"
            >
              Résilier
            </button>
          </div>
        )}
      </td>

      {modalePaiement && (
        <ModalePaiement
          gestionnaireId={abonnement.gestionnaireId}
          montantHabituel={montant}
          onFermer={() => setModalePaiement(false)}
        />
      )}
      {modaleResiliation && (
        <ModaleResiliation gestionnaireId={abonnement.gestionnaireId} onFermer={() => setModaleResiliation(false)} />
      )}
    </tr>
  );
}

function ModalePaiement({
  gestionnaireId,
  montantHabituel,
  onFermer,
}: {
  gestionnaireId: string;
  montantHabituel: number;
  onFermer: () => void;
}) {
  const router = useRouter();
  const [dateEncaissement, setDateEncaissement] = useState(aujourdHuiISO());
  const [montant, setMontant] = useState(String(montantHabituel));
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setErreur(null);
    const montantNombre = Number(montant);
    const resultat = await ecrireAdmin("abonnement.marquerPaye", {
      gestionnaireId,
      dateEncaissement,
      ...(montantNombre !== montantHabituel ? { montant: montantNombre } : {}),
    });
    if (!resultat.ok) {
      setErreur(resultat.error);
      setChargement(false);
      return;
    }
    setChargement(false);
    router.refresh();
    onFermer();
  }

  // Portail vers document.body : ce composant est rendu depuis une cellule
  // de tableau (AbonnementLigne), et une modale position:fixed en enfant
  // direct de <tr> serait une structure HTML invalide (foster parenting au
  // parsing SSR, désynchronisé de l'hydratation React).
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onFermer}>
      <div
        className="w-full max-w-sm rounded-lg border border-bordure bg-carte p-6 shadow-[var(--shadow-flottant)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-base font-semibold text-encre">Marquer comme payé</h3>
        <form onSubmit={enregistrer} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-encre">Date d&apos;encaissement</label>
            <input
              required
              type="date"
              value={dateEncaissement}
              onChange={(e) => setDateEncaissement(e.target.value)}
              className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-encre">Montant (FCFA)</label>
            <input
              required
              type="number"
              min="1"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
            />
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
              {chargement ? "Enregistrement..." : "Confirmer le paiement"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function ModaleResiliation({ gestionnaireId, onFermer }: { gestionnaireId: string; onFermer: () => void }) {
  const router = useRouter();
  const [raison, setRaison] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function confirmer() {
    if (!raison.trim()) return;
    setChargement(true);
    setErreur(null);
    const resultat = await ecrireAdmin("abonnement.resilier", { gestionnaireId, raison: raison.trim() });
    if (!resultat.ok) {
      setErreur(resultat.error);
      setChargement(false);
      return;
    }
    setChargement(false);
    router.refresh();
    onFermer();
  }

  // Portail vers document.body — voir le commentaire équivalent dans
  // ModalePaiement ci-dessus.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onFermer}>
      <div
        className="w-full max-w-sm rounded-lg border border-bordure bg-carte p-6 shadow-[var(--shadow-flottant)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-2 text-base font-semibold text-encre">Résilier cet abonnement ?</h3>
        <p className="mb-3 text-sm text-texte-secondaire">
          La raison sera ajoutée aux notes admin de ce client.
        </p>
        <textarea
          value={raison}
          onChange={(e) => setRaison(e.target.value)}
          rows={3}
          placeholder="Raison de la résiliation…"
          className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
        />
        {erreur && <p className="mt-1 text-sm text-erreur">{erreur}</p>}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onFermer}
            className="flex-1 rounded-lg border border-bordure py-2 text-sm font-medium text-encre hover:bg-bordure/60"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={chargement || !raison.trim()}
            onClick={confirmer}
            className="flex-1 rounded-lg bg-erreur py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {chargement ? "..." : "Confirmer la résiliation"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
