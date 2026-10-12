import type { Metadata } from "next"
import { headers } from "next/headers"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LIBELLES_ROLE } from "@/lib/statuts"
import { createClient } from "@/lib/supabase/server"

import { BadgeStatut } from "../../badge-statut"
import { BoutonImprimer, QRCodeSVG } from "./client"

export const metadata: Metadata = {
  title: "Dossier — Espace greffe",
}

export default function PageDossier({ params }: PageProps<"/greffe/dossiers/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-8 print:max-w-none print:p-0">
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">Chargement…</p>}
      >
        <DetailDossier params={params} />
      </Suspense>
    </main>
  )
}

async function DetailDossier({
  params,
}: Pick<PageProps<"/greffe/dossiers/[id]">, "params">) {
  const { id } = await params
  const supabase = await createClient()
  const { data: dossier } = await supabase
    .from("dossiers")
    .select(
      "numero_rg, juridiction, statut, mediateurs (nom), parties (id, role, nom, prenom, token)"
    )
    .eq("id", id)
    .maybeSingle()

  if (!dossier) notFound()

  // Adresse publique du site, pour que le QR code fonctionne hors du poste du greffe.
  const entetes = await headers()
  const origine = `${entetes.get("x-forwarded-proto") ?? "http"}://${entetes.get("host")}`

  const parties = dossier.parties.toSorted((a, b) => a.role.localeCompare(b.role))

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Dossier n° {dossier.numero_rg}</h1>
          <p className="text-sm text-muted-foreground">
            {dossier.juridiction} · Médiateur : {dossier.mediateurs?.nom ?? "—"}
          </p>
          <BadgeStatut statut={dossier.statut} />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            render={<Link href="/greffe" />}
            nativeButton={false}
          >
            Retour
          </Button>
          <BoutonImprimer />
        </div>
      </header>

      <div className="flex flex-col gap-6">
        {parties.map((partie) => {
          const url = `${origine}/p/${partie.token}`
          return (
            <Card
              key={partie.id}
              className="print:break-inside-avoid print:shadow-none print:ring-0 print:[&:not(:first-child)]:break-before-page"
            >
              <CardHeader>
                <CardTitle>À joindre à la notification</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Dossier n° {dossier.numero_rg} · {LIBELLES_ROLE[partie.role]} :{" "}
                  {partie.prenom} {partie.nom}
                </p>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 text-center">
                <QRCodeSVG value={url} size={200} marginSize={2} />
                <p className="font-mono text-xs break-all">{url}</p>
                <p className="max-w-md text-sm">
                  Scannez ce code pour transmettre vos coordonnées au médiateur et
                  choisir une date de rendez-vous. Vous êtes avocat ? Le même code
                  vous permet de répondre pour votre client.
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}
