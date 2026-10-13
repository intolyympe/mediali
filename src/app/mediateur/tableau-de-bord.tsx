"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LIBELLES_ROLE, LIBELLES_STATUT, trierParties } from "@/lib/statuts"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Enums } from "@/lib/supabase/database.types"

import {
  COULEURS_STATUT,
  delaiMoyenConfirmation,
  estConfirmee,
  estEnRetard,
  joursDepuis,
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
  const statutsPrecedents = useRef(
    new Map(dossiersInitiaux.map((d) => [d.id, d.statut]))
  )

  useEffect(() => {
    const supabase = createClient()

    async function recharger() {
      const { data } = await supabase
        .from("dossiers")
        .select(SELECT_DOSSIERS)
        .eq("mediateur_id", mediateurId)
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

    // La table parties n'a pas de mediateur_id : on recharge à chaque changement
    // ponytail: un rechargement complet par événement ; filtrer si beaucoup de médiateurs.
    const canal = supabase
      .channel(`tableau-mediateur-${mediateurId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dossiers", filter: `mediateur_id=eq.${mediateurId}` },
        recharger
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "parties" }, recharger)
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [mediateurId])

  const delai = delaiMoyenConfirmation(dossiers)

  return (
    <>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {STATUTS.map((statut) => (
          <Indicateur
            key={statut}
            libelle={LIBELLES_STATUT[statut]}
            valeur={String(dossiers.filter((d) => d.statut === statut).length)}
          />
        ))}
        <Indicateur
          libelle="Délai moyen ordonnance → confirmation"
          valeur={delai === null ? "—" : `${delai.toFixed(1).replace(".", ",")} j`}
        />
      </section>

      {dossiers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun dossier ne vous est confié.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {dossiers.map((dossier) => (
            <li key={dossier.id}>
              <CarteDossier
                dossier={dossier}
                maintenant={maintenant}
                flash={enFlash.has(dossier.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function Indicateur({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <span className="text-2xl font-semibold">{valeur}</span>
        <span className="text-xs text-muted-foreground">{libelle}</span>
      </CardContent>
    </Card>
  )
}

function CarteDossier({
  dossier,
  maintenant,
  flash,
}: {
  dossier: DossierTableau
  maintenant: number
  flash: boolean
}) {
  const enRetard = estEnRetard(dossier, maintenant)
  const jours = joursDepuis(dossier.date_ordonnance, maintenant)
  const parties = trierParties(dossier.parties)

  return (
    <Link href={`/mediateur/dossiers/${dossier.id}`} className="block rounded-xl">
      <Card
        className={cn(
          "h-full transition-colors duration-1000 hover:ring-foreground/30",
          flash && "bg-green-100 duration-150",
          enRetard && "ring-2 ring-destructive hover:ring-destructive"
        )}
      >
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2">
            <span>Dossier n° {dossier.numero_rg}</span>
            <Badge className={COULEURS_STATUT[dossier.statut]}>
              {LIBELLES_STATUT[dossier.statut]}
            </Badge>
          </CardTitle>
          <p className={enRetard ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
            Ordonnance du {formatDate.format(new Date(dossier.date_ordonnance))} ·{" "}
            {jours} jour{jours > 1 ? "s" : ""}
            {enRetard && " · sans confirmation complète"}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {parties.map((partie) => {
            const confirmee = estConfirmee(partie)
            return (
              <div key={partie.id} className="flex flex-wrap items-center gap-2">
                <span
                  aria-hidden
                  className={cn("size-2.5 rounded-full", confirmee ? "bg-green-600" : "bg-zinc-400")}
                />
                <span>
                  {LIBELLES_ROLE[partie.role]} : {confirmee ? "confirmé" : "en attente"}
                </span>
                {partie.rempli_par === "avocat" && <Badge variant="outline">via avocat</Badge>}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </Link>
  )
}
