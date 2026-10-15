import { ExternalLinkIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { BadgeIssue, BadgeStatut } from "@/components/dsfr/statut-badge"
import { Timeline, type EvenementTimeline } from "@/components/timeline"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MODE_DEMO } from "@/lib/demo/mode"
import { LIBELLES_CHOIX, LIBELLES_MODE, LIBELLES_ROLE, trierParties } from "@/lib/statuts"
import type { Json } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/server"
import { urlPartie } from "@/lib/url"

import { ActualisationTempsReel, BoutonImprimer, QRCodeSVG } from "./client"

export const metadata: Metadata = {
  title: "Dossier — Espace juridiction",
}

export default function PageDossier({ params }: PageProps<"/juridiction/dossiers/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 print:max-w-none print:p-0">
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <DetailDossier params={params} />
      </Suspense>
    </main>
  )
}

async function DetailDossier({ params }: Pick<PageProps<"/juridiction/dossiers/[id]">, "params">) {
  const { id } = await params
  const supabase = await createClient()
  const { data: dossier } = await supabase
    .from("dossiers")
    .select(
      `id, numero_rg, juridiction, mode, statut, issue,
       mediateur:mediateurs!dossiers_mediateur_id_fkey (nom, fonction),
       co_mediateur:mediateurs!dossiers_co_mediateur_id_fkey (nom),
       parties (id, role, nom, prenom, token),
       evenements (id, created_at, acteur, libelle, type, details)`
    )
    .eq("id", id)
    .maybeSingle()

  // Id inconnu ou mal formé
  if (!dossier) notFound()

  // Demandeurs d'abord, puis défendeurs (aussi à l'impression)
  const parties = trierParties(dossier.parties)
  const conciliation = dossier.mode === "conciliation"
  const evenements: EvenementTimeline[] = dossier.evenements.map((evenement) => ({
    ...evenement,
    detail: detailEvenement(evenement.type, evenement.details, conciliation),
  }))

  return (
    <>
      <header className="flex flex-col gap-4 print:hidden">
        <Button
          variant="ghost"
          className="self-start px-0"
          render={<Link href="/juridiction" />}
          nativeButton={false}
        >
          ← Tableau de suivi
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold">Dossier n° {dossier.numero_rg}</h1>
            <p className="text-muted-foreground">
              {LIBELLES_MODE[dossier.mode]} · {dossier.juridiction}
            </p>
            <p>
              {conciliation ? "Conciliateur" : "Médiateur"} : {dossier.mediateur?.nom ?? "—"}
              {dossier.co_mediateur && (
                <>
                  {" · "}
                  {conciliation ? "Co-conciliateur" : "Co-médiateur"} : {dossier.co_mediateur.nom}
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <BadgeStatut statut={dossier.statut} />
              <BadgeIssue issue={dossier.issue} />
            </div>
          </div>
          <BoutonImprimer />
        </div>
      </header>

      <section aria-labelledby="titre-qr" className="flex flex-col gap-6">
        <h2 id="titre-qr" className="text-xl font-bold print:hidden">
          QR codes à joindre aux notifications ({parties.length})
        </h2>
        {parties.map((partie) => {
          const url = urlPartie(partie.token)
          return (
            <Card
              key={partie.id}
              className="print:break-inside-avoid print:shadow-none print:ring-0 print:[&:not(:first-of-type)]:break-before-page"
            >
              <CardHeader>
                <p className="text-sm font-bold text-primary">
                  Médiali · Cour d&apos;appel de Saint-Denis de La Réunion
                </p>
                <CardTitle>À joindre à la notification</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Dossier n° {dossier.numero_rg} · {LIBELLES_ROLE[partie.role]} : {partie.prenom}{" "}
                  {partie.nom}
                </p>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 text-center">
                <QRCodeSVG value={url} size={200} marginSize={2} title={`QR code de ${partie.prenom} ${partie.nom}`} />
                <p className="font-mono text-xs break-all">{url}</p>
                {/* Démo : tester le parcours sans téléphone */}
                {MODE_DEMO && (
                  <Button
                    variant="outline"
                    className="print:hidden"
                    render={<a href={`/p/${partie.token}`} target="_blank" rel="noopener noreferrer" />}
                    nativeButton={false}
                  >
                    <ExternalLinkIcon aria-hidden />
                    Ouvrir le parcours de cette partie
                    <span className="sr-only"> ({partie.prenom} {partie.nom}, nouvel onglet)</span>
                  </Button>
                )}
                <p className="max-w-md text-sm">
                  Scannez ce code pour transmettre vos coordonnées au{" "}
                  {conciliation ? "conciliateur" : "médiateur"} et choisir une date de
                  rendez-vous. Vous êtes avocat ? Le même code vous permet de répondre pour
                  votre client.
                </p>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section aria-labelledby="titre-timeline" className="flex flex-col gap-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="titre-timeline" className="text-xl font-bold">
            Historique du dossier
          </h2>
          <ActualisationTempsReel dossierId={dossier.id} />
        </div>
        <Timeline evenements={evenements} titre={`Historique du dossier n° ${dossier.numero_rg}`} />
      </section>
    </>
  )
}

/**
 * Précision sous le libellé, identique à l'espace médiateur : choix de la
 * partie qui répond, présents et absents d'une séance.
 */
function detailEvenement(type: string, details: Json, conciliation: boolean) {
  if (!details || typeof details !== "object" || Array.isArray(details)) return undefined
  if ((type === "seance" || type === "reunion_information") && Array.isArray(details.presents)) {
    const presents = details.presents.join(", ") || "aucune partie"
    const absents =
      Array.isArray(details.absents) && details.absents.length > 0 ? ` · Absents : ${details.absents.join(", ")}` : ""
    return `Présents : ${presents}${absents}`
  }
  if (type !== "reponse") return undefined
  const choix = details.choix
  if (choix !== "information" && choix !== "accepte" && choix !== "refuse") return undefined
  const libelle =
    choix === "accepte" && conciliation ? "Accepte la conciliation" : LIBELLES_CHOIX[choix]
  return `Choix : ${libelle}`
}
