import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { ACCUEIL_PAR_ROLE, lireRole, type Role } from "@/lib/roles"

import type { Database } from "./database.types"

// Pages accessibles sans être connecté : l'accueil, la connexion, les
// pages des QR codes et la remise à zéro de la démo (protégée par CRON_SECRET)
const CHEMINS_PUBLICS = ["/connexion", "/p/", "/api/reset-demo"]

// Espaces réservés à un rôle (le rôle technique "greffe" → espace juridiction)
const ESPACES: Record<Role, string> = {
  greffe: "/juridiction",
  mediateur: "/mediateur",
}

function estPublic(chemin: string) {
  return chemin === "/" || CHEMINS_PUBLICS.some((prefixe) => chemin.startsWith(prefixe))
}

function estDansEspace(chemin: string, espace: string) {
  return chemin === espace || chemin.startsWith(`${espace}/`)
}

// Rafraîchit la session Supabase à chaque requête et oriente chaque compte
// vers son espace (juridiction ou médiateur).
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
  const role = lireRole(data?.claims)
  const chemin = request.nextUrl.pathname

  const rediriger = (vers: string) => {
    const url = request.nextUrl.clone()
    url.pathname = vers
    url.search = ""
    return NextResponse.redirect(url)
  }

  if (estPublic(chemin)) {
    // Un compte connecté avec un rôle n'a rien à faire sur /connexion
    if (role && chemin === "/connexion") return rediriger(ACCUEIL_PAR_ROLE[role])
    return response
  }

  if (!connecte || !role) return rediriger("/connexion")

  // Chaque rôle reste dans son espace
  const autreEspace = Object.entries(ESPACES).some(
    ([roleEspace, espace]) => roleEspace !== role && estDansEspace(chemin, espace)
  )
  if (autreEspace) return rediriger(ACCUEIL_PAR_ROLE[role])

  return response
}
