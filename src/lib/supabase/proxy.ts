import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import type { Database } from "./database.types"

// Pages accessibles sans être connecté
const CHEMINS_PUBLICS = ["/connexion", "/p/"]

function estPublic(chemin: string) {
  return CHEMINS_PUBLICS.some((prefixe) => chemin.startsWith(prefixe))
}

// Rafraîchit la session Supabase à chaque requête et protège l'espace
// greffe / médiateur.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([cle, valeur]) =>
            response.headers.set(cle, valeur)
          )
        },
      },
    }
  )

  // Ne rien exécuter entre createServerClient et getClaims :
  // c'est cet appel qui rafraîchit le jeton si besoin.
  const { data } = await supabase.auth.getClaims()
  const connecte = Boolean(data?.claims)
  const chemin = request.nextUrl.pathname

  if (!connecte && !estPublic(chemin)) {
    const url = request.nextUrl.clone()
    url.pathname = "/connexion"
    return NextResponse.redirect(url)
  }

  if (connecte && chemin === "/connexion") {
    const url = request.nextUrl.clone()
    url.pathname = "/tableau-de-bord"
    return NextResponse.redirect(url)
  }

  return response
}
