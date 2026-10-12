import type { Metadata } from "next"
import { Suspense } from "react"

import { BoutonDeconnexion } from "@/components/bouton-deconnexion"
import { createClient } from "@/lib/supabase/server"

// Point de départ de l'espace greffe (personne 2).

export const metadata: Metadata = {
  title: "Espace greffe — Médiation",
}

export default function EspaceGreffe() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Espace greffe</h1>
          <Suspense>
            <CompteConnecte />
          </Suspense>
        </div>
        <BoutonDeconnexion />
      </header>
      <p className="text-sm text-muted-foreground">
        La liste des dossiers et la création de dossier arrivent bientôt.
      </p>
    </main>
  )
}

// Lit la session : rendu à chaque requête, d'où le Suspense.
async function CompteConnecte() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  return (
    <p className="text-sm text-muted-foreground">
      Connecté en tant que {data?.claims.email}
    </p>
  )
}
