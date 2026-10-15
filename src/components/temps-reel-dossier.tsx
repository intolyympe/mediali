"use client"

import type { RealtimeChannel } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { LIBELLES_STATUT } from "@/lib/statuts"
import { createClient } from "@/lib/supabase/client"
import type { Enums } from "@/lib/supabase/database.types"

/**
 * Temps réel d'une page de dossier (espaces juridiction et médiateur) : à
 * chaque changement du dossier, de ses parties ou de sa timeline, la page
 * serveur est relue (router.refresh). Les nouveaux événements et les
 * changements de statut sont annoncés aux lecteurs d'écran (aria-live).
 */
export function ActualisationTempsReel({
  dossierId,
  statut,
}: {
  dossierId: string
  /** Statut affiché : sert à détecter un changement et à l'annoncer. */
  statut: Enums<"statut_dossier">
}) {
  const router = useRouter()
  const [connecte, setConnecte] = useState(false)
  const [annonce, setAnnonce] = useState("")
  const statutAffiche = useRef(statut)

  useEffect(() => {
    statutAffiche.current = statut
  }, [statut])

  useEffect(() => {
    const supabase = createClient()
    const rafraichir = () => router.refresh()
    let canal: RealtimeChannel | null = null
    let actif = true

    async function abonner() {
      // Charger le jeton de session AVANT de s'abonner : sinon l'abonnement est
      // anonyme et la RLS (réservée aux connectés) filtre tous les événements.
      await supabase.realtime.setAuth()
      if (!actif) return
      canal = supabase
        .channel(`dossier-${dossierId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "evenements", filter: `dossier_id=eq.${dossierId}` },
          (changement) => {
            if (changement.eventType === "INSERT" && typeof changement.new.libelle === "string") {
              setAnnonce(`Nouvel événement : ${changement.new.libelle}`)
            }
            rafraichir()
          })
        .on("postgres_changes", { event: "*", schema: "public", table: "parties", filter: `dossier_id=eq.${dossierId}` }, rafraichir)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "dossiers", filter: `id=eq.${dossierId}` },
          (changement) => {
            const nouveau = changement.new.statut as Enums<"statut_dossier"> | undefined
            if (nouveau && nouveau !== statutAffiche.current && nouveau in LIBELLES_STATUT) {
              statutAffiche.current = nouveau
              setAnnonce(`Nouveau statut du dossier : ${LIBELLES_STATUT[nouveau]}`)
            }
            rafraichir()
          })
        .subscribe((etat) => setConnecte(etat === "SUBSCRIBED"))
    }
    abonner()

    return () => {
      actif = false
      if (canal) supabase.removeChannel(canal)
    }
  }, [dossierId, router])

  return (
    <>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <span aria-hidden className={connecte ? "size-2 rounded-full bg-succes" : "size-2 rounded-full bg-input"} />
        {connecte ? "Mise à jour en temps réel" : "Connexion au temps réel…"}
      </p>
      {/* Présente dès le chargement : les lecteurs d'écran n'annoncent que les changements */}
      <p role="status" aria-live="polite" className="sr-only">
        {annonce}
      </p>
    </>
  )
}
