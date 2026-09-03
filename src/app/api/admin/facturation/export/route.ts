import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAdminActuel } from "@/lib/auth/admin-actuel";
import { csvEchapper } from "@/lib/admin/facturation";

// Export CSV comptable : toutes les factures statut='payee' sur une
// période choisie (date_emission = date d'encaissement, voir
// abonnement.marquerPaye dans /api/admin/write).
export async function GET(request: NextRequest) {
  try {
    await getAdminActuel();
  } catch {
    return NextResponse.json({ ok: false, error: "Accès refusé." }, { status: 403 });
  }

  const debut = request.nextUrl.searchParams.get("debut");
  const fin = request.nextUrl.searchParams.get("fin");
  if (!debut || !fin || !/^\d{4}-\d{2}-\d{2}$/.test(debut) || !/^\d{4}-\d{2}-\d{2}$/.test(fin)) {
    return NextResponse.json({ ok: false, error: "Période invalide." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: factures } = await supabase
    .from("factures")
    .select("numero, montant, date_emission, profils(nom)")
    .eq("statut", "payee")
    .gte("date_emission", debut)
    .lte("date_emission", fin)
    .order("date_emission", { ascending: true });

  const lignes = ["Gestionnaire,Numéro facture,Montant,Date de paiement"];
  for (const f of factures ?? []) {
    const profil = Array.isArray(f.profils) ? f.profils[0] : f.profils;
    lignes.push(
      [
        csvEchapper(profil?.nom ?? ""),
        csvEchapper(f.numero),
        csvEchapper(String(f.montant)),
        csvEchapper(f.date_emission),
      ].join(",")
    );
  }

  return new NextResponse(lignes.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="export-facturation-${debut}-${fin}.csv"`,
    },
  });
}
