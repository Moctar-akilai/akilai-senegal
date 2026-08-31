import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

// Chiffrement symétrique AES-256-GCM des clés API des intégrations, avec
// une clé maîtresse dans la variable d'environnement ENCRYPTION_KEY
// (32 octets, encodés en base64). Ce module ne doit jamais être importé
// depuis un composant client — la clé maîtresse ne doit exister que côté
// serveur.
const ALGORITHME = "aes-256-gcm";
const TAILLE_IV = 12; // recommandé pour GCM

function cleMaitresse(): Buffer {
  const brute = process.env.ENCRYPTION_KEY;
  if (!brute) throw new Error("ENCRYPTION_KEY n'est pas configurée.");
  const cle = Buffer.from(brute, "base64");
  if (cle.length !== 32) {
    throw new Error("ENCRYPTION_KEY doit être une valeur base64 de 32 octets (AES-256).");
  }
  return cle;
}

// Format stocké : "<iv base64>.<authTag base64>.<ciphertext base64>"
export function chiffrerCleApi(cleApiEnClair: string): string {
  const iv = randomBytes(TAILLE_IV);
  const chiffreur = createCipheriv(ALGORITHME, cleMaitresse(), iv);
  const chiffre = Buffer.concat([chiffreur.update(cleApiEnClair, "utf8"), chiffreur.final()]);
  const authTag = chiffreur.getAuthTag();
  return `${iv.toString("base64")}.${authTag.toString("base64")}.${chiffre.toString("base64")}`;
}

export function dechiffrerCleApi(valeurStockee: string): string {
  const [ivB64, authTagB64, chiffreB64] = valeurStockee.split(".");
  if (!ivB64 || !authTagB64 || !chiffreB64) {
    throw new Error("Format de clé API chiffrée invalide.");
  }
  const dechiffreur = createDecipheriv(ALGORITHME, cleMaitresse(), Buffer.from(ivB64, "base64"));
  dechiffreur.setAuthTag(Buffer.from(authTagB64, "base64"));
  const clair = Buffer.concat([
    dechiffreur.update(Buffer.from(chiffreB64, "base64")),
    dechiffreur.final(),
  ]);
  return clair.toString("utf8");
}

// Aperçu masqué affiché dans l'UI (jamais la clé en clair après
// sauvegarde) : garde un court préfixe et les 4 derniers caractères, ex.
// "sk_live_••••••••1234".
export function apercuMasqueCleApi(cleApiEnClair: string): string {
  const longueur = cleApiEnClair.length;
  if (longueur <= 8) return "•".repeat(Math.max(longueur, 4));
  const prefixe = cleApiEnClair.slice(0, Math.min(8, longueur - 4));
  const suffixe = cleApiEnClair.slice(-4);
  return `${prefixe}${"•".repeat(8)}${suffixe}`;
}
