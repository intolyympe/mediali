import type { Metadata } from "next"
import { Suspense } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { LIBELLES_STATUT } from "@/lib/statuts"
import { createClient } from "@/lib/supabase/server"

import { seDeconnecter } from "../connexion/actions"

export const metadata: Metadata = {
  title: "Tableau de bord — Médiation",
}

const formatDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" })

export default function TableauDeBord() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-8">
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">Chargement…</p>}
      >
        <ContenuTableauDeBord />
      </Suspense>
    </main>
  )
}

// Lit la session et la base : rendu à chaque requête, d'où le Suspense.
async function ContenuTableauDeBord() {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const { data: dossiers, error } = await supabase
    .from("dossiers")
    .select("id, numero_rg, juridiction, date_ordonnance, statut")
    .order("created_at", { ascending: false })

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">
            Connecté en tant que {claims?.claims.email}
          </p>
        </div>
        <form action={seDeconnecter}>
          <Button type="submit" variant="outline">
            Se déconnecter
          </Button>
        </form>
      </header>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          Impossible de charger les dossiers : {error.message}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° RG</TableHead>
              <TableHead>Juridiction</TableHead>
              <TableHead>Ordonnance</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dossiers.map((dossier) => (
              <TableRow key={dossier.id}>
                <TableCell className="font-medium">{dossier.numero_rg}</TableCell>
                <TableCell>{dossier.juridiction}</TableCell>
                <TableCell>
                  {formatDate.format(new Date(dossier.date_ordonnance))}
                </TableCell>
                <TableCell>
                  <Badge variant={dossier.statut === "rdv_fixe" ? "default" : "secondary"}>
                    {LIBELLES_STATUT[dossier.statut]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  )
}
