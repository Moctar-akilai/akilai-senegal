// Jours de la semaine, 1=lundi ... 7=dimanche (norme ISO-8601), utilisé à
// la fois par la page Programmation (UI) et le webhook WhatsApp (contrôle
// horaire) pour garder une seule source de vérité sur la numérotation.
export const JOURS_SEMAINE: { valeur: number; label: string; abrege: string }[] = [
  { valeur: 1, label: "Lundi", abrege: "Lun" },
  { valeur: 2, label: "Mardi", abrege: "Mar" },
  { valeur: 3, label: "Mercredi", abrege: "Mer" },
  { valeur: 4, label: "Jeudi", abrege: "Jeu" },
  { valeur: 5, label: "Vendredi", abrege: "Ven" },
  { valeur: 6, label: "Samedi", abrege: "Sam" },
  { valeur: 7, label: "Dimanche", abrege: "Dim" },
];

function isoWeekday(date: Date) {
  const jour = date.getDay(); // 0=dimanche ... 6=samedi
  return jour === 0 ? 7 : jour;
}

function minutesDepuisMinuit(heure: string) {
  const [h, m] = heure.split(":").map(Number);
  return h * 60 + (m || 0);
}

// Le Sénégal (Africa/Dakar) est en UTC+0 toute l'année (pas d'heure d'été) :
// l'heure serveur en UTC correspond donc directement à l'heure locale de
// Dakar, sans conversion de fuseau à faire ici.
export function estDansPlageAutorisee(
  programmation: { jours_actifs: number[]; heure_debut: string; heure_fin: string; actif: boolean },
  maintenant: Date = new Date()
): boolean {
  if (!programmation.actif) return true; // pas de restriction horaire

  const jourActuel = isoWeekday(maintenant);
  if (!programmation.jours_actifs.includes(jourActuel)) return false;

  const minutesActuelles = maintenant.getUTCHours() * 60 + maintenant.getUTCMinutes();
  const debut = minutesDepuisMinuit(programmation.heure_debut);
  const fin = minutesDepuisMinuit(programmation.heure_fin);

  if (debut <= fin) {
    return minutesActuelles >= debut && minutesActuelles <= fin;
  }
  // Plage à cheval sur minuit (ex: 20:00 -> 08:00)
  return minutesActuelles >= debut || minutesActuelles <= fin;
}

export const MESSAGE_HORS_HORAIRES =
  "Nous sommes actuellement fermés, nous reviendrons vers vous dès que possible.";
