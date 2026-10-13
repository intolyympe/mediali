import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

import { FormulaireDossier } from "./formulaire-dossier"

export const metadata: Metadata = {
  title: "Nouveau dossier — Espace juridiction",
}

export default function NouveauDossier() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Nouveau dossier</h1>
        <Button
          variant="outline"
          render={<Link href="/juridiction" />}
          nativeButton={false}
        >
          Retour
        </Button>
      </header>
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">Chargement…</p>}
      >
        <ChargerFormulaire />
      </Suspense>
    </main>
  )
}

async function ChargerFormulaire() {
  const supabase = await createClient()
  const { data: mediateurs, error } = await supabase
    .from("mediateurs")
    .select("id, nom")
    .order("nom")

  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Impossible de charger les médiateurs : {error.message}
      </p>
    )
  }

  return <FormulaireDossier mediateurs={mediateurs} />
}
