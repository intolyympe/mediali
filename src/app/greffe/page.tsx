import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { BoutonDeconnexion } from "@/components/bouton-deconnexion"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createClient } from "@/lib/supabase/server"

import { BadgeStatut } from "./badge-statut"

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
        <div className="flex gap-2">
          <Button render={<Link href="/greffe/nouveau" />} nativeButton={false}>
            Nouveau dossier
          </Button>
          <BoutonDeconnexion />
        </div>
      </header>
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">Chargement…</p>}
      >
        <ListeDossiers />
      </Suspense>
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

async function ListeDossiers() {
  const supabase = await createClient()
  const { data: dossiers, error } = await supabase
    .from("dossiers")
    .select("id, numero_rg, juridiction, statut, mediateurs (nom)")
    .order("created_at", { ascending: false })

  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Impossible de charger les dossiers : {error.message}
      </p>
    )
  }

  if (dossiers.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun dossier.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>N° RG</TableHead>
          <TableHead>Juridiction</TableHead>
          <TableHead>Médiateur</TableHead>
          <TableHead>Statut</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {dossiers.map((dossier) => (
          <TableRow key={dossier.id}>
            <TableCell className="font-medium">
              <Link
                href={`/greffe/dossiers/${dossier.id}`}
                className="underline underline-offset-4"
              >
                {dossier.numero_rg}
              </Link>
            </TableCell>
            <TableCell>{dossier.juridiction}</TableCell>
            <TableCell>{dossier.mediateurs?.nom ?? "—"}</TableCell>
            <TableCell>
              <BadgeStatut statut={dossier.statut} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
