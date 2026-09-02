// Prix mensuels (FCFA) des formules — AUCUN vrai système de facturation
// n'existe encore côté AkilAI (parametres_compte.plan est purement
// déclaratif, voir son commentaire en base), donc ces montants sont des
// PLACEHOLDERS raisonnables pour un SaaS WhatsApp/IA visant les TPE/PME
// sénégalaises, à remplacer par les vrais tarifs dès qu'un chantier de
// facturation existe. Tout KPI qui s'en sert (MRR estimé) doit rester
// explicitement labellisé "estimé".
export const PRIX_PLANS: Record<string, number> = {
  Starter: 15000,
  Business: 35000,
  Premium: 75000,
};
