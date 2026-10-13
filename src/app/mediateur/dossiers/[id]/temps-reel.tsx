"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import type { RealtimeChannel } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/client"

/**
 * Temps réel : à chaque changement du dossier, de ses parties ou de sa
 * timeline (y compris depuis l'espace juridiction ou une autre fenêtre),
 * la page serveur est relue.
 */
export function ActualisationTempsReel({ dossierId }: { dossierId: string }) {
  const router = useRouter()
  const [connecte, setConnecte] = useState(false)

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
        .channel(`mediateur-dossier-${dossierId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "evenements", filter: `dossier_id=eq.${dossierId}` }, rafraichir)
        .on("postgres_changes", { event: "*", schema: "public", table: "parties", filter: `dossier_id=eq.${dossierId}` }, rafraichir)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "dossiers", filter: `id=eq.${dossierId}` }, rafraichir)
        .subscribe((statut) => setConnecte(statut === "SUBSCRIBED"))
    }
    abonner()

    return () => {
      actif = false
      if (canal) supabase.removeChannel(canal)
    }
  }, [dossierId, router])

  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <span aria-hidden className={connecte ? "size-2 rounded-full bg-succes" : "size-2 rounded-full bg-input"} />
      {connecte ? "Mise à jour en temps réel" : "Connexion au temps réel…"}
    </p>
  )
}
