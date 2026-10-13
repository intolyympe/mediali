"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"

import { BadgeDsfr, BadgeIssue, BadgeStatut } from "@/components/dsfr/statut-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LIBELLES_MODE, LIBELLES_ROLE, LIBELLES_STATUT, trierParties } from "@/lib/statuts"
import type { RealtimeChannel } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/client"
import type { Enums } from "@/lib/supabase/database.types"
import { cn } from "@/lib/utils"

import {
  delaiMoyenConfirmation,
  estConfirmee,
  estEnRetard,
  filtreIntervenant,
  joursDepuis,
  libelleChoix,
  mots,
  SELECT_DOSSIERS,
  type DossierTableau,
} from "./donnees"

const formatDate = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeZone: "Indian/Reunion",
})

const STATUTS: Enums<"statut_dossier">[] = [
  "en_attente",
  "partiellement_joignable",
  "joignable",
  "rdv_fixe",
]

const DUREE_FLASH_MS = 2000

export function TableauDeBord({
  mediateurId,
  dossiersInitiaux,
  maintenant,
}: {
  mediateurId: string
  dossiersInitiaux: DossierTableau[]
  // Heure du rendu serveur : évite Date.now() pendant le rendu client
  maintenant: number
}) {
  const [dossiers, setDossiers] = useState(dossiersInitiaux)
  const [enFlash, setEnFlash] = useState<Set<string>>(new Set())
  const statutsPrecedents = useRef(new Map(dossiersInitiaux.map((d) => [d.id, d.statut])))

  useEffect(() => {
    const supabase = createClient()

    async function recharger() {
      const { data } = await supabase
        .from("dossiers")
        .select(SELECT_DOSSIERS)
        .or(filtreIntervenant(mediateurId))
        .order("created_at", { ascending: false })
      if (!data) return

      // Dossiers dont le statut vient de changer : flash vert sur la carte
      const changes = data
        .filter((d) => {
          const avant = statutsPrecedents.current.get(d.id)
          return avant !== undefined && avant !== d.statut
        })
        .map((d) => d.id)
      statutsPrecedents.current = new Map(data.map((d) => [d.id, d.statut]))
      setDossiers(data)

      if (changes.length > 0) {
        setEnFlash((s) => new Set([...s, ...changes]))
        setTimeout(() => {
          setEnFlash((s) => new Set([...s].filter((id) => !changes.includes(id))))
        }, DUREE_FLASH_MS)
      }
    }

    let canal: RealtimeChannel | null = null
    let actif = true

    async function abonner() {
      // Charger le jeton de session AVANT de s'abonner : sinon l'abonnement est
      // anonyme et la RLS (réservée aux connectés) filtre tous les événements.
      await supabase.realtime.setAuth()
      if (!actif) return
      // Un filtre Realtime par colonne : intervenant principal, puis co-médiateur.
      // La table parties n'a pas de mediateur_id : on recharge à chaque changement.
      canal = supabase
        .channel(`tableau-mediateur-${mediateurId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "dossiers", filter: `mediateur_id=eq.${mediateurId}` }, recharger)
        .on("postgres_changes", { event: "*", schema: "public", table: "dossiers", filter: `co_mediateur_id=eq.${mediateurId}` }, recharger)
        .on("postgres_changes", { event: "*", schema: "public", table: "parties" }, recharger)
        .subscribe()
    }
    abonner()

    return () => {
      actif = false
      if (canal) supabase.removeChannel(canal)
    }
  }, [mediateurId])

  const delai = delaiMoyenConfirmation(dossiers)
  const enCours = dossiers.filter((d) => d.issue === "en_cours")
  const clos = dossiers.filter((d) => d.issue !== "en_cours")

  return (
    <>
      <section aria-label="Indicateurs">
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {STATUTS.map((statut) => (
            <Indicateur
              key={statut}
              libelle={LIBELLES_STATUT[statut]}
              valeur={String(enCours.filter((d) => d.statut === statut).length)}
            />
          ))}
          <Indicateur
            libelle="Délai moyen ordonnance → réponse de toutes les parties"
            valeur={delai === null ? "—" : `${delai.toFixed(1).replace(".", ",")} j`}
          />
        </ul>
      </section>

      {dossiers.length === 0 ? (
        <p className="text-muted-foreground">Aucun dossier ne vous est confié.</p>
      ) : (
        <>
          <ListeDossiers titre={`Dossiers en cours (${enCours.length})`} dossiers={enCours}
            mediateurId={mediateurId} maintenant={maintenant} enFlash={enFlash} />
          {clos.length > 0 && (
            <ListeDossiers titre={`Dossiers clôturés (${clos.length})`} dossiers={clos}
              mediateurId={mediateurId} maintenant={maintenant} enFlash={enFlash} />
          )}
        </>
      )}
    </>
  )
}

function ListeDossiers({
  titre,
  dossiers,
  mediateurId,
  maintenant,
  enFlash,
}: {
  titre: string
  dossiers: DossierTableau[]
  mediateurId: string
  maintenant: number
  enFlash: Set<string>
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-bold">{titre}</h2>
      {dossiers.length === 0 ? (
        <p className="text-muted-foreground">Aucun dossier.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {dossiers.map((dossier) => (
            <li key={dossier.id}>
              <CarteDossier
                dossier={dossier}
                coIntervenant={dossier.co_mediateur_id === mediateurId}
                maintenant={maintenant}
                flash={enFlash.has(dossier.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Indicateur({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <li>
      <Card size="sm" className="h-full">
        <CardContent className="flex flex-col gap-1">
          <span className="text-2xl font-bold text-primary">{valeur}</span>
          <span className="text-sm">{libelle}</span>
        </CardContent>
      </Card>
    </li>
  )
}

function CarteDossier({
  dossier,
  coIntervenant,
  maintenant,
  flash,
}: {
  dossier: DossierTableau
  coIntervenant: boolean
  maintenant: number
  flash: boolean
}) {
  const enRetard = estEnRetard(dossier, maintenant)
  const jours = joursDepuis(dossier.date_ordonnance, maintenant)
  const parties = trierParties(dossier.parties)
  const repondu = parties.filter(estConfirmee).length

  return (
    <Link
      href={`/mediateur/dossiers/${dossier.id}`}
      className="block h-full rounded-sm text-foreground no-underline"
      aria-label={`Dossier n° ${dossier.numero_rg}`}
    >
      <Card
        className={cn(
          "h-full transition-colors duration-1000 hover:ring-primary",
          flash && "bg-[#b8fec9] duration-150",
          enRetard && "ring-2 ring-destructive hover:ring-destructive"
        )}
      >
        <CardHeader className="gap-2">
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-lg">
            <span className="text-primary">Dossier n° {dossier.numero_rg}</span>
            <BadgeStatut statut={dossier.statut} />
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <BadgeDsfr type="information">{LIBELLES_MODE[dossier.mode]}</BadgeDsfr>
            {dossier.co_mediateur_id && (
              <BadgeDsfr type="neutre">
                {mots(dossier.mode).coTiers}
                {coIntervenant ? " (vous êtes co-intervenant)" : ""}
              </BadgeDsfr>
            )}
            {dossier.issue !== "en_cours" && <BadgeIssue issue={dossier.issue} />}
          </div>
          <p className={enRetard ? "text-sm font-medium text-destructive" : "text-sm text-muted-foreground"}>
            Ordonnance du {formatDate.format(new Date(dossier.date_ordonnance))} ·{" "}
            {/* Date dans le futur : erreur de saisie probable */}
            {jours < 0 ? "date à vérifier" : `${jours} jour${jours > 1 ? "s" : ""}`}
            {enRetard && " · réponses incomplètes depuis plus de 7 jours"}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="font-medium">
            {repondu}/{parties.length} partie{parties.length > 1 ? "s" : ""} ayant répondu
          </p>
          <ul className="flex flex-col gap-1.5 text-sm">
            {parties.map((partie) => {
              const confirmee = estConfirmee(partie)
              return (
                <li key={partie.id} className="flex flex-wrap items-center gap-2">
                  <span
                    aria-hidden
                    className={cn("size-2.5 shrink-0 rounded-full", confirmee ? "bg-succes" : "bg-input")}
                  />
                  <span>
                    {partie.prenom} {partie.nom}{" "}
                    <span className="text-muted-foreground">({LIBELLES_ROLE[partie.role].toLowerCase()})</span> :{" "}
                    <span className={confirmee ? "font-medium" : "text-muted-foreground"}>
                      {libelleChoix(partie, dossier.mode)}
                    </span>
                  </span>
                  {partie.rempli_par === "avocat" && <BadgeDsfr type="neutre">Via avocat</BadgeDsfr>}
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>
    </Link>
  )
}
