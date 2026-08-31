"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Statut = "prospect" | "contacte" | "client" | "inactif";

export function NouveauContactModal({ gestionnaireId }: { gestionnaireId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [statut, setStatut] = useState<Statut>("prospect");
  const [notes, setNotes] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  function reinitialiser() {
    setNom("");
    setTelephone("");
    setEmail("");
    setStatut("prospect");
    setNotes("");
    setErreur(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setErreur(null);

    const { error } = await supabase.from("contacts").insert({
      gestionnaire_id: gestionnaireId,
      nom: nom.trim() || null,
      telephone: telephone.trim(),
      email: email.trim() || null,
      statut,
      notes: notes.trim() || null,
    });

    if (error) {
      setErreur(error.message);
      setChargement(false);
      return;
    }

    setChargement(false);
    setOuvert(false);
    reinitialiser();
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
      >
        + Nouveau contact
      </button>

      {ouvert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
          onClick={() => setOuvert(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-base font-semibold text-neutral-900">Nouveau contact</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Nom</label>
                <input
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Téléphone</label>
                <input
                  required
                  placeholder="+221771234567"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Statut</label>
                <select
                  value={statut}
                  onChange={(e) => setStatut(e.target.value as Statut)}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
                >
                  <option value="prospect">Prospect</option>
                  <option value="contacte">Contacté</option>
                  <option value="client">Client</option>
                  <option value="inactif">Inactif</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
                />
              </div>

              {erreur && <p className="text-sm text-red-600">{erreur}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOuvert(false)}
                  className="flex-1 rounded-md border border-neutral-300 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={chargement}
                  className="flex-1 rounded-md bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {chargement ? "Ajout..." : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
