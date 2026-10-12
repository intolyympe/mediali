import type { Metadata } from "next"
import { Suspense } from "react"

import { BoutonDeconnexion } from "@/components/bouton-deconnexion"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { lireMediateurId } from "@/lib/roles"
import { LIBELLES_STATUT } from "@/lib/statuts"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Espace médiateur — Médiation",
}

const formatDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" })

// Point de départ du tableau de bord médiateur (personne 4).

export default function EspaceMediateur() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-8">
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">Chargement…</p>}
      >
        <ContenuEspaceMediateur />
      </Suspense>
    </main>
  )
}

// Lit la session et la base : rendu à chaque requête, d'où le Suspense.
async function ContenuEspaceMediateur() {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const mediateurId = lireMediateurId(claims?.claims)

  if (!mediateurId) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p role="alert" className="text-sm text-destructive">
          Ce compte n&apos;est relié à aucun médiateur. Contactez l&apos;administrateur.
        </p>
        <BoutonDeconnexion />
      </div>
    )
  }

  // Le médiateur ne voit que les dossiers qui lui sont confiés
  const { data: dossiers, error } = await supabase
    .from("dossiers")
    .select("id, numero_rg, juridiction, date_ordonnance, statut")
    .eq("mediateur_id", mediateurId)
    .order("created_at", { ascending: false })

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Espace médiateur</h1>
          <p className="text-sm text-muted-foreground">
            Connecté en tant que {claims?.claims.email}
          </p>
        </div>
        <BoutonDeconnexion />
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
