import { createServiceClient } from "@/lib/supabase/service";
import { PRIX_PLANS } from "@/lib/admin/plans";
import type { Lead, StatutLead } from "@/lib/admin/leads";
import { LeadsKanban } from "./LeadsKanban";
import { BoutonNouveauLead } from "./BoutonNouveauLead";

export default async function AdminCrmPage() {
  const supabase = createServiceClient();
  const { data: leadsBruts } = await supabase.from("leads").select("*").order("created_at", { ascending: false });

  const leads: Lead[] = (leadsBruts ?? []).map((l) => ({
    id: l.id,
    nom: l.nom,
    entreprise: l.entreprise,
    telephone: l.telephone,
    email: l.email,
    statut: l.statut as StatutLead,
    source: l.source,
    notes: l.notes,
    raisonPerte: l.raison_perte,
    planEstime: l.plan_estime,
    gestionnaireIdConverti: l.gestionnaire_id_converti,
    createdAt: l.created_at,
  }));

  const totalLeads = leads.length;
  const nbDemos = leads.filter((l) => l.statut === "demo_planifiee").length;
  const nbNonProspect = leads.filter((l) => l.statut !== "prospect").length;
  const nbGagnes = leads.filter((l) => l.statut === "gagne").length;
  const tauxConversion = nbNonProspect > 0 ? Math.round((nbGagnes / nbNonProspect) * 100) : 0;
  const caPipelineEstime = leads
    .filter((l) => l.statut !== "gagne" && l.statut !== "perdu" && l.planEstime)
    .reduce((total, l) => total + (PRIX_PLANS[l.planEstime as string] ?? 0), 0);

  const kpis = [
    { label: "Total leads", valeur: totalLeads },
    { label: "Démos planifiées", valeur: nbDemos },
    { label: "Taux de conversion", valeur: `${tauxConversion}%` },
    { label: "CA pipeline estimé (FCFA)", valeur: caPipelineEstime.toLocaleString("fr-FR") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-encre">CRM commercial</h1>
        <BoutonNouveauLead />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)] p-5">
            <p className="h-10 line-clamp-2 text-sm text-texte-secondaire">{kpi.label}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-encre tabular-nums">{kpi.valeur}</p>
          </div>
        ))}
      </div>

      <LeadsKanban leadsInitiaux={leads} />
    </div>
  );
}
