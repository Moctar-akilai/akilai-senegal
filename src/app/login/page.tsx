"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"connexion" | "inscription">("connexion");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);

    if (mode === "connexion") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: motDePasse,
      });
      if (error) setErreur(error.message);
      else router.push("/dashboard");
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: motDePasse,
      });
      if (error) {
        setErreur(error.message);
      } else if (data.user) {
        const { error: profilError } = await supabase.from("profils").insert({
          id: data.user.id,
          nom,
          telephone,
        });
        if (profilError) {
          setErreur(profilError.message);
        } else {
          const { error: parametresError } = await supabase
            .from("parametres_compte")
            .insert({ gestionnaire_id: data.user.id });
          if (parametresError) setErreur(parametresError.message);
          else router.push("/dashboard");
        }
      }
    }
    setChargement(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-neutral-900">
          {mode === "connexion" ? "Connexion" : "Créer un compte"}
        </h1>
        <p className="mb-6 text-sm text-neutral-500">
          AkilAI — l&apos;assistant WhatsApp de votre entreprise
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "inscription" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Nom</label>
                <input
                  required
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Téléphone WhatsApp
                </label>
                <input
                  required
                  placeholder="+221 77 123 45 67"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
                />
              </div>
            </>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Mot de passe
            </label>
            <input
              required
              type="password"
              minLength={6}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
            />
          </div>

          {erreur && <p className="text-sm text-red-600">{erreur}</p>}

          <button
            type="submit"
            disabled={chargement}
            className="w-full rounded-md bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {chargement ? "Chargement..." : mode === "connexion" ? "Se connecter" : "S'inscrire"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "connexion" ? "inscription" : "connexion")}
          className="mt-4 w-full text-center text-sm text-neutral-500 hover:text-neutral-900"
        >
          {mode === "connexion" ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
        </button>
      </div>
    </div>
  );
}
