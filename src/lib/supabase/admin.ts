import "server-only"

import { createClient } from "@supabase/supabase-js"

import type { Database } from "./database.types"

// Client « service_role » : contourne la RLS.
// Réservé aux server actions des pages publiques (QR code des parties).
// Ne jamais l'importer dans un composant client.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
