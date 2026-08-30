"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type BienInitial = { adresse: string; ville: string; loyerMensuel: number; charges: number };
type LocataireInitial = { id: string; nom: string; telephone: string; email: string };
type BailInitial = { id: string; dateDebut: string; montantLoyer: number; depotGarantie: number };

export function ModifierBienForm({
  bienId,
  bien,
  locataire,
  bail,
}: {
  bienId: string;
  bien: BienInitial;
  locataire: LocataireInitial | null;
  bail: BailInitial | null;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [adresse, setAdresse] = useState(bien.adresse);
  const [ville, setVille] = useState(bien.ville);
  const [loyerMensuel, setLoyerMensuel] = useState(String(bien.loyerMensuel));
  const [charges, setCharges] = useState(String(bien.charges));

  const [locataireNom, setLocataireNom] = useState(locataire?.nom ?? "");
  const [locataireTelephone, setLocataireTelephone] = useState(locataire?.telephone ?? "");
  const [locataireEmail, setLocataireEmail] = useState(locataire?.email ?? "");

  const [dateDebut, setDateDebut] = useState(bail?.dateDebut ?? "");
  const [montantLoyer, setMontantLoyer] = useState(bail ? String(bail.montantLoyer) : "");
  const [depotGarantie, setDepotGarantie] = useState(bail ? String(bail.depotGarantie) : "");

  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);

    const { error: bienError } = await supabase
      .from("biens")
      .update({
        adresse,
        ville,
        loyer_mensuel: Number(loyerMensuel),
        charges: charges ? Number(charges) : 0,
      })
      .eq("id", bienId);

    if (bienError) {
      setErreur(bienError.message);
      setChargement(false);
      return;
    }

    if (locataire) {
      const { error: locataireError } = await supabase
        .from("locataires")
        .update({
          nom: locataireNom,
          telephone: locataireTelephone,
          email: locataireEmail || null,
        })
        .eq("id", locataire.id);

      if (locataireError) {
        setErreur(locataireError.message);
        setChargement(false);
        return;
      }
    }

    if (bail) {
      const { error: bailError } = await supabase
        .from("baux")
        .update({
          date_debut: dateDebut,
          montant_loyer: Number(montantLoyer),
          depot_garantie: depotGarantie ? Number(depotGarantie) : 0,
        })
        .eq("id", bail.id);

      if (bailError) {
        setErreur(bailError.message);
        setChargement(false);
        return;
      }
    }

    router.push(`/dashboard/biens/${bienId}`);
    router.refresh();
  }

  const champClasse =
    "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900";
  const labelClasse = "mb-1 block text-sm font-medium text-neutral-700";

  return (
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
              onChange={(e) => setLoyerMensuel(e.target.value)}
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
              className={champClasse}
            />
          </div>
        </div>
      </section>

      {locataire && (
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
      )}

      {bail && (
        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-neutral-900">Bail en cours</h2>
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
                onChange={(e) => setMontantLoyer(e.target.value)}
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
                className={champClasse}
              />
            </div>
          </div>
        </section>
      )}

      {!bail && (
        <p className="text-sm text-neutral-500">
          Aucun bail actif : utilise « Nouveau bail » depuis la fiche du bien pour en créer un.
        </p>
      )}

      {erreur && <p className="text-sm text-red-600">{erreur}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={chargement}
          className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {chargement ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
