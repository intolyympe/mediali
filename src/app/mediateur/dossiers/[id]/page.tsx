import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { RelanceButton } from "@/components/relance-button"
import { BadgeDsfr, BadgeIssue, BadgeStatut, type TypeBadge } from "@/components/dsfr/statut-badge"
import { Timeline, type EvenementTimeline } from "@/components/timeline"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { lireMediateurId } from "@/lib/roles"
import { LIBELLES_ISSUE, LIBELLES_MODE, LIBELLES_ROLE, trierParties } from "@/lib/statuts"
import type { Enums, Json, Tables } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/server"

import { estConfirmee, filtreIntervenant, libelleChoix, mots } from "../../donnees"
import { ActionsMediateur, type CreneauPropose, type PartieAction } from "./actions-mediateur"
import { InterrupteurProvision } from "./interrupteur-provision"
import { ActualisationTempsReel } from "./temps-reel"

export const metadata: Metadata = {
  title: "Dossier — Espace médiateur",
}

const FUSEAU = "Indian/Reunion"
const formatDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: FUSEAU })
const formatJour = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: FUSEAU })
const formatHeure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: FUSEAU })

const libelleCreneau = (creneau: { debut: string; fin: string }) => {
  const jour = formatJour.format(new Date(creneau.debut))
  return `${jour.charAt(0).toUpperCase()}${jour.slice(1)}, ${formatHeure.format(new Date(creneau.debut))} – ${formatHeure.format(new Date(creneau.fin))}`
}

const TEXTE_FORMAT: Record<Enums<"preference_format">, string> = {
  ensemble: "avec l'autre partie",
  separe: "séparément",
  indifferent: "format indifférent",
}
const TEXTE_LIEU: Record<Enums<"preference_lieu">, string> = {
  presentiel: "en personne",
  distanciel: "à distance",
  indifferent: "lieu indifférent",
}

const TYPE_CHOIX: Record<Enums<"choix_partie">, TypeBadge> = {
  information: "information",
  accepte: "succes",
  refuse: "erreur",
}

export default function PageDossier(props: PageProps<"/mediateur/dossiers/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8">
      <Button
        variant="ghost"
        className="self-start px-0"
        render={<Link href="/mediateur" />}
        nativeButton={false}
      >
        ← Mes dossiers
      </Button>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
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
    .select(
      `id, numero_rg, juridiction, mode, statut, issue, date_ordonnance, provision_consignee,
       compte_rendu, cloture_le, rdv_format, rdv_lieu, mediateur_id, co_mediateur_id,
       mediateur:mediateurs!dossiers_mediateur_id_fkey (nom),
       co_mediateur:mediateurs!dossiers_co_mediateur_id_fkey (nom),
       rdv:creneaux!dossiers_rdv_creneau_id_fkey (id, debut, fin),
       parties (*, disponibilites (creneau:creneaux (id, debut, fin))),
       evenements (id, created_at, acteur, libelle, type, details)`
    )
    .eq("id", id)
    .or(filtreIntervenant(mediateurId))
    .maybeSingle()

  // Id inconnu, mal formé ou dossier d'un autre intervenant
  if (!dossier) notFound()

  const m = mots(dossier.mode)
  const clos = dossier.cloture_le !== null
  const parties = trierParties(dossier.parties)
  const participants = parties.filter((partie) => partie.choix !== "refuse")
  const evenements: EvenementTimeline[] = dossier.evenements.map((evenement) => ({
    ...evenement,
    detail: detailEvenement(evenement.type, evenement.details, dossier.mode),
  }))

  // Propositions de créneaux pour « Fixer le premier rendez-vous »
  let creneaux: CreneauPropose[] = []
  if (!clos && dossier.mediateur_id) {
    const [{ data: aVenir }, { data: reserves }] = await Promise.all([
      supabase
        .from("creneaux")
        .select("id, debut, fin")
        .eq("mediateur_id", dossier.mediateur_id)
        .gt("debut", maintenantIso())
        .order("debut"),
      supabase.from("dossiers").select("id, rdv_creneau_id").not("rdv_creneau_id", "is", null),
    ])
    const prisAilleurs = new Set(
      (reserves ?? []).filter((d) => d.id !== dossier.id).map((d) => d.rdv_creneau_id)
    )
    creneaux = (aVenir ?? [])
      .filter((creneau) => !prisAilleurs.has(creneau.id))
      .map((creneau) => ({
        id: creneau.id,
        libelle: libelleCreneau(creneau),
        disponibles: participants
          .filter((partie) => partie.disponibilites.some((d) => d.creneau?.id === creneau.id))
          .map((partie) => `${partie.prenom} ${partie.nom}`),
      }))
      // Le rendez-vous actuel, puis les créneaux où le plus de parties sont disponibles
      .sort(
        (a, b) =>
          Number(b.id === dossier.rdv?.id) - Number(a.id === dossier.rdv?.id) ||
          b.disponibles.length - a.disponibles.length
      )
      .slice(0, 12)
  }

  const partiesAction: PartieAction[] = parties.map((partie) => ({
    id: partie.id,
    nom: `${partie.prenom} ${partie.nom}`,
    refus: partie.choix === "refuse",
    preference: preference(partie),
  }))

  return (
    <>
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold">Dossier n° {dossier.numero_rg}</h1>
            <div className="flex flex-wrap gap-2">
              <BadgeDsfr type="information">{LIBELLES_MODE[dossier.mode]}</BadgeDsfr>
              {dossier.co_mediateur && <BadgeDsfr type="neutre">{m.coTiers}</BadgeDsfr>}
              <BadgeStatut statut={dossier.statut} />
              <BadgeIssue issue={dossier.issue} />
            </div>
            <p className="text-muted-foreground">
              {dossier.juridiction} · ordonnance du {formatDate.format(new Date(dossier.date_ordonnance))}
            </p>
            <p>
              {m.tiers.charAt(0).toUpperCase() + m.tiers.slice(1)} : {dossier.mediateur?.nom ?? "—"}
              {dossier.co_mediateur && ` · co-intervenant : ${dossier.co_mediateur.nom}`}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3">
            <InterrupteurProvision dossierId={dossier.id} initial={dossier.provision_consignee} desactive={clos} />
            {!clos && <RelanceButton dossierId={dossier.id} />}
          </div>
        </div>
      </header>

      {clos && (
        <p role="status" className="border-l-4 border-primary bg-secondary p-4">
          <strong>Dossier clôturé le {formatDate.format(new Date(dossier.cloture_le!))}</strong> — issue :{" "}
          {LIBELLES_ISSUE[dossier.issue]}. Le dossier est en lecture seule.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Premier rendez-vous</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {dossier.rdv ? (
            <>
              <p className="text-lg font-bold text-primary">{libelleCreneau(dossier.rdv)}</p>
              <p className="text-muted-foreground">
                {dossier.rdv_format
                  ? `Parties reçues ${dossier.rdv_format === "ensemble" ? "ensemble" : "séparément"}`
                  : "Format à préciser"}
                {" · "}
                {dossier.rdv_lieu ? (dossier.rdv_lieu === "presentiel" ? "en personne" : "à distance") : "lieu à préciser"}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">Pas encore de rendez-vous fixé.</p>
          )}
        </CardContent>
      </Card>

      {!clos && (
        <ActionsMediateur
          dossierId={dossier.id}
          mode={dossier.mode}
          aujourdhui={aujourdhuiReunion()}
          creneaux={creneaux}
          nbParticipants={participants.length}
          parties={partiesAction}
          rdvActuel={
            dossier.rdv ? { creneauId: dossier.rdv.id, format: dossier.rdv_format, lieu: dossier.rdv_lieu } : null
          }
        />
      )}

      {dossier.compte_rendu && (
        <section aria-labelledby="titre-cr" className="flex flex-col gap-2">
          <h2 id="titre-cr" className="text-xl font-bold">
            Comptes rendus
          </h2>
          <p className="rounded-sm bg-muted p-4 whitespace-pre-line">{dossier.compte_rendu}</p>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <section aria-labelledby="titre-parties" className="flex flex-col gap-4">
          <h2 id="titre-parties" className="text-xl font-bold">
            Parties ({parties.filter(estConfirmee).length}/{parties.length} ont répondu)
          </h2>
          {parties.map((partie) => (
            <CartePartie key={partie.id} partie={partie} mode={dossier.mode} />
          ))}
        </section>

        <section aria-labelledby="titre-timeline" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="titre-timeline" className="text-xl font-bold">
              Historique
            </h2>
            <ActualisationTempsReel dossierId={dossier.id} />
          </div>
          <Timeline
            evenements={evenements}
            plusRecentEnPremier
            titre={`Historique du dossier n° ${dossier.numero_rg}`}
          />
        </section>
      </div>
    </>
  )
}

type Partie = Tables<"parties"> & {
  disponibilites: { creneau: { id: string; debut: string; fin: string } | null }[]
}

function preference(partie: Pick<Tables<"parties">, "pref_format" | "pref_lieu">) {
  const morceaux = [
    partie.pref_format && TEXTE_FORMAT[partie.pref_format],
    partie.pref_lieu && TEXTE_LIEU[partie.pref_lieu],
  ].filter(Boolean)
  return morceaux.length > 0 ? `Souhaite être reçu(e) ${morceaux.join(", ")}` : null
}

function CartePartie({ partie, mode }: { partie: Partie; mode: Enums<"mode_amiable"> }) {
  const repondu = estConfirmee(partie)
  const aUnAvocat = partie.avocat_nom || partie.avocat_email || partie.avocat_telephone
  const avocat = (
    <Coordonnees
      titre={`Avocat${partie.avocat_nom ? ` : ${partie.avocat_nom}` : ""}`}
      telephones={[partie.avocat_telephone]}
      emails={[partie.avocat_email]}
      complement={partie.avocat_barreau ? `Barreau de ${partie.avocat_barreau}` : null}
    />
  )
  const client = (
    <Coordonnees
      titre={partie.passer_par_avocat ? "Client" : "Coordonnées"}
      telephones={[partie.telephone, partie.telephone_2]}
      emails={[partie.email, partie.email_2]}
      complement={partie.adresse}
    />
  )
  const disponibilites = partie.disponibilites
    .map((d) => d.creneau)
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => a.debut.localeCompare(b.debut))
  const pref = preference(partie)

  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          {partie.prenom} {partie.nom}
          <span className="text-sm font-normal text-muted-foreground">({LIBELLES_ROLE[partie.role]})</span>
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <BadgeDsfr type={repondu && partie.choix ? TYPE_CHOIX[partie.choix] : "neutre"}>
            {libelleChoix(partie, mode)}
          </BadgeDsfr>
          {partie.rempli_par === "avocat" && <BadgeDsfr type="neutre">Via avocat</BadgeDsfr>}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {partie.passer_par_avocat ? (
          <>
            <p className="border-l-4 border-avertissement bg-[#ffe9e6] p-3 text-sm font-medium">
              Le client souhaite être contacté via son avocat.
            </p>
            {avocat}
            {client}
          </>
        ) : (
          <>
            {client}
            {aUnAvocat && avocat}
          </>
        )}
        {pref && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-muted-foreground uppercase">Premier rendez-vous</span>
            <span>{pref}</span>
          </div>
        )}
        {disponibilites.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-muted-foreground uppercase">
              Disponibilités ({disponibilites.length})
            </span>
            <ul className="text-sm">
              {disponibilites.map((creneau) => (
                <li key={creneau.id}>{libelleCreneau(creneau)}</li>
              ))}
            </ul>
          </div>
        )}
        {!repondu && <p className="text-sm text-muted-foreground">En attente de réponse.</p>}
      </CardContent>
    </Card>
  )
}

function Coordonnees({
  titre,
  telephones,
  emails,
  complement,
}: {
  titre: string
  telephones: (string | null)[]
  emails: (string | null)[]
  complement?: string | null
}) {
  const tels = telephones.filter((t): t is string => Boolean(t))
  const mails = emails.filter((e): e is string => Boolean(e))
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold text-muted-foreground uppercase">{titre}</span>
      {tels.map((telephone) => (
        <a key={telephone} className="text-primary underline" href={`tel:${telephone.replace(/[^\d+]/g, "")}`}>
          {telephone}
        </a>
      ))}
      {mails.map((email) => (
        <a key={email} className="text-primary underline" href={`mailto:${email}`}>
          {email}
        </a>
      ))}
      {complement && <span className="text-muted-foreground">{complement}</span>}
      {tels.length === 0 && mails.length === 0 && !complement && (
        <span className="text-muted-foreground">Non renseigné</span>
      )}
    </div>
  )
}

/** Précision sous le libellé de certains événements. */
function detailEvenement(type: string, details: Json, mode: Enums<"mode_amiable">) {
  if (!details || typeof details !== "object" || Array.isArray(details)) return undefined
  if (type === "reponse" && typeof details.choix === "string") {
    const choix = details.choix as Enums<"choix_partie">
    return `Choix : ${libelleChoix({ choix, confirme_le: "", consentement_rgpd: true }, mode)}`
  }
  if ((type === "seance" || type === "reunion_information") && Array.isArray(details.presents)) {
    const presents = details.presents.join(", ") || "aucune partie"
    const absents = Array.isArray(details.absents) && details.absents.length > 0 ? ` · Absents : ${details.absents.join(", ")}` : ""
    return `Présents : ${presents}${absents}`
  }
  return undefined
}

// Heure et date de la requête (après connection(), appelé par createClient)
function maintenantIso() {
  return new Date().toISOString()
}
function aujourdhuiReunion() {
  return new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
