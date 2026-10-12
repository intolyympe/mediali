import { createBrowserClient } from "@supabase/ssr"

import type { Database } from "./database.types"

// Client navigateur : à utiliser dans les composants "use client"
// (ex. abonnements Realtime du tableau de bord). Soumis à la RLS.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
