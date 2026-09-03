"use client";

import { useState } from "react";
import Link from "next/link";
import {
  STATUT_TICKET_BADGE,
  STATUT_TICKET_LABEL,
  PRIORITE_TICKET_BADGE,
  PRIORITE_TICKET_LABEL,
  type StatutTicket,
  type PrioriteTicket,
} from "@/lib/crm/statuts";
import { STATUT_FACTURE_BADGE, STATUT_FACTURE_LABEL, type StatutFacture } from "@/lib/factures/statuts";
import { AutomatisationToggleAdmin } from "./AutomatisationToggleAdmin";
import { NotesAdminForm } from "./NotesAdminForm";

type Automatisation = {
  id: string;
  nom: string;
  type: string;
  statut: "actif" | "inactif" | "erreur";
  description: string | null;
};

type Ticket = { id: string; titre: string; statut: StatutTicket; priorite: PrioriteTicket; createdAt: string };

type MessageHistorique = {
  id: string;
  direction: "entrant" | "sortant";
  contenu: string | null;
  createdAt: string;
  contactNom: string | null;
  contactTelephone: string;
};

type Facture = { id: string; numero: string; montant: number; statut: StatutFacture; dateEmission: string };

type Paiements = {
  totalEncaisse: number;
  nbPaiements: number;
  dernierPaiement: string | null;
  prochainPaiement: string | null;
  factures: Facture[];
};

const ONGLETS = ["Automatisations", "Tickets", "Historique", "Paiements", "Notes admin"] as const;
type Onglet = (typeof ONGLETS)[number];

function formatDateHeure(date: string) {
  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatMontant(montant: number) {
  return `${montant.toLocaleString("fr-FR")} FCFA`;
}

function extrait(texte: string | null, longueur = 100) {
  if (!texte) return "(vide)";
  return texte.length > longueur ? `${texte.slice(0, longueur)}…` : texte;
}

export function ClientTabs({
  gestionnaireId,
  automatisations,
  tickets,
  historique,
  notesInitiales,
  paiements,
}: {
  gestionnaireId: string;
  automatisations: Automatisation[];
  tickets: Ticket[];
  historique: MessageHistorique[];
  notesInitiales: string;
  paiements: Paiements;
}) {
  const [onglet, setOnglet] = useState<Onglet>("Automatisations");

  return (
    <div className="rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)]">
      <div className="flex border-b border-bordure px-2">
        {ONGLETS.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setOnglet(o)}
            className={`px-4 py-3 text-sm font-medium ${
              onglet === o ? "border-b-2 border-argile-forte text-encre" : "text-texte-secondaire hover:text-encre"
            }`}
          >
            {o}
          </button>
        ))}
      </div>

      <div className="p-5">
        {onglet === "Automatisations" &&
          (automatisations.length === 0 ? (
            <p className="text-sm text-texte-secondaire">Aucune automatisation pour ce client.</p>
          ) : (
            <ul className="space-y-3">
              {automatisations.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-bordure p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-encre">{a.nom}</p>
                    {a.description && (
                      <p className="truncate text-xs text-texte-secondaire">{a.description}</p>
                    )}
                  </div>
                  <AutomatisationToggleAdmin
                    automatisationId={a.id}
                    gestionnaireId={gestionnaireId}
                    statutInitial={a.statut}
                  />
                </li>
              ))}
            </ul>
          ))}

        {onglet === "Tickets" &&
          (tickets.length === 0 ? (
            <p className="text-sm text-texte-secondaire">Aucun ticket pour ce client.</p>
          ) : (
            <ul className="space-y-2">
              {tickets.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/admin/tickets/${t.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-bordure p-3 hover:bg-bordure/30"
                  >
                    <span className="min-w-0 truncate text-sm font-medium text-encre">{t.titre}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITE_TICKET_BADGE[t.priorite]}`}
                      >
                        {PRIORITE_TICKET_LABEL[t.priorite]}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_TICKET_BADGE[t.statut]}`}>
                        {STATUT_TICKET_LABEL[t.statut]}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ))}

        {onglet === "Historique" &&
          (historique.length === 0 ? (
            <p className="text-sm text-texte-secondaire">Aucun message échangé pour l&apos;instant.</p>
          ) : (
            <ul className="space-y-2">
              {historique.map((m) => (
                <li key={m.id} className="flex items-start justify-between gap-3 text-sm">
                  <span className="min-w-0 flex-1">
                    <span
                      className={`mr-2 rounded-full px-2 py-0.5 text-xs ${
                        m.direction === "sortant"
                          ? "bg-bordure text-texte-secondaire"
                          : "bg-neutre-pastel text-neutre-pastel-texte"
                      }`}
                    >
                      {m.direction === "sortant" ? "Envoyé" : "Reçu"}
                    </span>
                    <span className="text-texte-secondaire">
                      {m.contactNom || m.contactTelephone} —{" "}
                    </span>
                    <span className="text-encre">{extrait(m.contenu)}</span>
                  </span>
                  <span className="shrink-0 text-xs text-texte-secondaire">{formatDateHeure(m.createdAt)}</span>
                </li>
              ))}
            </ul>
          ))}

        {onglet === "Paiements" && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-bordure p-3">
                <p className="text-xs text-texte-secondaire">Total encaissé</p>
                <p className="mt-1 text-lg font-semibold text-encre tabular-nums">
                  {formatMontant(paiements.totalEncaisse)}
                </p>
              </div>
              <div className="rounded-lg border border-bordure p-3">
                <p className="text-xs text-texte-secondaire">Nombre de paiements</p>
                <p className="mt-1 text-lg font-semibold text-encre tabular-nums">{paiements.nbPaiements}</p>
              </div>
              <div className="rounded-lg border border-bordure p-3">
                <p className="text-xs text-texte-secondaire">Dernier paiement</p>
                <p className="mt-1 text-lg font-semibold text-encre">
                  {paiements.dernierPaiement ? formatDate(paiements.dernierPaiement) : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-bordure p-3">
                <p className="text-xs text-texte-secondaire">Prochain paiement</p>
                <p className="mt-1 text-lg font-semibold text-encre">
                  {paiements.prochainPaiement ? formatDate(paiements.prochainPaiement) : "—"}
                </p>
              </div>
            </div>

            {paiements.factures.length === 0 ? (
              <p className="text-sm text-texte-secondaire">Aucune facture pour ce client.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-bordure">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-bordure text-xs uppercase tracking-wide text-texte-secondaire">
                    <tr>
                      <th className="px-3 py-2">Numéro</th>
                      <th className="px-3 py-2">Statut</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paiements.factures.map((f) => (
                      <tr key={f.id} className="border-b border-bordure last:border-0">
                        <td className="px-3 py-2 font-medium text-encre">{f.numero}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_FACTURE_BADGE[f.statut]}`}
                          >
                            {STATUT_FACTURE_LABEL[f.statut]}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-texte-secondaire">{formatDate(f.dateEmission)}</td>
                        <td className="px-3 py-2 tabular-nums">{formatMontant(f.montant)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {onglet === "Notes admin" && (
          <NotesAdminForm gestionnaireId={gestionnaireId} notesInitiales={notesInitiales} />
        )}
      </div>
    </div>
  );
}
