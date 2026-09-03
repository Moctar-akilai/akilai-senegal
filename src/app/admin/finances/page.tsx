import { createServiceClient } from "@/lib/supabase/service";
import {
  POSTES_INFRA,
  COUT_PAR_ECHANGE,
  DUREE_VIE_DEFAUT_MOIS,
  SEUIL_RESILIATIONS_POUR_MOYENNE,
  premierJourDuMoisISO,
  plageMois,
  formatMoisLabel,
  etaitActifEnMois,
  etaitActifAuDebutDuMois,
  type AbonnementCalcul,
} from "@/lib/admin/finances";
import { MrrVsCoutsChart } from "./FinancesCharts";
import { RepartitionPlansChart } from "@/app/admin/AdminCharts";
import { CoutsInfraForm } from "./CoutsInfraForm";
import { DepenseAcquisitionForm } from "./DepenseAcquisitionForm";

const NB_MOIS_GRAPHIQUE = 6;
const NB_MOIS_SELECTEUR = 12;
const NB_MOIS_ACQUISITION = 3;

function formatFcfa(montant: number) {
  return `${Math.round(montant).toLocaleString("fr-FR")} FCFA`;
}

function formatPourcent(valeur: number) {
  return `${valeur.toFixed(1)}%`;
}

export default async function AdminFinancesPage() {
  const supabase = createServiceClient();
  const maintenant = new Date();

  const [{ data: abonnementsBruts }, { data: parametresComptes }, { data: coutsBruts }, { data: depensesBrutes }] =
    await Promise.all([
      supabase.from("abonnements").select("gestionnaire_id, montant_mensuel, date_signature, statut_paiement, updated_at, profils(nom)"),
      supabase.from("parametres_compte").select("gestionnaire_id, plan"),
      supabase.from("couts_infrastructure").select("mois, poste, montant"),
      supabase.from("depenses_acquisition").select("mois, montant"),
    ]);

  const abonnements: (AbonnementCalcul & { nom: string })[] = (abonnementsBruts ?? []).map((a) => {
    const profil = Array.isArray(a.profils) ? a.profils[0] : a.profils;
    return {
      gestionnaireId: a.gestionnaire_id,
      montantMensuel: a.montant_mensuel,
      dateSignature: a.date_signature,
      statutPaiement: a.statut_paiement,
      updatedAt: a.updated_at,
      nom: profil?.nom ?? "—",
    };
  });

  const planParId = new Map((parametresComptes ?? []).map((pc) => [pc.gestionnaire_id, pc.plan]));

  // mois ISO ("YYYY-MM-01") -> poste -> montant
  const coutsParMois = new Map<string, Record<string, number>>();
  for (const c of coutsBruts ?? []) {
    if (!coutsParMois.has(c.mois)) coutsParMois.set(c.mois, {});
    coutsParMois.get(c.mois)![c.poste] = c.montant;
  }
  function totalCoutsMois(moisISO: string): number {
    const postes = coutsParMois.get(moisISO);
    if (!postes) return 0;
    return Object.values(postes).reduce((total, m) => total + m, 0);
  }

  const abonnementsActifs = abonnements.filter((a) => a.statutPaiement !== "resilie");

  // ---- KPIs ----
  const mrrTotal = abonnementsActifs.reduce((total, a) => total + a.montantMensuel, 0);
  const arrProjete = mrrTotal * 12;
  const moisEnCoursISO = premierJourDuMoisISO(maintenant);
  const coutsInfraMoisCourant = totalCoutsMois(moisEnCoursISO);
  const margeBrute = mrrTotal - coutsInfraMoisCourant;
  const tauxMarge = mrrTotal > 0 ? (margeBrute / mrrTotal) * 100 : 0;

  const { debut: debutMoisCourant, fin: finMoisCourant } = plageMois(0, maintenant);
  const resiliesCeMois = abonnements.filter(
    (a) => a.statutPaiement === "resilie" && new Date(a.updatedAt) >= debutMoisCourant && new Date(a.updatedAt) <= finMoisCourant
  ).length;
  const actifsDebutMoisCourant = abonnements.filter((a) => etaitActifAuDebutDuMois(a, debutMoisCourant)).length;
  const churnRate = actifsDebutMoisCourant > 0 ? (resiliesCeMois / actifsDebutMoisCourant) * 100 : 0;

  const kpis = [
    { label: "MRR total", valeur: formatFcfa(mrrTotal) },
    { label: "ARR projeté", valeur: formatFcfa(arrProjete) },
    { label: "Coûts infrastructure (mois)", valeur: formatFcfa(coutsInfraMoisCourant) },
    { label: "Marge brute", valeur: formatFcfa(margeBrute) },
    { label: "Taux de marge", valeur: formatPourcent(tauxMarge) },
    { label: "Churn rate (mois)", valeur: formatPourcent(churnRate) },
  ];

  // ---- Graphique MRR vs Coûts (6 derniers mois) ----
  // Aucun historique n'est conservé pour statut_paiement : "actif en mois M"
  // est reconstruit depuis l'état ACTUEL de chaque abonnement + updated_at
  // comme proxy de la date de résiliation (voir etaitActifEnMois). Bonne
  // approximation pour une première version, pas un vrai ledger historique.
  const donneesGraphique = Array.from({ length: NB_MOIS_GRAPHIQUE }, (_, i) => NB_MOIS_GRAPHIQUE - 1 - i).map(
    (offset) => {
      const { debut, fin } = plageMois(offset, maintenant);
      const mrrMois = abonnements
        .filter((a) => etaitActifEnMois(a, debut, fin))
        .reduce((total, a) => total + a.montantMensuel, 0);
      return {
        mois: formatMoisLabel(debut),
        mrr: mrrMois,
        couts: totalCoutsMois(premierJourDuMoisISO(debut)),
      };
    }
  );

  // ---- Donut CA par plan (abonnements actifs) ----
  const caParPlan = new Map<string, number>();
  for (const a of abonnementsActifs) {
    const plan = planParId.get(a.gestionnaireId) ?? "Essentiel";
    caParPlan.set(plan, (caParPlan.get(plan) ?? 0) + a.montantMensuel);
  }
  const donneesCaParPlan = Array.from(caParPlan.entries())
    .map(([plan, count]) => ({ plan, count }))
    .filter((e) => e.count > 0);

  // ---- Projection fin d'année ----
  // Rythme d'acquisition = nombre de nouveaux abonnements signés par mois,
  // moyenné sur les 3 derniers mois COMPLETS (le mois en cours est exclu
  // car partiel, ce qui sous-estimerait le rythme réel). La valeur type
  // d'un "nouvel" abonnement est approximée par le montant mensuel moyen
  // des abonnements actifs actuels — une hypothèse simplificatrice.
  const nouveauxParMoisRecent = Array.from({ length: NB_MOIS_ACQUISITION }, (_, i) => i + 1).map((offset) => {
    const { debut, fin } = plageMois(offset, maintenant);
    return abonnements.filter((a) => {
      const signature = new Date(a.dateSignature);
      return signature >= debut && signature <= fin;
    }).length;
  });
  const rythmeAcquisitionMoyen =
    nouveauxParMoisRecent.reduce((total, n) => total + n, 0) / (nouveauxParMoisRecent.length || 1);
  const montantMoyenNouvelAbonnement =
    abonnementsActifs.length > 0 ? mrrTotal / abonnementsActifs.length : 0;
  const moisRestantsAnnee = Math.max(0, 12 - (maintenant.getMonth() + 1));

  const scenarios = [
    { label: "Pessimiste", multiplicateur: 0.5 },
    { label: "Réaliste", multiplicateur: 1 },
    { label: "Optimiste", multiplicateur: 1.5 },
  ].map((s) => {
    const rythme = rythmeAcquisitionMoyen * s.multiplicateur;
    const mrrProjete = mrrTotal + rythme * montantMoyenNouvelAbonnement * moisRestantsAnnee;
    return { ...s, mrrProjete };
  });

  // ---- Marge par client ----
  const debutMoisISOStr = debutMoisCourant.toISOString();
  const { data: messagesMoisBruts } = await supabase
    .from("conversations_whatsapp")
    .select("gestionnaire_id")
    .in("gestionnaire_id", abonnementsActifs.map((a) => a.gestionnaireId))
    .gte("created_at", debutMoisISOStr);
  const messagesParClient = new Map<string, number>();
  for (const m of messagesMoisBruts ?? []) {
    messagesParClient.set(m.gestionnaire_id, (messagesParClient.get(m.gestionnaire_id) ?? 0) + 1);
  }
  const nbClientsActifs = abonnementsActifs.length;
  const quotePartFixe = nbClientsActifs > 0 ? coutsInfraMoisCourant / nbClientsActifs : 0;

  const margeParClient = abonnementsActifs
    .map((a) => {
      const messages = messagesParClient.get(a.gestionnaireId) ?? 0;
      const coutVariable = messages * COUT_PAR_ECHANGE;
      const coutEstime = coutVariable + quotePartFixe;
      const marge = a.montantMensuel - coutEstime;
      const taux = a.montantMensuel > 0 ? (marge / a.montantMensuel) * 100 : 0;
      return { gestionnaireId: a.gestionnaireId, nom: a.nom, mrr: a.montantMensuel, coutEstime, marge, taux };
    })
    .sort((a, b) => b.marge - a.marge);

  // ---- LTV / CAC ----
  const resiliations = abonnements.filter((a) => a.statutPaiement === "resilie");
  const dureesVieMois = resiliations.map((a) => {
    const joursVie = (new Date(a.updatedAt).getTime() - new Date(a.dateSignature).getTime()) / (24 * 60 * 60 * 1000);
    return joursVie / 30.44;
  });
  const dureeVieCalculeeFiable = dureesVieMois.length >= SEUIL_RESILIATIONS_POUR_MOYENNE;
  const dureeVieMoyenneMois = dureeVieCalculeeFiable
    ? dureesVieMois.reduce((total, d) => total + d, 0) / dureesVieMois.length
    : DUREE_VIE_DEFAUT_MOIS;
  const mrrMoyenParClient = abonnementsActifs.length > 0 ? mrrTotal / abonnementsActifs.length : 0;
  const ltv = mrrMoyenParClient * dureeVieMoyenneMois;

  const depenseAcquisitionMois = (depensesBrutes ?? []).find((d) => d.mois === moisEnCoursISO)?.montant ?? 0;
  const nouveauxClientsCeMois = abonnements.filter((a) => {
    const signature = new Date(a.dateSignature);
    return signature >= debutMoisCourant && signature <= finMoisCourant;
  }).length;
  const cac = nouveauxClientsCeMois > 0 ? depenseAcquisitionMois / nouveauxClientsCeMois : null;
  const ratioLtvCac = cac ? ltv / cac : null;

  // ---- Formulaire coûts infra : 12 derniers mois ----
  const moisDisponibles = Array.from({ length: NB_MOIS_SELECTEUR }, (_, i) => {
    const { debut } = plageMois(i, maintenant);
    return { value: premierJourDuMoisISO(debut), label: formatMoisLabel(debut) };
  });
  const donneesCoutsParMois: Record<string, Record<string, number>> = {};
  for (const m of moisDisponibles) {
    const postes = coutsParMois.get(m.value) ?? {};
    donneesCoutsParMois[m.value] = Object.fromEntries(POSTES_INFRA.map((p) => [p, postes[p] ?? 0]));
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-encre">Finances</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)] p-5">
            <p className="text-sm text-texte-secondaire">{kpi.label}</p>
            <p className="mt-2 font-display text-2xl font-semibold text-encre tabular-nums">{kpi.valeur}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)] p-5 lg:col-span-2">
          <h2 className="mb-2 text-sm font-medium text-encre">Évolution MRR vs Coûts (6 derniers mois)</h2>
          <MrrVsCoutsChart data={donneesGraphique} />
        </div>
        <div className="rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)] p-5">
          <h2 className="mb-2 text-sm font-medium text-encre">CA par plan</h2>
          <RepartitionPlansChart data={donneesCaParPlan} />
        </div>
      </div>

      <div className="rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)] p-5">
        <h2 className="mb-1 text-sm font-medium text-encre">Projection fin d&apos;année</h2>
        <p className="mb-3 text-xs text-texte-secondaire">
          Basée sur {rythmeAcquisitionMoyen.toFixed(1)} nouveau(x) abonnement(s)/mois en moyenne sur les 3 derniers
          mois complets, valeur type {formatFcfa(montantMoyenNouvelAbonnement)}/abonnement, {moisRestantsAnnee}{" "}
          mois restants avant fin décembre.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {scenarios.map((s) => (
            <div key={s.label} className="rounded-lg border border-bordure p-3">
              <p className="text-xs text-texte-secondaire">{s.label}</p>
              <p className="mt-1 text-lg font-semibold text-encre tabular-nums">{formatFcfa(s.mrrProjete)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)] p-5">
        <h2 className="mb-1 text-sm font-medium text-encre">Métriques avancées</h2>
        <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-bordure p-3">
            <p className="text-xs text-texte-secondaire">
              LTV {!dureeVieCalculeeFiable && <span className="italic">(estimation par défaut)</span>}
            </p>
            <p className="mt-1 text-lg font-semibold text-encre tabular-nums">{formatFcfa(ltv)}</p>
            <p className="mt-0.5 text-[11px] text-texte-secondaire">
              MRR moyen × {dureeVieMoyenneMois.toFixed(1)} mois
              {!dureeVieCalculeeFiable && ` (défaut ${DUREE_VIE_DEFAUT_MOIS} mois, moins de ${SEUIL_RESILIATIONS_POUR_MOYENNE} résiliations)`}
            </p>
          </div>
          <div className="rounded-lg border border-bordure p-3">
            <p className="text-xs text-texte-secondaire">CAC (mois en cours)</p>
            <p className="mt-1 text-lg font-semibold text-encre tabular-nums">{cac !== null ? formatFcfa(cac) : "N/A"}</p>
            <p className="mt-0.5 text-[11px] text-texte-secondaire">
              {nouveauxClientsCeMois} nouveau(x) client(s) ce mois
            </p>
          </div>
          <div className="rounded-lg border border-bordure p-3">
            <p className="text-xs text-texte-secondaire">Ratio LTV / CAC</p>
            <p className="mt-1 text-lg font-semibold text-encre tabular-nums">
              {ratioLtvCac !== null ? `${ratioLtvCac.toFixed(1)}×` : "N/A"}
            </p>
          </div>
          <div className="rounded-lg border border-bordure p-3">
            <p className="text-xs text-texte-secondaire">Churn rate (mois)</p>
            <p className="mt-1 text-lg font-semibold text-encre tabular-nums">{formatPourcent(churnRate)}</p>
          </div>
        </div>
        <DepenseAcquisitionForm moisISO={moisEnCoursISO} montantInitial={depenseAcquisitionMois} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)]">
        <div className="p-5 pb-0">
          <h2 className="text-sm font-medium text-encre">Marge par client (mois en cours)</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-bordure text-xs uppercase tracking-wide text-texte-secondaire">
            <tr>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">MRR</th>
              <th className="px-4 py-3">Coût estimé</th>
              <th className="px-4 py-3">Marge</th>
              <th className="px-4 py-3">Taux de marge</th>
            </tr>
          </thead>
          <tbody>
            {margeParClient.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-texte-secondaire">
                  Aucun abonnement actif.
                </td>
              </tr>
            ) : (
              margeParClient.map((m) => (
                <tr key={m.gestionnaireId} className="border-b border-bordure last:border-0">
                  <td className="px-4 py-3 font-medium text-encre">{m.nom}</td>
                  <td className="px-4 py-3 tabular-nums">{formatFcfa(m.mrr)}</td>
                  <td className="px-4 py-3 tabular-nums text-texte-secondaire">{formatFcfa(m.coutEstime)}</td>
                  <td className={`px-4 py-3 tabular-nums ${m.marge < 0 ? "text-erreur" : "text-encre"}`}>
                    {formatFcfa(m.marge)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatPourcent(m.taux)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CoutsInfraForm moisDisponibles={moisDisponibles} donneesParMois={donneesCoutsParMois} moisEnCoursISO={moisEnCoursISO} />
    </div>
  );
}
