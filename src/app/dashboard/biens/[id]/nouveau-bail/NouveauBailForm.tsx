"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type LocataireExistant = { id: string; nom: string; telephone: string };

export function NouveauBailForm({
  bienId,
  loyerMensuel,
  locatairesExistants,
}: {
  bienId: string;
  loyerMensuel: number;
  locatairesExistants: LocataireExistant[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"existant" | "nouveau">(
    locatairesExistants.length > 0 ? "existant" : "nouveau"
  );
  const [locataireId, setLocataireId] = useState(locatairesExistants[0]?.id ?? "");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");

  const [dateDebut, setDateDebut] = useState("");
  const [montantLoyer, setMontantLoyer] = useState(String(loyerMensuel));
  const [depotGarantie, setDepotGarantie] = useState("");

  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);

    let idLocataireFinal = locataireId;

    if (mode === "nouveau") {
      const { data: locataire, error: locataireError } = await supabase
        .from("locataires")
        .insert({ bien_id: bienId, nom, telephone, email: email || null })
        .select("id")
        .single();

      if (locataireError || !locataire) {
        setErreur(locataireError?.message ?? "Impossible de créer le locataire.");
        setChargement(false);
        return;
      }
      idLocataireFinal = locataire.id;
    }

    if (!idLocataireFinal) {
      setErreur("Choisis un locataire.");
      setChargement(false);
      return;
    }

    const { error: bailError } = await supabase.from("baux").insert({
      bien_id: bienId,
      locataire_id: idLocataireFinal,
      date_debut: dateDebut,
      montant_loyer: Number(montantLoyer),
      depot_garantie: depotGarantie ? Number(depotGarantie) : 0,
    });

    if (bailError) {
      setErreur(bailError.message);
      setChargement(false);
      return;
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
        <h2 className="mb-4 text-sm font-semibold text-neutral-900">Locataire</h2>

        {locatairesExistants.length > 0 && (
          <div className="mb-4 flex gap-4 text-sm text-neutral-700">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={mode === "existant"}
                onChange={() => setMode("existant")}
              />
              Locataire existant
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={mode === "nouveau"}
                onChange={() => setMode("nouveau")}
              />
              Nouveau locataire
            </label>
          </div>
        )}

        {mode === "existant" ? (
          <div>
            <label className={labelClasse}>Locataire</label>
            <select
              required
              value={locataireId}
              onChange={(e) => setLocataireId(e.target.value)}
              className={champClasse}
            >
              {locatairesExistants.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nom} · {l.telephone}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClasse}>Nom</label>
              <input
                required
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className={champClasse}
              />
            </div>
            <div>
              <label className={labelClasse}>Téléphone WhatsApp</label>
              <input
                required
                placeholder="+221 77 123 45 67"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className={champClasse}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClasse}>Email (optionnel)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={champClasse}
              />
            </div>
          </div>
        )}
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
          {chargement ? "Création..." : "Créer le bail"}
        </button>
      </div>
    </form>
  );
}
