import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";

function formatDate(date: string) {
  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const recherche = (q ?? "").trim();

  // ⚠️ Auth temporairement contournée — client service_role (contourne le
  // RLS) au lieu du client anon, le temps que le bypass reste actif.
  // Détails complets dans src/lib/auth/gestionnaire-actuel.ts.
  const supabase = createServiceClient();
  const user = await getGestionnaireActuel();

  let requete = supabase
    .from("contacts")
    .select("id, nom, telephone, derniere_interaction, premiere_interaction")
    .eq("gestionnaire_id", user.id)
    .order("derniere_interaction", { ascending: false });

  if (recherche) {
    requete = requete.or(`nom.ilike.%${recherche}%,telephone.ilike.%${recherche}%`);
  }

  const { data: contacts } = await requete;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-encre">Messages</h1>
      </div>

      <form className="mb-4">
        <input
          type="text"
          name="q"
          defaultValue={recherche}
          placeholder="Rechercher un contact (nom ou téléphone)…"
          className="w-full max-w-sm rounded-lg border border-bordure px-3 py-2 text-sm outline-none focus:border-argile-forte"
        />
      </form>

      {(!contacts || contacts.length === 0) && (
        <div className="rounded-lg border border-dashed border-bordure p-8 text-center text-sm text-texte-secondaire">
          {recherche
            ? "Aucun contact ne correspond à cette recherche."
            : "Aucun contact pour l'instant. Dès qu'un client écrira sur WhatsApp, il apparaîtra ici."}
        </div>
      )}

      <div className="divide-y divide-bordure rounded-lg border border-bordure bg-carte shadow-[var(--shadow-carte)]">
        {(contacts ?? []).map((contact) => (
          <Link
            key={contact.id}
            href={`/dashboard/messages/${contact.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-bordure/60"
          >
            <div>
              <p className="font-medium text-encre">{contact.nom || contact.telephone}</p>
              {contact.nom && <p className="text-sm text-texte-secondaire">{contact.telephone}</p>}
            </div>
            <span className="text-xs text-texte-secondaire">
              {formatDate(contact.derniere_interaction)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
