import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nom = "";
  if (user) {
    const { data: profil } = await supabase
      .from("profils")
      .select("nom")
      .eq("id", user.id)
      .single();
    nom = profil?.nom ?? "";
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
        <Link href="/dashboard" className="text-lg font-semibold text-neutral-900">
          Rentila Sénégal
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-600">{nom}</span>
          <form action="/api/auth/logout" method="post">
            <button className="text-sm text-neutral-500 hover:text-neutral-900">
              Se déconnecter
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
