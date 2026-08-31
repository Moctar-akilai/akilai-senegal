"use client";

import { useMemo, useState } from "react";
import { ModaleAVenir } from "../ModaleAVenir";
import { CalendarGrid, type EvenementAgenda, type VueCalendrier } from "./CalendarGrid";
import { EvenementModal } from "./EvenementModal";

// Aucune source de données réelle pour l'instant (pas d'intégration
// Google Calendar / Calendly branchée) : la vue reste vide, mais toute la
// structure (grille, liste, modale de détail) est prête à recevoir de
// vrais événements dès qu'une intégration sera connectée.
const EVENEMENTS: EvenementAgenda[] = [];

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

export function AgendaView({ integrationConnectee }: { integrationConnectee: boolean }) {
  const [vue, setVue] = useState<"calendrier" | "liste">("calendrier");
  const [vueCalendrier, setVueCalendrier] = useState<VueCalendrier>("mois");
  const [dateActuelle, setDateActuelle] = useState(new Date());
  const [evenementSelectionne, setEvenementSelectionne] = useState<EvenementAgenda | null>(null);
  const [modaleAVenir, setModaleAVenir] = useState<{ titre: string; description: string } | null>(
    null
  );

  const evenementsGroupesParDate = useMemo(() => {
    const groupes = new Map<string, EvenementAgenda[]>();
    for (const e of EVENEMENTS) {
      const jour = new Date(e.debut).toISOString().slice(0, 10);
      groupes.set(jour, [...(groupes.get(jour) ?? []), e]);
    }
    return Array.from(groupes.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, []);

  function ouvrirModaleConnexion(nom: string) {
    setModaleAVenir({
      titre: `Connexion à ${nom}`,
      description: `Cette intégration sera bientôt disponible. Vous pourrez bientôt connecter ${nom} directement depuis AkilAI.`,
    });
  }

  function ouvrirModaleNouveauRdv() {
    setModaleAVenir({
      titre: "Nouveau rendez-vous",
      description:
        "La création de rendez-vous sera disponible dès qu'une intégration agenda (Google Calendar ou Calendly) sera connectée.",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Agenda</h1>
        <button
          type="button"
          onClick={ouvrirModaleNouveauRdv}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + Nouveau RDV
        </button>
      </div>

      {!integrationConnectee && (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center">
          <p className="mb-4 text-sm text-neutral-600">
            Connectez Google Calendar ou Calendly pour voir votre agenda ici.
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => ouvrirModaleConnexion("Google Calendar")}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Connecter Google Calendar
            </button>
            <button
              type="button"
              onClick={() => ouvrirModaleConnexion("Calendly")}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Connecter Calendly
            </button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 p-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDateActuelle((d) => decaler(d, vueCalendrier, -1))}
              className="rounded-md border border-neutral-300 px-2.5 py-1 text-sm text-neutral-600 hover:bg-neutral-50"
              aria-label="Période précédente"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => setDateActuelle(new Date())}
              className="rounded-md border border-neutral-300 px-3 py-1 text-sm text-neutral-600 hover:bg-neutral-50"
            >
              Aujourd&apos;hui
            </button>
            <button
              type="button"
              onClick={() => setDateActuelle((d) => decaler(d, vueCalendrier, 1))}
              className="rounded-md border border-neutral-300 px-2.5 py-1 text-sm text-neutral-600 hover:bg-neutral-50"
              aria-label="Période suivante"
            >
              →
            </button>
            <span className="ml-2 text-sm font-medium capitalize text-neutral-900">
              {titrePeriode(vueCalendrier, dateActuelle)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {vue === "calendrier" && (
              <div className="flex rounded-md border border-neutral-300 p-0.5 text-sm">
                {(["mois", "semaine", "jour"] as VueCalendrier[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVueCalendrier(v)}
                    className={`rounded px-3 py-1 capitalize ${
                      vueCalendrier === v
                        ? "bg-neutral-900 text-white"
                        : "text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
            <div className="flex rounded-md border border-neutral-300 p-0.5 text-sm">
              <button
                type="button"
                onClick={() => setVue("calendrier")}
                className={`rounded px-3 py-1 ${
                  vue === "calendrier" ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                Calendrier
              </button>
              <button
                type="button"
                onClick={() => setVue("liste")}
                className={`rounded px-3 py-1 ${
                  vue === "liste" ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-50"
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
            evenements={EVENEMENTS}
            onSelectEvent={setEvenementSelectionne}
          />
        ) : (
          <div className="p-4">
            {evenementsGroupesParDate.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-500">
                Aucun rendez-vous programmé.
              </p>
            ) : (
              <ul className="space-y-4">
                {evenementsGroupesParDate.map(([jour, evenements]) => (
                  <li key={jour}>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
                      {new Date(jour).toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                      })}
                    </p>
                    <ul className="space-y-1.5">
                      {evenements.map((e) => (
                        <li key={e.id}>
                          <button
                            onClick={() => setEvenementSelectionne(e)}
                            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
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

      <ModaleAVenir
        ouvert={modaleAVenir !== null}
        titre={modaleAVenir?.titre ?? ""}
        description={modaleAVenir?.description ?? ""}
        onFermer={() => setModaleAVenir(null)}
      />
    </div>
  );
}
