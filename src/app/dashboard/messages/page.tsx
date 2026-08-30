import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let requete = supabase
    .from("contacts")
    .select("id, nom, telephone, derniere_interaction, premiere_interaction")
    .eq("gestionnaire_id", user!.id)
    .order("derniere_interaction", { ascending: false });

  if (recherche) {
    requete = requete.or(`nom.ilike.%${recherche}%,telephone.ilike.%${recherche}%`);
  }

  const { data: contacts } = await requete;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Messages</h1>
      </div>

      <form className="mb-4">
        <input
          type="text"
          name="q"
          defaultValue={recherche}
          placeholder="Rechercher un contact (nom ou téléphone)…"
          className="w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </form>

      {(!contacts || contacts.length === 0) && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          {recherche
            ? "Aucun contact ne correspond à cette recherche."
            : "Aucun contact pour l'instant. Dès qu'un client écrira sur WhatsApp, il apparaîtra ici."}
        </div>
      )}

      <div className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {(contacts ?? []).map((contact) => (
          <Link
            key={contact.id}
            href={`/dashboard/messages/${contact.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50"
          >
            <div>
              <p className="font-medium text-neutral-900">{contact.nom || contact.telephone}</p>
              {contact.nom && <p className="text-sm text-neutral-500">{contact.telephone}</p>}
            </div>
            <span className="text-xs text-neutral-400">
              {formatDate(contact.derniere_interaction)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
