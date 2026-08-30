import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { assurerEcheanceMoisCourant, moisCourantISO } from "@/lib/data/paiements";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: biens } = await supabase
    .from("biens")
    .select(
      "id, adresse, ville, loyer_mensuel, baux(id, montant_loyer, statut, locataires(nom))"
    )
    .eq("gestionnaire_id", user!.id)
    .order("created_at", { ascending: false });

  const mois = moisCourantISO();

  // S'assurer que l'échéance du mois courant existe pour chaque bail actif,
  // puis récupérer le statut de paiement et le nom du locataire courant
  const statutsParBien = new Map<string, string>();
  const locataireParBien = new Map<string, string>();
  for (const bien of biens ?? []) {
    const bailActif = (bien.baux ?? []).find((b) => b.statut === "actif");
    if (!bailActif) continue;
    if (bailActif.locataires?.[0]) locataireParBien.set(bien.id, bailActif.locataires[0].nom);
    await assurerEcheanceMoisCourant(supabase, bailActif.id, bailActif.montant_loyer);
    const { data: paiement } = await supabase
      .from("paiements")
      .select("statut")
      .eq("bail_id", bailActif.id)
      .eq("mois", mois)
      .maybeSingle();
    statutsParBien.set(bien.id, paiement?.statut ?? "en_attente");
  }

  const badge = (statut: string) => {
    const styles: Record<string, string> = {
      paye: "bg-green-100 text-green-700",
      en_attente: "bg-amber-100 text-amber-700",
      retard: "bg-red-100 text-red-700",
    };
    const labels: Record<string, string> = {
      paye: "Payé",
      en_attente: "En attente",
      retard: "Retard",
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[statut]}`}>
        {labels[statut]}
      </span>
    );
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Mes biens</h1>
        <Link
          href="/dashboard/biens/nouveau"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + Ajouter un bien
        </Link>
      </div>

      {(!biens || biens.length === 0) && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          Aucun bien pour l&apos;instant. Ajoute ton premier bien pour commencer.
        </div>
      )}

      <div className="grid gap-3">
        {(biens ?? []).map((bien) => (
          <Link
            key={bien.id}
            href={`/dashboard/biens/${bien.id}`}
            className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 hover:border-neutral-400"
          >
            <div>
              <p className="font-medium text-neutral-900">{bien.adresse}</p>
              <p className="text-sm text-neutral-500">
                {bien.ville} · {bien.loyer_mensuel.toLocaleString("fr-FR")} FCFA/mois
                {locataireParBien.has(bien.id) && ` · ${locataireParBien.get(bien.id)}`}
              </p>
            </div>
            {statutsParBien.has(bien.id) && badge(statutsParBien.get(bien.id)!)}
          </Link>
        ))}
      </div>
    </div>
  );
}
