"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (params: { appId: string; xfbml?: boolean; version: string }) => void;
      login: (
        callback: (response: { authResponse?: { code?: string } | null; status?: string }) => void,
        params: Record<string, unknown>
      ) => void;
    };
  }
}

// Non renseignées tant que la démarche Meta (Configuration ID) et
// l'approbation Twilio Tech Provider ne sont pas terminées — voir §5 de la
// tâche qui a créé ce fichier : tant qu'elles sont absentes, le bouton
// reste masqué (voir `disponible` plus bas) et rien de ce fichier ne
// s'exécute, pour éviter un bouton cassé en attendant les vraies valeurs.
const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
const META_CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID;
const SDK_VERSION = "v21.0";

type ModeConnexion = "manuel" | "embedded_signup";

let sdkChargement: Promise<void> | null = null;

// Charge le SDK Facebook JS à la demande (jamais au chargement de toute
// l'app — seulement quand ce composant est monté, c-à-d sur cette page),
// une seule fois par session de navigation.
function chargerSdkFacebook(): Promise<void> {
  if (window.FB) return Promise.resolve();
  if (sdkChargement) return sdkChargement;

  sdkChargement = new Promise((resolve) => {
    window.fbAsyncInit = () => {
      window.FB!.init({ appId: META_APP_ID!, xfbml: false, version: SDK_VERSION });
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/fr_FR/sdk.js";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  });
  return sdkChargement;
}

export function WhatsappEmbeddedSignup({
  modeConnexionInitial,
  numeroWhatsappInitial,
}: {
  modeConnexionInitial: ModeConnexion;
  numeroWhatsappInitial: string | null;
}) {
  const router = useRouter();
  const [modeConnexion, setModeConnexion] = useState<ModeConnexion>(modeConnexionInitial);
  const [numeroWhatsapp, setNumeroWhatsapp] = useState(numeroWhatsappInitial);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [avertissement, setAvertissement] = useState<string | null>(null);

  // Garde-fou §5 : Configuration ID / App ID pas encore obtenus →
  // n'affiche que le champ manuel (CompteForm), rien ici.
  const disponible = Boolean(META_APP_ID && META_CONFIG_ID);

  useEffect(() => {
    if (!disponible) return;

    async function finaliser(wabaId: string, phoneNumberId: string) {
      setChargement(true);
      setErreur(null);
      setAvertissement(null);
      try {
        const reponse = await fetch("/api/integrations/whatsapp-embedded/finaliser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ waba_id: wabaId, phone_number_id: phoneNumberId }),
        });
        const corps = await reponse.json().catch(() => null);
        if (!reponse.ok || !corps?.ok) {
          setErreur(corps?.error ?? "Impossible de finaliser la connexion.");
          return;
        }
        setModeConnexion(corps.data.modeConnexion);
        if (corps.data.numeroWhatsapp) setNumeroWhatsapp(corps.data.numeroWhatsapp);
        if (corps.data.avertissement) setAvertissement(corps.data.avertissement);
        router.refresh();
      } catch {
        setErreur("Impossible de contacter le serveur.");
      } finally {
        setChargement(false);
      }
    }

    // Messages postMessage envoyés par la popup Meta pendant/après le flow
    // d'Embedded Signup (doc Meta) — filtrés par origine et par type avant
    // d'en extraire waba_id/phone_number_id. Logués pour debug en attendant
    // les vrais tests avec un compte Meta Tech Provider approuvé.
    function gererMessage(event: MessageEvent) {
      if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") {
        return;
      }
      let data: unknown;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (typeof data !== "object" || data === null || (data as { type?: string }).type !== "WA_EMBEDDED_SIGNUP") {
        return;
      }

      console.log("[whatsapp-embedded-signup] Message WA_EMBEDDED_SIGNUP reçu:", data);

      const details = (data as { data?: { waba_id?: string; phone_number_id?: string } }).data;
      if (details?.waba_id && details?.phone_number_id) {
        finaliser(details.waba_id, details.phone_number_id);
      }
    }

    window.addEventListener("message", gererMessage);
    return () => window.removeEventListener("message", gererMessage);
  }, [disponible, router]);

  async function connecter() {
    if (!META_APP_ID || !META_CONFIG_ID) return;
    setErreur(null);
    await chargerSdkFacebook();
    window.FB?.login(
      (response) => {
        console.log("[whatsapp-embedded-signup] Réponse FB.login:", response);
      },
      {
        config_id: META_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          // Demande le mode coexistence (garde l'historique existant du
          // client sur l'app WhatsApp Business) plutôt qu'une migration
          // complète vers l'API Cloud.
          featureType: "whatsapp_business_app_onboarding",
          sessionInfoVersion: "3",
        },
      }
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
          modeConnexion === "embedded_signup"
            ? "bg-succes-pastel text-succes-pastel-texte"
            : "bg-neutre-pastel text-neutre-pastel-texte"
        }`}
      >
        {modeConnexion === "embedded_signup"
          ? `Connecté via Embedded Signup${numeroWhatsapp ? ` (${numeroWhatsapp.replace(/^whatsapp:/, "")})` : ""}`
          : "Configuré manuellement"}
      </span>

      {disponible && (
        <div>
          <button
            type="button"
            onClick={connecter}
            disabled={chargement}
            className="rounded-lg border border-bordure px-3 py-1.5 text-xs font-medium text-encre hover:bg-bordure/60 disabled:opacity-50"
          >
            {chargement ? "Finalisation..." : "Connecter mon numéro WhatsApp Business"}
          </button>
          <p className="mt-1 text-xs text-texte-secondaire">
            Recommandé : connexion officielle Meta, garde l&apos;historique de votre numéro (mode
            coexistence).
          </p>
        </div>
      )}

      {erreur && <p className="text-xs text-erreur">{erreur}</p>}
      {avertissement && <p className="text-xs text-attention-pastel-texte">{avertissement}</p>}
    </div>
  );
}
