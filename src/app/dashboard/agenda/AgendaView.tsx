"use client";

import { useMemo, useState, useEffect } from "react";
import { ModaleAVenir } from "../ModaleAVenir";
import { CalendarGrid, lundiDeLaSemaine, type EvenementAgenda, type VueCalendrier } from "./CalendarGrid";
import { EvenementModal } from "./EvenementModal";
import { NouveauRdvModal } from "./NouveauRdvModal";

function titrePeriode(vue: VueCalendrier, date: Date) {
  if (vue === "mois") {
    return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }
  if (vue === "jour") {
    return date.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  }
  const lundi = new Date(date);
  const jour = lundi.getDay();
  lundi.setDate(lundi.getDate() + (jour === 0 ? -6 : 1 - jour));
  const dimanche = new Date(lundi);
  dimanche.setDate(dimanche.getDate() + 6);
  return `${lundi.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} – ${dimanche.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}`;
}

function decaler(date: Date, vue: VueCalendrier, sens: 1 | -1) {
  const d = new Date(date);
  if (vue === "mois") d.setMonth(d.getMonth() + sens);
  else if (vue === "semaine") d.setDate(d.getDate() + sens * 7);
  else d.setDate(d.getDate() + sens);
  return d;
}

// Période exacte couverte par la grille affichée pour cette vue — pour le
// mois, ça inclut les jours "hors mois" affichés en tête/queue de grille
// (voir MoisGrid dans CalendarGrid.tsx), afin que les événements qui y
// tombent soient bien chargés eux aussi.
function plagePourVue(vue: VueCalendrier, date: Date): [Date, Date] {
  if (vue === "mois") {
    const premierJourMois = new Date(date.getFullYear(), date.getMonth(), 1);
    const debut = lundiDeLaSemaine(premierJourMois);
    const fin = new Date(debut);
    fin.setDate(fin.getDate() + 42);
    return [debut, fin];
  }
  if (vue === "semaine") {
    const debut = lundiDeLaSemaine(date);
    const fin = new Date(debut);
    fin.setDate(fin.getDate() + 7);
    return [debut, fin];
  }
  const debut = new Date(date);
  debut.setHours(0, 0, 0, 0);
  const fin = new Date(debut);
  fin.setDate(fin.getDate() + 1);
  return [debut, fin];
}

export function AgendaView({ integrationConnectee }: { integrationConnectee: boolean }) {
  const [vue, setVue] = useState<"calendrier" | "liste">("calendrier");
  const [vueCalendrier, setVueCalendrier] = useState<VueCalendrier>("mois");
  const [dateActuelle, setDateActuelle] = useState(new Date());
  const [evenements, setEvenements] = useState<EvenementAgenda[]>([]);
  const [chargementEvenements, setChargementEvenements] = useState(false);
  const [erreurEvenements, setErreurEvenements] = useState<string | null>(null);
  const [evenementSelectionne, setEvenementSelectionne] = useState<EvenementAgenda | null>(null);
  const [modaleNouveauRdvOuverte, setModaleNouveauRdvOuverte] = useState(false);
  const [modaleAVenir, setModaleAVenir] = useState<{ titre: string; description: string } | null>(
    null
  );

  // Ne fait aucun setState synchrone avant son premier await : appelable
  // directement depuis un effet (voir plus bas) sans être flagué par
  // react-hooks/set-state-in-effect au-delà du disable explicite déjà requis
  // pour l'appel lui-même (même schéma que ConfigurerBaseNotionModal.tsx).
  async function chargerEvenements(vueDemandee: VueCalendrier, dateDemandee: Date) {
    setChargementEvenements(true);
    setErreurEvenements(null);
    const [debut, fin] = plagePourVue(vueDemandee, dateDemandee);
    try {
      const reponse = await fetch(
        `/api/integrations/google-calendar/evenements?debut=${debut.toISOString()}&fin=${fin.toISOString()}`
      );
      const corps = await reponse.json().catch(() => null);
      if (!reponse.ok || !corps?.ok) {
        setErreurEvenements(corps?.error ?? "Impossible de charger les événements.");
        setEvenements([]);
      } else {
        setEvenements(corps.data);
      }
    } catch {
      setErreurEvenements("Impossible de contacter le serveur.");
      setEvenements([]);
    } finally {
      setChargementEvenements(false);
    }
  }

  useEffect(() => {
    if (!integrationConnectee) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    chargerEvenements(vueCalendrier, dateActuelle);
  }, [integrationConnectee, vueCalendrier, dateActuelle]);

  const evenementsGroupesParDate = useMemo(() => {
    const groupes = new Map<string, EvenementAgenda[]>();
    for (const e of evenements) {
      const jour = new Date(e.debut).toISOString().slice(0, 10);
      groupes.set(jour, [...(groupes.get(jour) ?? []), e]);
    }
    return Array.from(groupes.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [evenements]);

  function ouvrirModaleConnexion(nom: string) {
    setModaleAVenir({
      titre: `Connexion à ${nom}`,
      description: `Cette intégration sera bientôt disponible. Vous pourrez bientôt connecter ${nom} directement depuis AkilAI.`,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-encre">Agenda</h1>
        <button
          type="button"
          disabled={!integrationConnectee}
          onClick={() => setModaleNouveauRdvOuverte(true)}
          className="rounded-lg bg-argile-forte px-4 py-2 text-sm font-medium text-white hover:bg-argile disabled:opacity-50"
        >
          + Nouveau RDV
        </button>
      </div>

      {!integrationConnectee && (
        <div className="rounded-lg border border-dashed border-bordure bg-carte p-8 text-center">
          <p className="mb-4 text-sm text-texte-secondaire">
            Connectez Google Calendar ou Calendly pour voir votre agenda ici.
          </p>
          <div className="flex justify-center gap-3">
            <a
              href="/api/integrations/google-calendar/autoriser"
              className="rounded-lg bg-argile-forte px-4 py-2 text-sm font-medium text-white hover:bg-argile"
            >
              Connecter Google Calendar
            </a>
            <button
              type="button"
              onClick={() => ouvrirModaleConnexion("Calendly")}
              className="rounded-lg border border-bordure px-4 py-2 text-sm font-medium text-encre hover:bg-bordure/60"
            >
              Connecter Calendly
            </button>
          </div>
        </div>
      )}

      {erreurEvenements && (
        <div className="rounded-lg border border-erreur-pastel bg-erreur-pastel/40 px-4 py-3 text-sm text-erreur-pastel-texte">
          {erreurEvenements}
        </div>
      )}

      <div className="rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-bordure p-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDateActuelle((d) => decaler(d, vueCalendrier, -1))}
              className="rounded-lg border border-bordure px-2.5 py-1 text-sm text-texte-secondaire hover:bg-bordure/60"
              aria-label="Période précédente"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => setDateActuelle(new Date())}
              className="rounded-lg border border-bordure px-3 py-1 text-sm text-texte-secondaire hover:bg-bordure/60"
            >
              Aujourd&apos;hui
            </button>
            <button
              type="button"
              onClick={() => setDateActuelle((d) => decaler(d, vueCalendrier, 1))}
              className="rounded-lg border border-bordure px-2.5 py-1 text-sm text-texte-secondaire hover:bg-bordure/60"
              aria-label="Période suivante"
            >
              →
            </button>
            <span className="ml-2 text-sm font-medium capitalize text-encre">
              {titrePeriode(vueCalendrier, dateActuelle)}
            </span>
            {chargementEvenements && (
              <span className="text-xs text-texte-secondaire">Chargement…</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {vue === "calendrier" && (
              <div className="flex rounded-lg border border-bordure p-0.5 text-sm">
                {(["mois", "semaine", "jour"] as VueCalendrier[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVueCalendrier(v)}
                    className={`rounded px-3 py-1 capitalize ${
                      vueCalendrier === v
                        ? "bg-argile-forte text-white"
                        : "text-texte-secondaire hover:bg-bordure/60"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
            <div className="flex rounded-lg border border-bordure p-0.5 text-sm">
              <button
                type="button"
                onClick={() => setVue("calendrier")}
                className={`rounded px-3 py-1 ${
                  vue === "calendrier" ? "bg-argile-forte text-white" : "text-texte-secondaire hover:bg-bordure/60"
                }`}
              >
                Calendrier
              </button>
              <button
                type="button"
                onClick={() => setVue("liste")}
                className={`rounded px-3 py-1 ${
                  vue === "liste" ? "bg-argile-forte text-white" : "text-texte-secondaire hover:bg-bordure/60"
                }`}
              >
                Liste
              </button>
            </div>
          </div>
        </div>

        {vue === "calendrier" ? (
          <CalendarGrid
            vue={vueCalendrier}
            dateActuelle={dateActuelle}
            evenements={evenements}
            onSelectEvent={setEvenementSelectionne}
          />
        ) : (
          <div className="p-4">
            {evenementsGroupesParDate.length === 0 ? (
              <p className="py-8 text-center text-sm text-texte-secondaire">
                Aucun rendez-vous programmé.
              </p>
            ) : (
              <ul className="space-y-4">
                {evenementsGroupesParDate.map(([jour, evenementsJour]) => (
                  <li key={jour}>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-texte-secondaire">
                      {new Date(jour).toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                      })}
                    </p>
                    <ul className="space-y-1.5">
                      {evenementsJour.map((e) => (
                        <li key={e.id}>
                          <button
                            onClick={() => setEvenementSelectionne(e)}
                            className="w-full rounded-lg border border-bordure px-3 py-2 text-left text-sm text-encre hover:bg-bordure/60"
                          >
                            {e.titre}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <EvenementModal evenement={evenementSelectionne} onFermer={() => setEvenementSelectionne(null)} />

      <NouveauRdvModal
        ouvert={modaleNouveauRdvOuverte}
        onFermer={() => setModaleNouveauRdvOuverte(false)}
        onCree={() => chargerEvenements(vueCalendrier, dateActuelle)}
      />

      <ModaleAVenir
        ouvert={modaleAVenir !== null}
        titre={modaleAVenir?.titre ?? ""}
        description={modaleAVenir?.description ?? ""}
        onFermer={() => setModaleAVenir(null)}
      />
    </div>
  );
}
