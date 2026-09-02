import Link from "next/link";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getAdminActuel } from "@/lib/auth/admin-actuel";
import { AdminNavLinks } from "./AdminNavLinks";

// Force le rendu dynamique par requête — voir le commentaire équivalent
// dans src/app/dashboard/layout.tsx (même raison : createServiceClient()
// n'a aucune dépendance à cookies()/headers() qui forcerait ce
// comportement implicitement).
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Le middleware protège déjà /admin/* (session + profils.est_admin) —
  // ce try/catch est une défense en profondeur si cette route est jamais
  // atteinte autrement.
  let admin: { id: string; nom: string };
  try {
    admin = await getAdminActuel();
  } catch {
    redirect("/dashboard");
  }

  const supabase = createServiceClient();
  const { count: nbTicketsOuverts } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .in("statut", ["ouvert", "en_cours"]);

  return (
    <div className="min-h-screen bg-sable">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-indigo-profond">
        <div className="bg-erreur px-6 py-2 text-center text-xs font-semibold uppercase tracking-wide text-white">
          Mode Admin
        </div>

        <div className="px-6 py-6">
          <Link href="/admin" className="block text-lg font-display font-semibold text-blanc-casse">
            AkilAI <span className="text-nav-inactif">— Admin</span>
          </Link>
        </div>

        <nav className="nav-scroll flex-1 overflow-y-auto px-3 pb-4">
          <AdminNavLinks nbTicketsOuverts={nbTicketsOuverts ?? 0} />
        </nav>

        <div className="shrink-0 border-t border-white/10 px-4 py-4">
          <p className="truncate text-sm font-medium text-blanc-casse">{admin.nom || "—"}</p>
          <Link
            href="/dashboard"
            className="mt-1 inline-block text-[11px] font-medium text-nav-inactif hover:text-blanc-casse"
          >
            ← Retour au dashboard client
          </Link>

          <form action="/api/auth/logout" method="post" className="mt-3">
            <button
              type="submit"
              className="w-full rounded-lg border border-white/10 py-2 text-sm font-medium text-nav-inactif transition-colors hover:bg-white/5 hover:text-blanc-casse"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col pl-64">
        <main className="flex-1 px-8 py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
