import Link from "next/link";
import Image from "next/image";
import { createServiceClient } from "@/lib/supabase/service";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";
import { NavLinks } from "./NavLinks";
import { NotificationBell } from "./NotificationBell";

const NB_NOTIFICATIONS_AFFICHEES = 20;

// Force le rendu dynamique (par requête) pour tout le sous-arbre
// /dashboard/*. Avant le passage à createServiceClient(), l'appel à
// cookies() dans le client anon forçait ce comportement implicitement ;
// service_role n'a aucune dépendance à cookies()/headers(), donc sans
// cette directive Next.js préverrait certaines pages (Vue d'ensemble,
// Automatisations, WhatsApp & IA, Programmation, Intégrations, Agenda,
// Factures, Paramètres) en pages STATIQUES au build — figeant leurs
// données pour toujours au lieu de les recharger à chaque visite. À
// retirer seulement si on revient un jour à un rendu volontairement
// statique/caché pour certaines pages.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Client service_role (contourne le RLS) avec gestionnaire_id venant de
  // getGestionnaireActuel() (résolu depuis la session réelle) — même
  // architecture que le reste du dashboard, voir
  // src/lib/auth/gestionnaire-actuel.ts.
  const supabase = createServiceClient();
  const user = await getGestionnaireActuel();

  let nom = "";
  let plan = "Starter";
  if (user) {
    const [{ data: profil }, { data: parametresCompte }] = await Promise.all([
      supabase.from("profils").select("nom").eq("id", user.id).single(),
      supabase.from("parametres_compte").select("plan").eq("gestionnaire_id", user.id).maybeSingle(),
    ]);
    nom = profil?.nom ?? "";
    plan = parametresCompte?.plan ?? "Starter";
  }

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, titre, message, lien, lu, created_at")
    .eq("gestionnaire_id", user.id)
    .order("created_at", { ascending: false })
    .limit(NB_NOTIFICATIONS_AFFICHEES);

  return (
    <div className="min-h-screen bg-sable">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-indigo-profond">
        <div className="px-6 py-6">
          <Link href="/dashboard" className="block">
            <Image
              src="/logo-akilai-clair.png"
              alt="AkilAI"
              width={400}
              height={100}
              priority
              quality={100}
              className="h-11 w-auto"
            />
          </Link>
        </div>

        <nav className="nav-scroll flex-1 overflow-y-auto px-3 pb-4">
          <NavLinks />
        </nav>

        {/* Zone fixe en bas de la sidebar, hors du scroll de la nav
            ci-dessus (shrink-0 + hors du conteneur overflow-y-auto). */}
        <div className="shrink-0 border-t border-white/10 px-4 py-4">
          <p className="truncate text-sm font-medium text-blanc-casse">{nom || "—"}</p>
          <span className="mt-1 inline-block rounded-full bg-indigo-moyen/40 px-2 py-0.5 text-[11px] font-medium text-blanc-casse">
            {plan}
          </span>

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
        <header className="flex items-center justify-end border-b border-bordure bg-sable px-8 py-4">
          <NotificationBell notificationsInitiales={notifications ?? []} />
        </header>
        <main className="flex-1 px-8 py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
