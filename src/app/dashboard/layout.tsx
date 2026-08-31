import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";
import { NavLinks } from "./NavLinks";
import { NotificationBell } from "./NotificationBell";

const NB_NOTIFICATIONS_AFFICHEES = 20;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  // ⚠️ Auth temporairement contournée — voir src/lib/auth/gestionnaire-actuel.ts
  // Remettre : const { data: { user } } = await supabase.auth.getUser();
  const user = await getGestionnaireActuel();

  let nom = "";
  if (user) {
    const { data: profil } = await supabase
      .from("profils")
      .select("nom")
      .eq("id", user.id)
      .single();
    nom = profil?.nom ?? "";
  }

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, titre, message, lien, lu, created_at")
    .eq("gestionnaire_id", user.id)
    .order("created_at", { ascending: false })
    .limit(NB_NOTIFICATIONS_AFFICHEES);

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
        <Link href="/dashboard" className="text-lg font-semibold text-neutral-900">
          AkilAI
        </Link>
        <div className="flex items-center gap-4">
          <NotificationBell gestionnaireId={user.id} notificationsInitiales={notifications ?? []} />
          <span className="text-sm text-neutral-600">{nom}</span>
          <form action="/api/auth/logout" method="post">
            <button className="text-sm text-neutral-500 hover:text-neutral-900">
              Se déconnecter
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl gap-8 px-6 py-8">
        <nav className="w-56 shrink-0">
          <NavLinks />
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
