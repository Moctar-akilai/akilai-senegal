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
      <h1 className="font-display text-2xl font-semibold text-encre">Mes factures</h1>

      {facturesAvecUrl.length === 0 ? (
        <div className="rounded-lg border border-dashed border-bordure p-8 text-center text-sm text-texte-secondaire">
          Aucune facture pour l&apos;instant.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-bordure text-xs font-medium uppercase tracking-wide text-texte-secondaire">
              <tr>
                <th className="px-4 py-3">Numéro</th>
                <th className="px-4 py-3">Montant</th>
                <th className="px-4 py-3">Date d&apos;émission</th>
                <th className="px-4 py-3">Date d&apos;échéance</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bordure">
              {facturesAvecUrl.map((f) => (
                <tr key={f.id} className="hover:bg-bordure/60">
                  <td className="px-4 py-3 font-medium text-encre">{f.numero}</td>
                  <td className="px-4 py-3 text-texte-secondaire">{formatMontant(f.montant)}</td>
                  <td className="px-4 py-3 text-texte-secondaire">{formatDate(f.date_emission)}</td>
                  <td className="px-4 py-3 text-texte-secondaire">{formatDate(f.date_echeance)}</td>
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
                        className="rounded-lg border border-bordure px-3 py-1.5 text-xs font-medium text-encre hover:bg-bordure/60"
                      >
                        Télécharger
                      </a>
                    ) : (
                      <span className="text-xs text-texte-secondaire">PDF non disponible</span>
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
