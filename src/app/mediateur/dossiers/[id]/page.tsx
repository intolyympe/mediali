import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { RelanceButton } from "@/components/relance-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { lireMediateurId } from "@/lib/roles"
import { LIBELLES_ROLE, LIBELLES_STATUT, trierParties } from "@/lib/statuts"
import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/lib/supabase/database.types"

import { COULEURS_STATUT, estConfirmee } from "../../donnees"
import { InterrupteurProvision } from "./interrupteur-provision"

export const metadata: Metadata = {
  title: "Dossier — Espace médiateur",
}

const formatDate = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeZone: "Indian/Reunion",
})

const formatRdv = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "Indian/Reunion",
})

const formatHeure = new Intl.DateTimeFormat("fr-FR", {
  timeStyle: "short",
  timeZone: "Indian/Reunion",
})

export default function PageDossier(props: PageProps<"/mediateur/dossiers/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-8">
      <Button
        variant="ghost"
        className="self-start"
        render={<Link href="/mediateur" />}
        nativeButton={false}
      >
        ← Tableau de bord
      </Button>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Chargement…</p>}>
        <DetailDossier params={props.params} />
      </Suspense>
    </main>
  )
}

async function DetailDossier({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const mediateurId = lireMediateurId(claims?.claims)
  if (!mediateurId) notFound()

  const { data: dossier } = await supabase
    .from("dossiers")
    .select("*, parties(*), rdv:creneaux(debut, fin)")
    .eq("id", id)
    .eq("mediateur_id", mediateurId)
    .maybeSingle()

  // Id inconnu, mal formé ou dossier d'un autre médiateur
  if (!dossier) notFound()

  const parties = trierParties(dossier.parties)

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Dossier n° {dossier.numero_rg}</h1>
          <p className="text-sm text-muted-foreground">
            {dossier.juridiction} · ordonnance du{" "}
            {formatDate.format(new Date(dossier.date_ordonnance))}
          </p>
        </div>
        <Badge className={COULEURS_STATUT[dossier.statut]}>
          {LIBELLES_STATUT[dossier.statut]}
        </Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Rendez-vous</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p>
            {dossier.rdv
              ? `${formatRdv.format(new Date(dossier.rdv.debut))} – ${formatHeure.format(new Date(dossier.rdv.fin))}`
              : "Pas encore de rendez-vous fixé."}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <InterrupteurProvision
              dossierId={dossier.id}
              initial={dossier.provision_consignee}
            />
            <RelanceButton dossierId={dossier.id} />
          </div>
        </CardContent>
      </Card>

      {parties.map((partie) => (
        <CartePartie key={partie.id} partie={partie} />
      ))}
    </>
  )
}

function CartePartie({ partie }: { partie: Tables<"parties"> }) {
  const confirmee = estConfirmee(partie)
  const avocat = (
    <Coordonnees
      titre={`Avocat${partie.avocat_nom ? ` : ${partie.avocat_nom}` : ""}`}
      telephone={partie.avocat_telephone}
      email={partie.avocat_email}
      complement={partie.avocat_barreau ? `Barreau de ${partie.avocat_barreau}` : null}
    />
  )
  const aUnAvocat = partie.avocat_nom || partie.avocat_email || partie.avocat_telephone

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {LIBELLES_ROLE[partie.role]} : {partie.prenom} {partie.nom}
          {partie.rempli_par === "avocat" && <Badge variant="outline">via avocat</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!confirmee ? (
          <p className="text-muted-foreground">En attente de réponse.</p>
        ) : partie.passer_par_avocat ? (
          <>
            <p className="font-medium text-orange-800">
              Le client souhaite être contacté via son avocat
            </p>
            {avocat}
            <Coordonnees titre="Client" telephone={partie.telephone} email={partie.email} />
          </>
        ) : (
          <>
            <Coordonnees titre="Partie" telephone={partie.telephone} email={partie.email} />
            {aUnAvocat && avocat}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function Coordonnees({
  titre,
  telephone,
  email,
  complement,
}: {
  titre: string
  telephone: string | null
  email: string | null
  complement?: string | null
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground uppercase">{titre}</span>
      {telephone && (
        <a className="underline" href={`tel:${telephone.replace(/[^\d+]/g, "")}`}>
          {telephone}
        </a>
      )}
      {email && (
        <a className="underline" href={`mailto:${email}`}>
          {email}
        </a>
      )}
      {complement && <span className="text-muted-foreground">{complement}</span>}
      {!telephone && !email && <span className="text-muted-foreground">Non renseigné</span>}
    </div>
  )
}
