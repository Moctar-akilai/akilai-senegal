import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { PRIX_PLANS } from "@/lib/admin/plans";
import { calculerStatutPaiement, type StatutPaiement, type SantePaiement } from "@/lib/admin/facturation";
import { AbonnementLigne, type AbonnementAffiche } from "./AbonnementLigne";
import { BoutonAjouterAbonnement } from "./BoutonAjouterAbonnement";
import { ExportCsvForm } from "./ExportCsvForm";

const ONGLETS = [
  { id: "a_jour", label: "À jour", statuts: ["a_jour"] as StatutPaiement[] },
  { id: "relances", label: "Relances", statuts: ["relance_j7", "relance_j3"] as StatutPaiement[] },
  { id: "en_retard", label: "En retard", statuts: ["en_retard"] as StatutPaiement[] },
  { id: "resilies", label: "Résiliés", statuts: ["resilie"] as StatutPaiement[] },
] as const;

export default async function AdminFacturationPage({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { onglet: ongletParam } = await searchParams;
  const ongletActif = ONGLETS.find((o) => o.id === ongletParam) ?? ONGLETS[0];

  const supabase = createServiceClient();

  const [{ data: abonnementsBruts }, { data: profilsClients }, { data: parametresComptes }] = await Promise.all([
    supabase.from("abonnements").select("*, profils(nom)"),
    supabase.from("profils").select("id, nom").eq("est_admin", false),
    supabase.from("parametres_compte").select("gestionnaire_id, plan"),
  ]);

  const planParId = new Map((parametresComptes ?? []).map((pc) => [pc.gestionnaire_id, pc.plan]));

  // Calcule le statut d'affichage à partir de date_prochain_paiement et le
  // réécrit en base pour les lignes qui ont changé (voir calculerStatutPaiement
  // — choix fait pour ce chantier : recalcul + write-back à chaque
  // chargement de cette page plutôt qu'un cron, 'resilie' n'est jamais
  // recalculé automatiquement).
  const abonnements: AbonnementAffiche[] = [];
  const misesAJour: { id: string; statut: StatutPaiement }[] = [];

  for (const a of abonnementsBruts ?? []) {
    const profil = Array.isArray(a.profils) ? a.profils[0] : a.profils;
    const statutCalcule = calculerStatutPaiement(a.date_prochain_paiement, a.statut_paiement as StatutPaiement);
    if (statutCalcule !== a.statut_paiement) {
      misesAJour.push({ id: a.id, statut: statutCalcule });
    }
    abonnements.push({
      gestionnaireId: a.gestionnaire_id,
      nom: profil?.nom ?? "—",
      plan: planParId.get(a.gestionnaire_id) ?? "Essentiel",
      montantMensuel: a.montant_mensuel,
      dateSignature: a.date_signature,
      dateProchainPaiement: a.date_prochain_paiement,
      statutPaiement: statutCalcule,
      santePaiement: a.sante_paiement as SantePaiement,
    });
  }

  if (misesAJour.length > 0) {
    await Promise.all(
      misesAJour.map((m) =>
        supabase
          .from("abonnements")
          .update({ statut_paiement: m.statut, updated_at: new Date().toISOString() })
          .eq("id", m.id)
      )
    );
  }

  const idsAvecAbonnement = new Set(abonnements.map((a) => a.gestionnaireId));
  const clientsSansAbonnement = (profilsClients ?? [])
    .filter((p) => !idsAvecAbonnement.has(p.id))
    .map((p) => ({ id: p.id, nom: p.nom || "—", plan: planParId.get(p.id) ?? "Essentiel" }));

  const lignesFiltrees = abonnements
    .filter((a) => (ongletActif.statuts as StatutPaiement[]).includes(a.statutPaiement))
    .sort((a, b) => a.dateProchainPaiement.localeCompare(b.dateProchainPaiement));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-encre">Facturation &amp; Paiements</h1>
        <BoutonAjouterAbonnement clients={clientsSansAbonnement} prixPlans={PRIX_PLANS} />
      </div>

      <ExportCsvForm />

      <div className="flex gap-1 rounded-lg border border-bordure bg-carte p-1 shadow-[var(--shadow-carte)]">
        {ONGLETS.map((o) => {
          const nb = abonnements.filter((a) => (o.statuts as StatutPaiement[]).includes(a.statutPaiement)).length;
          return (
            <Link
              key={o.id}
              href={`/admin/facturation?onglet=${o.id}`}
              className={`flex-1 rounded-lg px-4 py-2 text-center text-sm font-medium ${
                ongletActif.id === o.id
                  ? "bg-argile-forte text-white"
                  : "text-texte-secondaire hover:bg-bordure/60"
              }`}
            >
              {o.label} ({nb})
            </Link>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-bordure text-xs uppercase tracking-wide text-texte-secondaire">
            <tr>
              <th className="px-4 py-3">Entreprise</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Montant</th>
              <th className="px-4 py-3">Date signature</th>
              <th className="px-4 py-3">Prochain paiement</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Santé</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {lignesFiltrees.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-texte-secondaire">
                  Aucun abonnement dans cet onglet.
                </td>
              </tr>
            ) : (
              lignesFiltrees.map((a) => <AbonnementLigne key={a.gestionnaireId} abonnement={a} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
