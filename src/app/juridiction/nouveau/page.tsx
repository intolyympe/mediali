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
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Nouveau dossier</h1>
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
  const { data: intervenants, error } = await supabase
    .from("mediateurs")
    .select("id, nom, fonction")
    .order("nom")

  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Impossible de charger les médiateurs et conciliateurs : {error.message}
      </p>
    )
  }

  return <FormulaireDossier intervenants={intervenants} />
}
