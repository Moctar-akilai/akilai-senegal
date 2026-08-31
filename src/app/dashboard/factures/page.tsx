import { createServiceClient } from "@/lib/supabase/service";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";
import { STATUT_FACTURE_BADGE, STATUT_FACTURE_LABEL, type StatutFacture } from "@/lib/factures/statuts";

const DUREE_URL_SIGNEE = 3600; // 1h

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatMontant(montant: number) {
  return `${montant.toLocaleString("fr-FR")} FCFA`;
}

export default async function FacturesPage() {
  // ⚠️ Auth temporairement contournée — client service_role (contourne le
  // RLS) au lieu du client anon, le temps que le bypass reste actif.
  // Détails complets dans src/lib/auth/gestionnaire-actuel.ts. Ça vaut
  // aussi pour createSignedUrl() plus bas : la policy Storage du bucket
  // "factures" est gated sur auth.uid(), donc bloquée elle aussi tant que
  // le bypass est actif.
  const supabase = createServiceClient();
  const user = await getGestionnaireActuel();

  const { data: factures } = await supabase
    .from("factures")
    .select("id, numero, montant, statut, date_emission, date_echeance, pdf_chemin")
    .eq("gestionnaire_id", user.id)
    .order("date_emission", { ascending: false });

  const facturesAvecUrl = await Promise.all(
    (factures ?? []).map(async (f) => {
      if (!f.pdf_chemin) return { ...f, urlSignee: null };
      const { data } = await supabase.storage
        .from("factures")
        .createSignedUrl(f.pdf_chemin, DUREE_URL_SIGNEE);
      return { ...f, urlSignee: data?.signedUrl ?? null };
    })
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-neutral-900">Mes factures</h1>

      {facturesAvecUrl.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          Aucune facture pour l&apos;instant.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs font-medium uppercase tracking-wide text-neutral-400">
              <tr>
                <th className="px-4 py-3">Numéro</th>
                <th className="px-4 py-3">Montant</th>
                <th className="px-4 py-3">Date d&apos;émission</th>
                <th className="px-4 py-3">Date d&apos;échéance</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {facturesAvecUrl.map((f) => (
                <tr key={f.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-medium text-neutral-900">{f.numero}</td>
                  <td className="px-4 py-3 text-neutral-600">{formatMontant(f.montant)}</td>
                  <td className="px-4 py-3 text-neutral-500">{formatDate(f.date_emission)}</td>
                  <td className="px-4 py-3 text-neutral-500">{formatDate(f.date_echeance)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_FACTURE_BADGE[f.statut as StatutFacture]}`}
                    >
                      {STATUT_FACTURE_LABEL[f.statut as StatutFacture]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {f.urlSignee ? (
                      <a
                        href={f.urlSignee}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        Télécharger
                      </a>
                    ) : (
                      <span className="text-xs text-neutral-400">PDF non disponible</span>
                    )}
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
