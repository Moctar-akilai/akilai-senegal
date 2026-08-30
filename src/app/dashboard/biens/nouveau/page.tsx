"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function NouveauBienPage() {
  const router = useRouter();
  const supabase = createClient();

  const [adresse, setAdresse] = useState("");
  const [ville, setVille] = useState("Dakar");
  const [loyerMensuel, setLoyerMensuel] = useState("");
  const [charges, setCharges] = useState("");

  const [locataireNom, setLocataireNom] = useState("");
  const [locataireTelephone, setLocataireTelephone] = useState("");
  const [locataireEmail, setLocataireEmail] = useState("");

  const [dateDebut, setDateDebut] = useState("");
  const [montantLoyer, setMontantLoyer] = useState("");
  const [montantLoyerTouche, setMontantLoyerTouche] = useState(false);
  const [depotGarantie, setDepotGarantie] = useState("");

  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  function onChangeLoyerMensuel(valeur: string) {
    setLoyerMensuel(valeur);
    if (!montantLoyerTouche) setMontantLoyer(valeur);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErreur("Session expirée, merci de te reconnecter.");
      setChargement(false);
      return;
    }

    const { data: bien, error: bienError } = await supabase
      .from("biens")
      .insert({
        gestionnaire_id: user.id,
        adresse,
        ville,
        loyer_mensuel: Number(loyerMensuel),
        charges: charges ? Number(charges) : 0,
      })
      .select("id")
      .single();

    if (bienError || !bien) {
      setErreur(bienError?.message ?? "Impossible de créer le bien.");
      setChargement(false);
      return;
    }

    const { data: locataire, error: locataireError } = await supabase
      .from("locataires")
      .insert({
        bien_id: bien.id,
        nom: locataireNom,
        telephone: locataireTelephone,
        email: locataireEmail || null,
      })
      .select("id")
      .single();

    if (locataireError || !locataire) {
      setErreur(locataireError?.message ?? "Impossible de créer le locataire.");
      setChargement(false);
      return;
    }

    const { error: bailError } = await supabase.from("baux").insert({
      bien_id: bien.id,
      locataire_id: locataire.id,
      date_debut: dateDebut,
      montant_loyer: Number(montantLoyer),
      depot_garantie: depotGarantie ? Number(depotGarantie) : 0,
    });

    if (bailError) {
      setErreur(bailError.message);
      setChargement(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  const champClasse =
    "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900";
  const labelClasse = "mb-1 block text-sm font-medium text-neutral-700";

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Retour
        </Link>
      </div>
      <h1 className="mb-6 text-xl font-semibold text-neutral-900">Ajouter un bien</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-neutral-900">Bien</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClasse}>Adresse</label>
              <input
                required
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                className={champClasse}
              />
            </div>
            <div>
              <label className={labelClasse}>Ville</label>
              <input
                required
                value={ville}
                onChange={(e) => setVille(e.target.value)}
                className={champClasse}
              />
            </div>
            <div>
              <label className={labelClasse}>Loyer mensuel (FCFA)</label>
              <input
                required
                type="number"
                min="0"
                value={loyerMensuel}
                onChange={(e) => onChangeLoyerMensuel(e.target.value)}
                className={champClasse}
              />
            </div>
            <div>
              <label className={labelClasse}>Charges (FCFA)</label>
              <input
                type="number"
                min="0"
                value={charges}
                onChange={(e) => setCharges(e.target.value)}
                placeholder="0"
                className={champClasse}
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-neutral-900">Locataire</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClasse}>Nom</label>
              <input
                required
                value={locataireNom}
                onChange={(e) => setLocataireNom(e.target.value)}
                className={champClasse}
              />
            </div>
            <div>
              <label className={labelClasse}>Téléphone WhatsApp</label>
              <input
                required
                placeholder="+221 77 123 45 67"
                value={locataireTelephone}
                onChange={(e) => setLocataireTelephone(e.target.value)}
                className={champClasse}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClasse}>Email (optionnel)</label>
              <input
                type="email"
                value={locataireEmail}
                onChange={(e) => setLocataireEmail(e.target.value)}
                className={champClasse}
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-neutral-900">Bail</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClasse}>Date de début</label>
              <input
                required
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className={champClasse}
              />
            </div>
            <div>
              <label className={labelClasse}>Montant du loyer (FCFA)</label>
              <input
                required
                type="number"
                min="0"
                value={montantLoyer}
                onChange={(e) => {
                  setMontantLoyerTouche(true);
                  setMontantLoyer(e.target.value);
                }}
                className={champClasse}
              />
            </div>
            <div>
              <label className={labelClasse}>Dépôt de garantie (FCFA)</label>
              <input
                type="number"
                min="0"
                value={depotGarantie}
                onChange={(e) => setDepotGarantie(e.target.value)}
                placeholder="0"
                className={champClasse}
              />
            </div>
          </div>
        </section>

        {erreur && <p className="text-sm text-red-600">{erreur}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={chargement}
            className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {chargement ? "Création..." : "Créer le bien"}
          </button>
        </div>
      </form>
    </div>
  );
}
