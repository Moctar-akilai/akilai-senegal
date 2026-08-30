import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assurerEcheanceMoisCourant, formatMois, moisCourantISO } from "@/lib/data/paiements";
import { MarquerPayeForm } from "./MarquerPayeForm";
import { CloturerBailForm } from "./CloturerBailForm";

const STATUT_BAIL_LABELS: Record<string, string> = {
  actif: "Actif",
  termine: "Terminé",
  resilie: "Résilié",
};

const STATUT_STYLES: Record<string, string> = {
  paye: "bg-green-100 text-green-700",
  en_attente: "bg-amber-100 text-amber-700",
  retard: "bg-red-100 text-red-700",
};

const STATUT_LABELS: Record<string, string> = {
  paye: "Payé",
  en_attente: "En attente",
  retard: "Retard",
};

const MOYEN_LABELS: Record<string, string> = {
  orange_money: "Orange Money",
  wave: "Wave",
  especes: "Espèces",
  virement: "Virement",
  autre: "Autre",
};

export default async function BienDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: bien } = await supabase
    .from("biens")
    .select(
      "id, adresse, ville, loyer_mensuel, charges, baux(id, statut, date_debut, date_fin, montant_loyer, depot_garantie, locataires(id, nom, telephone, email))"
    )
    .eq("id", id)
    .maybeSingle();

  if (!bien) notFound();

  const baux = [...(bien.baux ?? [])].sort((a, b) => (a.date_debut < b.date_debut ? 1 : -1));
  const bailActif = baux.find((b) => b.statut === "actif");
  const locataire = bailActif?.locataires?.[0];

  type PaiementLigne = {
    id: string;
    mois: string;
    montant: number;
    statut: string;
    date_encaissement: string | null;
    moyen_paiement: string | null;
  };

  let paiements: PaiementLigne[] = [];
  if (bailActif) {
    await assurerEcheanceMoisCourant(supabase, bailActif.id, bailActif.montant_loyer);
    const { data } = await supabase
      .from("paiements")
      .select("id, mois, montant, statut, date_encaissement, moyen_paiement")
      .eq("bail_id", bailActif.id)
      .order("mois", { ascending: false });
    paiements = data ?? [];
  }

  const mois = moisCourantISO();
  const paiementMoisCourant = paiements.find((p) => p.mois === mois);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Retour
        </Link>
        <Link
          href={`/dashboard/biens/${id}/modifier`}
          className="text-sm text-neutral-500 hover:text-neutral-900"
        >
          Modifier
        </Link>
      </div>

      <h1 className="mb-1 text-xl font-semibold text-neutral-900">{bien.adresse}</h1>
      <p className="mb-6 text-sm text-neutral-500">{bien.ville}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Bien</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">Loyer mensuel</dt>
              <dd className="text-neutral-900">
                {bien.loyer_mensuel.toLocaleString("fr-FR")} FCFA
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Charges</dt>
              <dd className="text-neutral-900">{bien.charges.toLocaleString("fr-FR")} FCFA</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Locataire</h2>
          {locataire ? (
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Nom</dt>
                <dd className="text-neutral-900">{locataire.nom}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Téléphone</dt>
                <dd className="text-neutral-900">{locataire.telephone}</dd>
              </div>
              {locataire.email && (
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Email</dt>
                  <dd className="text-neutral-900">{locataire.email}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-neutral-500">Aucun locataire.</p>
          )}
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-5 sm:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Bail</h2>
          {bailActif ? (
            <>
              <dl className="mb-4 grid gap-1 text-sm sm:grid-cols-2">
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Date de début</dt>
                  <dd className="text-neutral-900">{bailActif.date_debut}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Montant du loyer</dt>
                  <dd className="text-neutral-900">
                    {bailActif.montant_loyer.toLocaleString("fr-FR")} FCFA
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Dépôt de garantie</dt>
                  <dd className="text-neutral-900">
                    {bailActif.depot_garantie.toLocaleString("fr-FR")} FCFA
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Statut</dt>
                  <dd className="text-neutral-900">Actif</dd>
                </div>
              </dl>
              <CloturerBailForm bailId={bailActif.id} />
            </>
          ) : (
            <div>
              <p className="mb-3 text-sm text-neutral-500">Aucun bail actif.</p>
              <Link
                href={`/dashboard/biens/${id}/nouveau-bail`}
                className="inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Nouveau bail
              </Link>
            </div>
          )}
        </section>
      </div>

      {baux.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-semibold text-neutral-900">Historique des baux</h2>
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Locataire</th>
                  <th className="px-4 py-2 font-medium">Période</th>
                  <th className="px-4 py-2 font-medium">Loyer</th>
                  <th className="px-4 py-2 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {baux.map((b) => (
                  <tr key={b.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-2 text-neutral-900">
                      {b.locataires?.[0]?.nom ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-neutral-500">
                      {b.date_debut} → {b.date_fin ?? "en cours"}
                    </td>
                    <td className="px-4 py-2 text-neutral-900">
                      {b.montant_loyer.toLocaleString("fr-FR")} FCFA
                    </td>
                    <td className="px-4 py-2 text-neutral-500">{STATUT_BAIL_LABELS[b.statut]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {bailActif && paiementMoisCourant && paiementMoisCourant.statut !== "paye" && (
        <div className="mt-6">
          <p className="mb-2 text-sm text-neutral-500">
            Échéance de {formatMois(mois)} : {paiementMoisCourant.montant.toLocaleString("fr-FR")}{" "}
            FCFA
          </p>
          <MarquerPayeForm paiementId={paiementMoisCourant.id} />
        </div>
      )}

      <h2 className="mb-3 mt-8 text-sm font-semibold text-neutral-900">Historique des paiements</h2>
      {paiements.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          Aucun paiement enregistré.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Mois</th>
                <th className="px-4 py-2 font-medium">Montant</th>
                <th className="px-4 py-2 font-medium">Statut</th>
                <th className="px-4 py-2 font-medium">Encaissé le</th>
                <th className="px-4 py-2 font-medium">Moyen</th>
              </tr>
            </thead>
            <tbody>
              {paiements.map((p) => (
                <tr key={p.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-2 text-neutral-900">{formatMois(p.mois)}</td>
                  <td className="px-4 py-2 text-neutral-900">
                    {p.montant.toLocaleString("fr-FR")} FCFA
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_STYLES[p.statut]}`}
                    >
                      {STATUT_LABELS[p.statut]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-neutral-500">{p.date_encaissement ?? "—"}</td>
                  <td className="px-4 py-2 text-neutral-500">
                    {p.moyen_paiement ? MOYEN_LABELS[p.moyen_paiement] : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
