import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ModifierBienForm } from "./ModifierBienForm";

export default async function ModifierBienPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: bien } = await supabase
    .from("biens")
    .select(
      "id, adresse, ville, loyer_mensuel, charges, baux(id, statut, date_debut, montant_loyer, depot_garantie, locataires(id, nom, telephone, email))"
    )
    .eq("id", id)
    .maybeSingle();

  if (!bien) notFound();

  const bailActif = (bien.baux ?? []).find((b) => b.statut === "actif");
  const locataire = bailActif?.locataires?.[0];

  return (
    <div>
      <div className="mb-6">
        <Link href={`/dashboard/biens/${id}`} className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Retour
        </Link>
      </div>
      <h1 className="mb-6 text-xl font-semibold text-neutral-900">Modifier le bien</h1>

      <ModifierBienForm
        bienId={bien.id}
        bien={{
          adresse: bien.adresse,
          ville: bien.ville,
          loyerMensuel: bien.loyer_mensuel,
          charges: bien.charges,
        }}
        locataire={
          locataire
            ? {
                id: locataire.id,
                nom: locataire.nom,
                telephone: locataire.telephone,
                email: locataire.email ?? "",
              }
            : null
        }
        bail={
          bailActif
            ? {
                id: bailActif.id,
                dateDebut: bailActif.date_debut,
                montantLoyer: bailActif.montant_loyer,
                depotGarantie: bailActif.depot_garantie,
              }
            : null
        }
      />
    </div>
  );
}
