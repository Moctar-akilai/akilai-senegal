import { createServerClient } from "@supabase/ssr";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

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
  const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard");
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");

  if (!user && isDashboardRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // /admin/* : session ET profils.est_admin = true, sinon retombe sur
  // /dashboard dans les deux cas (y compris sans session — la vérification
  // ci-dessus la redirigera elle-même vers /login au prochain passage).
  // Client service_role ici plutôt que le client anon + RLS : cohérent avec
  // le reste du projet (voir src/lib/auth/gestionnaire-actuel.ts) et évite
  // toute dépendance à une policy RLS sur profils dans un contexte Edge
  // sensible à la fiabilité.
  if (isAdminRoute) {
    if (!user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: profil } = await supabaseAdmin
      .from("profils")
      .select("est_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (!profil?.est_admin) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/admin/:path*"],
};
