import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NouveauBailForm } from "./NouveauBailForm";

export default async function NouveauBailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: bien } = await supabase
    .from("biens")
    .select("id, adresse, loyer_mensuel, baux(statut), locataires(id, nom, telephone)")
    .eq("id", id)
    .maybeSingle();

  if (!bien) notFound();

  const aDejaUnBailActif = (bien.baux ?? []).some((b) => b.statut === "actif");
  if (aDejaUnBailActif) redirect(`/dashboard/biens/${id}`);

  return (
    <div>
      <div className="mb-6">
        <Link href={`/dashboard/biens/${id}`} className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Retour
        </Link>
      </div>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Nouveau bail</h1>
      <p className="mb-6 text-sm text-neutral-500">{bien.adresse}</p>

      <NouveauBailForm
        bienId={bien.id}
        loyerMensuel={bien.loyer_mensuel}
        locatairesExistants={bien.locataires ?? []}
      />
    </div>
  );
}
