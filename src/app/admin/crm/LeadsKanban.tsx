"use client";

import { useState } from "react";
import { ecrireAdmin } from "@/lib/admin/ecrire";
import { COLONNES_LEAD, type Lead, type StatutLead } from "@/lib/admin/leads";
import { LeadCard } from "./LeadCard";
import { LeadDetailModal } from "./LeadDetailModal";
import { RaisonPerteModal } from "./RaisonPerteModal";

// Tableau entièrement chargé côté client (state local initialisé depuis les
// props serveur) plutôt que des filtres server-side par searchParams comme
// ailleurs dans l'admin : le drag & drop a de toute façon besoin de tout le
// board en mémoire, donc les filtres (statut/recherche) sont appliqués ici
// directement plutôt que par un aller-retour serveur à chaque changement.
export function LeadsKanban({ leadsInitiaux }: { leadsInitiaux: Lead[] }) {
  const [leads, setLeads] = useState(leadsInitiaux);
  const [filtreStatut, setFiltreStatut] = useState<StatutLead | "">("");
  const [recherche, setRecherche] = useState("");
  const [leadSelectionne, setLeadSelectionne] = useState<Lead | null>(null);
  const [leadEnAttentePerte, setLeadEnAttentePerte] = useState<string | null>(null);
  const [colonneSurvolee, setColonneSurvolee] = useState<StatutLead | null>(null);

  function majLead(leadId: string, patch: Partial<Lead>) {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, ...patch } : l)));
    setLeadSelectionne((prev) => (prev && prev.id === leadId ? { ...prev, ...patch } : prev));
  }

  // Déplacement optimiste (mise à jour locale immédiate) avec retour en
  // arrière si l'écriture échoue — sauf vers "Perdu", qui passe toujours
  // par la confirmation avec raison (RaisonPerteModal) avant tout
  // changement visible.
  async function deplacer(leadId: string, nouveauStatut: StatutLead) {
    if (nouveauStatut === "perdu") {
      setLeadEnAttentePerte(leadId);
      return;
    }
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.statut === nouveauStatut) return;
    const ancienStatut = lead.statut;
    majLead(leadId, { statut: nouveauStatut });
    const resultat = await ecrireAdmin("lead.updateStatut", { leadId, statut: nouveauStatut });
    if (!resultat.ok) majLead(leadId, { statut: ancienStatut });
  }

  const rechercheNormalisee = recherche.trim().toLowerCase();
  function leadsDeColonne(statut: StatutLead) {
    return leads.filter(
      (l) =>
        l.statut === statut &&
        (!rechercheNormalisee ||
          l.nom.toLowerCase().includes(rechercheNormalisee) ||
          (l.entreprise ?? "").toLowerCase().includes(rechercheNormalisee))
    );
  }

  const colonnes = filtreStatut ? COLONNES_LEAD.filter((c) => c.id === filtreStatut) : COLONNES_LEAD;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-texte-secondaire">Statut</label>
          <select
            value={filtreStatut}
            onChange={(e) => setFiltreStatut(e.target.value as StatutLead | "")}
            className="rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
          >
            <option value="">Tous</option>
            {COLONNES_LEAD.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-texte-secondaire">Recherche</label>
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Nom ou entreprise…"
            className="w-64 rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
          />
        </div>
      </div>

      <div className="grid gap-3 overflow-x-auto" style={{ gridTemplateColumns: `repeat(${colonnes.length}, minmax(220px, 1fr))` }}>
        {colonnes.map((c) => {
          const items = leadsDeColonne(c.id);
          return (
            <div
              key={c.id}
              onDragOver={(e) => {
                e.preventDefault();
                setColonneSurvolee(c.id);
              }}
              onDragLeave={() => setColonneSurvolee((s) => (s === c.id ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                setColonneSurvolee(null);
                const leadId = e.dataTransfer.getData("text/plain");
                if (leadId) deplacer(leadId, c.id);
              }}
              className={`min-h-[240px] rounded-lg border p-2 transition-colors ${
                colonneSurvolee === c.id ? "border-argile-forte bg-argile-forte/5" : "border-bordure bg-sable"
              }`}
            >
              <p className="mb-2 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-texte-secondaire">
                {c.label}
                <span className="rounded-full bg-bordure px-1.5 py-0.5 text-[11px] font-medium text-texte-secondaire">
                  {items.length}
                </span>
              </p>
              <div className="space-y-2">
                {items.map((l) => (
                  <LeadCard key={l.id} lead={l} onClick={() => setLeadSelectionne(l)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {leadSelectionne && (
        <LeadDetailModal
          lead={leadSelectionne}
          onFermer={() => setLeadSelectionne(null)}
          onMisAJour={(l) => majLead(l.id, l)}
          onDemanderRaisonPerte={() => setLeadEnAttentePerte(leadSelectionne.id)}
        />
      )}

      {leadEnAttentePerte && (
        <RaisonPerteModal
          leadId={leadEnAttentePerte}
          onFermer={() => setLeadEnAttentePerte(null)}
          onConfirme={(raison) => {
            majLead(leadEnAttentePerte, { statut: "perdu", raisonPerte: raison });
            setLeadEnAttentePerte(null);
            setLeadSelectionne(null);
          }}
        />
      )}
    </div>
  );
}
