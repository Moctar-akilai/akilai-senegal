"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MOYENS_PAIEMENT = [
  { valeur: "orange_money", label: "Orange Money" },
  { valeur: "wave", label: "Wave" },
  { valeur: "especes", label: "Espèces" },
  { valeur: "virement", label: "Virement" },
  { valeur: "autre", label: "Autre" },
];

export function MarquerPayeForm({ paiementId }: { paiementId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [ouvert, setOuvert] = useState(false);
  const [moyenPaiement, setMoyenPaiement] = useState("orange_money");
  const [dateEncaissement, setDateEncaissement] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);

    const { error: updateError } = await supabase
      .from("paiements")
      .update({
        statut: "paye",
        moyen_paiement: moyenPaiement,
        date_encaissement: dateEncaissement,
      })
      .eq("id", paiementId);

    if (updateError) {
      setErreur(updateError.message);
      setChargement(false);
      return;
    }

    const reponse = await fetch("/api/whatsapp/quittance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paiement_id: paiementId }),
    });

    if (!reponse.ok) {
      const corps = await reponse.json().catch(() => null);
      setErreur(
        `Paiement enregistré, mais l'envoi de la quittance WhatsApp a échoué${
          corps?.erreur ? ` (${corps.erreur})` : ""
        }.`
      );
      setChargement(false);
      return;
    }

    setChargement(false);
    setOuvert(false);
    router.refresh();
  }

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Marquer comme payé
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-neutral-200 bg-white p-4 space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Moyen de paiement
          </label>
          <select
            value={moyenPaiement}
            onChange={(e) => setMoyenPaiement(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          >
            {MOYENS_PAIEMENT.map((m) => (
              <option key={m.valeur} value={m.valeur}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Date d&apos;encaissement
          </label>
          <input
            required
            type="date"
            value={dateEncaissement}
            onChange={(e) => setDateEncaissement(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </div>
      </div>

      {erreur && <p className="text-sm text-red-600">{erreur}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={chargement}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {chargement ? "Enregistrement..." : "Confirmer le paiement"}
        </button>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="rounded-md px-4 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
