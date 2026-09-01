"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ecrireDashboard } from "@/lib/dashboard/ecrire";
import { ModaleAVenir } from "../ModaleAVenir";
import { ConnexionCleApiModal } from "./ConnexionCleApiModal";
import { ConfigurerBaseNotionModal } from "./ConfigurerBaseNotionModal";
import { LogoAvecRepli } from "./LogoAvecRepli";
import type {
  ConfigIntegration,
  Fournisseur,
  MethodeConnexion,
  StatutIntegration,
} from "@/lib/integrations/fournisseurs";

const BADGE_STYLES: Record<StatutIntegration, string> = {
  non_connecte: "bg-bordure text-texte-secondaire",
  connecte: "bg-succes-pastel text-succes-pastel-texte",
  erreur: "bg-erreur-pastel text-erreur-pastel-texte",
};

const BADGE_LABELS: Record<StatutIntegration, string> = {
  non_connecte: "Non connecté",
  connecte: "Connecté",
  erreur: "Erreur",
};

const CYCLE_DEV: Record<StatutIntegration, StatutIntegration> = {
  non_connecte: "connecte",
  connecte: "erreur",
  erreur: "non_connecte",
};

export function IntegrationCard({
  fournisseur,
  nom,
  initiales,
  logo,
  methode,
  aide,
  statutInitial,
  apercuInitial,
  messageErreurInitial,
  peutEtreCrm = false,
  estCrmActifInitial = false,
  necessiteConfig = false,
  configInitiale = null,
}: {
  fournisseur: Fournisseur;
  nom: string;
  initiales: string;
  logo: string;
  methode: MethodeConnexion;
  aide?: { texte: string; url: string };
  statutInitial: StatutIntegration;
  apercuInitial: string | null;
  messageErreurInitial: string | null;
  peutEtreCrm?: boolean;
  estCrmActifInitial?: boolean;
  necessiteConfig?: boolean;
  configInitiale?: ConfigIntegration | null;
}) {
  const router = useRouter();
  const [statut, setStatut] = useState<StatutIntegration>(statutInitial);
  const [apercu, setApercu] = useState(apercuInitial);
  const [messageErreur, setMessageErreur] = useState(messageErreurInitial);
  const [estCrmActif, setEstCrmActif] = useState(estCrmActifInitial);
  const [config, setConfig] = useState(configInitiale);
  const [chargement, setChargement] = useState(false);
  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [modaleConfigOuverte, setModaleConfigOuverte] = useState(false);

  // ⚠️ Contournement temporaire de l'authentification — écrit via
  // /api/dashboard/write (service_role côté serveur), RLS-bloqué sinon
  // tant que le bypass est actif. Voir le commentaire en haut de cette
  // route API.
  async function deconnecter() {
    setChargement(true);
    const resultat = await ecrireDashboard("integration.disconnect", { fournisseur });
    if (resultat.ok) {
      setStatut("non_connecte");
      setApercu(null);
      setMessageErreur(null);
      setEstCrmActif(false);
    }
    setChargement(false);
    // Déconnecter le CRM actif retombe sur CRM AkilAI côté serveur (voir
    // integration.disconnect) : rafraîchit la page pour que sa carte
    // reflète ce changement.
    router.refresh();
  }

  async function utiliserCommeCrm() {
    setChargement(true);
    const resultat = await ecrireDashboard("integration.setCrmActif", { fournisseur });
    if (resultat.ok) setEstCrmActif(true);
    setChargement(false);
    // Un seul CRM actif à la fois : rafraîchit pour que la carte CRM AkilAI
    // (et tout autre fournisseur CRM précédemment actif) se resynchronise.
    router.refresh();
  }

  // Réservé au développement — jamais affiché en production (la vérif est
  // évaluée au build et le bloc est éliminé du bundle de prod). Permet de
  // simuler chaque statut pour tester l'UI sans vrai flux OAuth. La route
  // API revérifie aussi NODE_ENV côté serveur (défense en profondeur).
  async function basculerStatutDev() {
    const nouveauStatut = CYCLE_DEV[statut];
    setChargement(true);
    const resultat = await ecrireDashboard("integration.devToggle", {
      fournisseur,
      nouveauStatut,
    });
    if (resultat.ok) setStatut(nouveauStatut);
    setChargement(false);
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)] p-4">
        <div className="flex min-w-0 items-center gap-3">
          <LogoAvecRepli src={logo} initiales={initiales} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-encre">{nom}</p>
            <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_STYLES[statut]}`}>
              {statut === "connecte" && estCrmActif ? "Actif" : BADGE_LABELS[statut]}
            </span>
            {statut === "connecte" && apercu && (
              <p className="mt-0.5 font-mono text-xs text-texte-secondaire">{apercu}</p>
            )}
            {statut === "erreur" && messageErreur && (
              <p className="mt-0.5 max-w-[16rem] truncate text-xs text-erreur" title={messageErreur}>
                {messageErreur}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {methode === "cle_api" ? (
            statut === "connecte" || statut === "erreur" ? (
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setModaleOuverte(true)}
                  className="rounded-lg border border-bordure px-3 py-1.5 text-xs font-medium text-encre hover:bg-bordure/60"
                >
                  Modifier la clé
                </button>
                <button
                  type="button"
                  disabled={chargement}
                  onClick={deconnecter}
                  className="rounded-lg border border-bordure px-3 py-1.5 text-xs font-medium text-encre hover:bg-bordure/60 disabled:opacity-50"
                >
                  Déconnecter
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setModaleOuverte(true)}
                className="rounded-lg bg-argile-forte px-3 py-1.5 text-xs font-medium text-white hover:bg-argile"
              >
                Connecter
              </button>
            )
          ) : statut === "connecte" ? (
            <button
              type="button"
              disabled={chargement}
              onClick={deconnecter}
              className="rounded-lg border border-bordure px-3 py-1.5 text-xs font-medium text-encre hover:bg-bordure/60 disabled:opacity-50"
            >
              Déconnecter
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setModaleOuverte(true)}
              className="rounded-lg bg-argile-forte px-3 py-1.5 text-xs font-medium text-white hover:bg-argile"
            >
              {statut === "erreur" ? "Réessayer" : "Connecter"}
            </button>
          )}

          {necessiteConfig && statut === "connecte" && (
            <button
              type="button"
              onClick={() => setModaleConfigOuverte(true)}
              className="text-[11px] text-texte-secondaire underline hover:text-encre"
            >
              Configurer la base
            </button>
          )}

          {peutEtreCrm && statut === "connecte" && !estCrmActif && (
            <button
              type="button"
              disabled={chargement}
              onClick={utiliserCommeCrm}
              className="text-[11px] text-texte-secondaire underline hover:text-encre disabled:opacity-50"
            >
              Utiliser comme CRM actif
            </button>
          )}

          {process.env.NODE_ENV === "development" && (
            <button
              type="button"
              disabled={chargement}
              onClick={basculerStatutDev}
              className="text-[11px] text-texte-secondaire underline hover:text-texte-secondaire disabled:opacity-50"
            >
              Basculer (dev)
            </button>
          )}
        </div>
      </div>

      {methode === "cle_api" ? (
        <ConnexionCleApiModal
          ouvert={modaleOuverte}
          fournisseur={fournisseur}
          nom={nom}
          aide={aide}
          onFermer={() => setModaleOuverte(false)}
          onConnecte={(resultat) => {
            setStatut(resultat.statut as StatutIntegration);
            setApercu(resultat.apercu);
            setMessageErreur(resultat.messageErreur);
            setModaleOuverte(false);
          }}
        />
      ) : (
        <ModaleAVenir
          ouvert={modaleOuverte}
          titre={`Connexion à ${nom}`}
          description={`Cette intégration sera bientôt disponible. Vous pourrez bientôt connecter ${nom} directement depuis AkilAI.`}
          onFermer={() => setModaleOuverte(false)}
        />
      )}

      {necessiteConfig && (
        <ConfigurerBaseNotionModal
          ouvert={modaleConfigOuverte}
          configInitiale={config}
          onFermer={() => setModaleConfigOuverte(false)}
          onEnregistre={(nouvelleConfig) => setConfig(nouvelleConfig)}
        />
      )}
    </>
  );
}
