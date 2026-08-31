import { createServiceClient } from "@/lib/supabase/service";
import { getGestionnaireActuel } from "@/lib/auth/gestionnaire-actuel";
import { CompteForm } from "./CompteForm";
import { SecuriteForm } from "./SecuriteForm";

export default async function ParametresPage() {
  // ⚠️ Auth temporairement contournée — client service_role (contourne le
  // RLS) au lieu du client anon, le temps que le bypass reste actif.
  // Détails complets dans src/lib/auth/gestionnaire-actuel.ts.
  const supabase = createServiceClient();
  const user = await getGestionnaireActuel();

  const [{ data: profil }, { data: parametresCompte }] = await Promise.all([
    supabase.from("profils").select("nom, telephone").eq("id", user.id).single(),
    supabase.from("parametres_compte").select("numero_whatsapp").eq("gestionnaire_id", user.id).single(),
  ]);

  return (
    <div className="space-y-10">
      <h1 className="text-xl font-semibold text-neutral-900">Paramètres</h1>

      <section>
        <h2 className="mb-4 text-lg font-medium text-neutral-900">Mon compte</h2>
        <CompteForm
          nomInitial={profil?.nom ?? ""}
          telephoneInitial={profil?.telephone ?? ""}
          numeroWhatsappInitial={parametresCompte?.numero_whatsapp ?? null}
        />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-medium text-neutral-900">Sécurité</h2>
        <SecuriteForm />
      </section>
    </div>
  );
}
