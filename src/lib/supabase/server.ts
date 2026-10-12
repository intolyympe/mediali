import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import type { Database } from "./database.types"

// Client serveur lié à la session de l'utilisateur connecté (greffe, médiateur).
// À utiliser dans les Server Components, server actions et route handlers.
// Soumis à la RLS. Créer un nouveau client à chaque requête.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Appelé depuis un Server Component : les cookies sont en lecture
            // seule. Sans conséquence, le proxy rafraîchit la session.
          }
        },
      },
    }
  )
}
