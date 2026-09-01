"use client";

import { useEffect, useState } from "react";
import { ecrireDashboard } from "@/lib/dashboard/ecrire";
import type { ConfigIntegration } from "@/lib/integrations/fournisseurs";

const DATABASE_ID_EXEMPLE = "6346f57eb3834ecd8347fbacd69320dc";

type Propriete = { nom: string; type: string };

// Le parent démonte ce composant quand la modale est fermée (voir le
// `if (!ouvert) return null` ci-dessous) : à chaque réouverture, le
// formulaire est remonté à neuf et ses useState repartent des valeurs
// actuelles de configInitiale — pas besoin d'un effet pour "réinitialiser"
// l'état à l'ouverture.
export function ConfigurerBaseNotionModal({
  ouvert,
  configInitiale,
  onFermer,
  onEnregistre,
}: {
  ouvert: boolean;
  configInitiale: ConfigIntegration | null;
  onFermer: () => void;
  onEnregistre: (config: ConfigIntegration) => void;
}) {
  if (!ouvert) return null;
  return (
    <FormulaireConfigNotion configInitiale={configInitiale} onFermer={onFermer} onEnregistre={onEnregistre} />
  );
}

function FormulaireConfigNotion({
  configInitiale,
  onFermer,
  onEnregistre,
}: {
  configInitiale: ConfigIntegration | null;
  onFermer: () => void;
  onEnregistre: (config: ConfigIntegration) => void;
}) {
  const [databaseId, setDatabaseId] = useState(configInitiale?.database_id ?? DATABASE_ID_EXEMPLE);
  const [proprietes, setProprietes] = useState<Propriete[] | null>(null);
  const [mappingNom, setMappingNom] = useState(configInitiale?.mapping.nom ?? "");
  const [mappingTelephone, setMappingTelephone] = useState(configInitiale?.mapping.telephone ?? "");
  const [mappingEmail, setMappingEmail] = useState(configInitiale?.mapping.email ?? "");
  const [mappingStatut, setMappingStatut] = useState(configInitiale?.mapping.statut ?? "");
  // Initialisé à true : le montage déclenche toujours un chargement (voir
  // l'effet plus bas), donc pas besoin d'un setState synchrone en plus
  // dans l'effet pour le faire passer à true.
  const [chargementProprietes, setChargementProprietes] = useState(true);
  const [chargementEnregistrement, setChargementEnregistrement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Ne fait aucun setState synchrone avant le premier await (uniquement
  // dans le finally/catch, après une frontière asynchrone) : appelable
  // directement depuis un effet sans déclencher
  // react-hooks/set-state-in-effect. Le bouton "Charger" met lui-même
  // chargementProprietes/erreur à jour avant d'appeler cette fonction,
  // puisqu'il n'est pas soumis à cette règle (pas dans un effet).
  async function chargerProprietes(idAUtiliser: string) {
    const id = idAUtiliser.trim();
    if (!id) return;
    try {
      const reponse = await fetch("/api/integrations/notion/proprietes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId: id }),
      });
      const corps = await reponse.json().catch(() => null);
      if (!reponse.ok || !corps?.ok) {
        setErreur(corps?.error ?? "Impossible de charger les propriétés de cette base.");
        setProprietes(null);
      } else {
        setProprietes(corps.data.proprietes);
      }
    } catch {
      setErreur("Impossible de contacter le serveur.");
      setProprietes(null);
    } finally {
      setChargementProprietes(false);
    }
  }

  // Charge les propriétés de la base actuelle dès le montage (une seule
  // fois — le composant est remonté à chaque ouverture de la modale, voir
  // plus haut), pour que les selects soient déjà utilisables. Fetch
  // légitime vers un système externe au montage : chargerProprietes ne
  // fait aucun setState synchrone avant son premier await (voir plus
  // haut), mais la règle trace quand même les setState internes d'une
  // fonction appelée depuis l'effet, sync ou non.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    chargerProprietes(databaseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function enregistrer() {
    setChargementEnregistrement(true);
    setErreur(null);
    const resultat = await ecrireDashboard<ConfigIntegration>("integration.saveNotionConfig", {
      databaseId,
      mapping: {
        nom: mappingNom,
        telephone: mappingTelephone,
        email: mappingEmail || null,
        statut: mappingStatut || null,
      },
    });
    setChargementEnregistrement(false);
    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }
    onEnregistre(resultat.data);
    onFermer();
  }

  const pretAEnregistrer = Boolean(proprietes) && mappingNom.trim() && mappingTelephone.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onFermer}>
      <div
        className="w-full max-w-md rounded-lg border border-bordure bg-carte p-6 shadow-[var(--shadow-flottant)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-base font-semibold text-encre">Configurer la base Notion</h3>
        <p className="mb-4 text-sm text-texte-secondaire">
          Fait correspondre les colonnes de votre base Notion aux champs du CRM. Lecture seule —
          rien n&apos;est jamais écrit dans Notion.
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-encre">Identifiant de la base</label>
            <div className="flex gap-2">
              <input
                value={databaseId}
                onChange={(e) => setDatabaseId(e.target.value)}
                placeholder={DATABASE_ID_EXEMPLE}
                className="w-full rounded-lg border border-bordure px-3 py-2 font-mono text-xs outline-none focus:border-argile-forte"
              />
              <button
                type="button"
                onClick={() => {
                  setChargementProprietes(true);
                  setErreur(null);
                  chargerProprietes(databaseId);
                }}
                disabled={chargementProprietes || !databaseId.trim()}
                className="shrink-0 rounded-lg border border-bordure px-3 py-2 text-xs font-medium text-encre hover:bg-bordure/60 disabled:opacity-50"
              >
                {chargementProprietes ? "Chargement..." : "Charger"}
              </button>
            </div>
          </div>

          {proprietes && (
            <>
              <SelectPropriete
                label="Colonne pour le Nom"
                proprietes={proprietes}
                valeur={mappingNom}
                onChange={setMappingNom}
              />
              <SelectPropriete
                label="Colonne pour le Téléphone"
                proprietes={proprietes}
                valeur={mappingTelephone}
                onChange={setMappingTelephone}
              />
              <SelectPropriete
                label="Colonne pour l'Email"
                proprietes={proprietes}
                valeur={mappingEmail}
                onChange={setMappingEmail}
                optionnel
              />
              <SelectPropriete
                label="Colonne pour le Statut"
                proprietes={proprietes}
                valeur={mappingStatut}
                onChange={setMappingStatut}
                optionnel
              />
            </>
          )}

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
              type="button"
              onClick={enregistrer}
              disabled={!pretAEnregistrer || chargementEnregistrement}
              className="flex-1 rounded-lg bg-argile-forte py-2 text-sm font-medium text-white hover:bg-argile disabled:opacity-50"
            >
              {chargementEnregistrement ? "Enregistrement..." : "Enregistrer la configuration"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectPropriete({
  label,
  proprietes,
  valeur,
  onChange,
  optionnel = false,
}: {
  label: string;
  proprietes: Propriete[];
  valeur: string;
  onChange: (v: string) => void;
  optionnel?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-encre">{label}</label>
      <select
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
      >
        <option value="">{optionnel ? "— Aucune —" : "Choisir une colonne"}</option>
        {proprietes.map((p) => (
          <option key={p.nom} value={p.nom}>
            {p.nom} ({p.type})
          </option>
        ))}
      </select>
    </div>
  );
}
