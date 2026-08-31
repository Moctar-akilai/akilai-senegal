import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ============================================================================
// ⚠️ CONTOURNEMENT TEMPORAIRE DE L'AUTHENTIFICATION — À RETIRER ⚠️
// ============================================================================
// La redirection vers /login pour les routes /dashboard/* sans session est
// désactivée ci-dessous (voir "DÉSACTIVÉ TEMPORAIREMENT") pour permettre un
// accès direct au dashboard sans connexion. Le dashboard s'appuie à la
// place sur un gestionnaire de référence codé en dur — voir
// src/lib/auth/gestionnaire-actuel.ts.
//
// Pour réactiver l'authentification normale :
//   1. Décommenter le bloc `if (!user && isDashboardRoute) { ... }`
//      ci-dessous.
//   2. Revenir sur les appels à getGestionnaireActuel() dans les pages du
//      dashboard (voir src/lib/auth/gestionnaire-actuel.ts pour la liste
//      des étapes complètes).
// ============================================================================
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");

  // DÉSACTIVÉ TEMPORAIREMENT — remettre ce bloc (et la ligne
  // `const isDashboardRoute = ...` ci-dessus) pour réactiver l'auth :
  //
  // const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard");
  // if (!user && isDashboardRoute) {
  //   return NextResponse.redirect(new URL("/login", request.url));
  // }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
