"use client";

import { Fragment } from "react";

export type EvenementAgenda = {
  id: string;
  titre: string;
  debut: string; // ISO
  fin: string; // ISO
  description?: string | null;
  lieu?: string | null;
};

export type VueCalendrier = "mois" | "semaine" | "jour";

const JOURS_ABREGES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const HEURES = Array.from({ length: 15 }, (_, i) => 7 + i); // 07h -> 21h

function memeJour(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

function lundiDeLaSemaine(date: Date) {
  const d = new Date(date);
  const jour = d.getDay(); // 0=dimanche ... 6=samedi
  const decalage = jour === 0 ? -6 : 1 - jour;
  d.setDate(d.getDate() + decalage);
  d.setHours(0, 0, 0, 0);
  return d;
}

function evenementsDuJour(evenements: EvenementAgenda[], jour: Date) {
  return evenements.filter((e) => memeJour(new Date(e.debut), jour));
}

function MoisGrid({
  dateActuelle,
  evenements,
  onSelectEvent,
}: {
  dateActuelle: Date;
  evenements: EvenementAgenda[];
  onSelectEvent: (e: EvenementAgenda) => void;
}) {
  const premierJourMois = new Date(dateActuelle.getFullYear(), dateActuelle.getMonth(), 1);
  const debutGrille = lundiDeLaSemaine(premierJourMois);
  const jours = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(debutGrille);
    d.setDate(d.getDate() + i);
    return d;
  });
  const aujourdHui = new Date();

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[640px] grid-cols-7 border-b border-bordure text-xs font-medium text-texte-secondaire">
        {JOURS_ABREGES.map((j) => (
          <div key={j} className="px-2 py-2 text-center">
            {j}
          </div>
        ))}
      </div>
      <div className="grid min-w-[640px] grid-cols-7">
        {jours.map((jour) => {
          const horsMois = jour.getMonth() !== dateActuelle.getMonth();
          const events = evenementsDuJour(evenements, jour);
          return (
            <div
              key={jour.toISOString()}
              className={`min-h-[90px] border-b border-r border-bordure p-1.5 ${
                horsMois ? "bg-sable" : "bg-carte"
              }`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  memeJour(jour, aujourdHui)
                    ? "bg-argile-forte font-medium text-white"
                    : horsMois
                      ? "text-texte-secondaire"
                      : "text-encre"
                }`}
              >
                {jour.getDate()}
              </span>
              <div className="mt-1 space-y-1">
                {events.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onSelectEvent(e)}
                    className="block w-full truncate rounded bg-argile-forte px-1.5 py-0.5 text-left text-[11px] text-white hover:bg-argile"
                  >
                    {e.titre}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GrilleHoraire({
  jours,
  evenements,
  onSelectEvent,
}: {
  jours: Date[];
  evenements: EvenementAgenda[];
  onSelectEvent: (e: EvenementAgenda) => void;
}) {
  const aujourdHui = new Date();

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[640px]"
        style={{ gridTemplateColumns: `56px repeat(${jours.length}, 1fr)` }}
      >
        <div />
        {jours.map((jour) => (
          <div
            key={jour.toISOString()}
            className={`border-b border-bordure px-2 py-2 text-center text-xs font-medium ${
              memeJour(jour, aujourdHui) ? "text-encre" : "text-texte-secondaire"
            }`}
          >
            {JOURS_ABREGES[(jour.getDay() + 6) % 7]} {jour.getDate()}
          </div>
        ))}

        {HEURES.map((heure) => (
          <Fragment key={heure}>
            <div className="border-r border-bordure pr-2 text-right text-[11px] text-texte-secondaire">
              {String(heure).padStart(2, "0")}h
            </div>
            {jours.map((jour) => {
              const events = evenementsDuJour(evenements, jour).filter(
                (e) => new Date(e.debut).getHours() === heure
              );
              return (
                <div
                  key={`${jour.toISOString()}-${heure}`}
                  className="min-h-[36px] border-b border-r border-bordure p-0.5"
                >
                  {events.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => onSelectEvent(e)}
                      className="block w-full truncate rounded bg-argile-forte px-1.5 py-0.5 text-left text-[11px] text-white hover:bg-argile"
                    >
                      {e.titre}
                    </button>
                  ))}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export function CalendarGrid({
  vue,
  dateActuelle,
  evenements,
  onSelectEvent,
}: {
  vue: VueCalendrier;
  dateActuelle: Date;
  evenements: EvenementAgenda[];
  onSelectEvent: (e: EvenementAgenda) => void;
}) {
  if (vue === "mois") {
    return (
      <MoisGrid dateActuelle={dateActuelle} evenements={evenements} onSelectEvent={onSelectEvent} />
    );
  }

  if (vue === "semaine") {
    const lundi = lundiDeLaSemaine(dateActuelle);
    const jours = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lundi);
      d.setDate(d.getDate() + i);
      return d;
    });
    return <GrilleHoraire jours={jours} evenements={evenements} onSelectEvent={onSelectEvent} />;
  }

  return <GrilleHoraire jours={[dateActuelle]} evenements={evenements} onSelectEvent={onSelectEvent} />;
}
