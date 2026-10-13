"use client"

import { PrinterIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

// qrcode.react utilise des hooks : il doit être rendu côté client.
export { QRCodeSVG } from "qrcode.react"

export function BoutonImprimer() {
  return (
    <Button onClick={() => window.print()}>
      <PrinterIcon aria-hidden />
      Imprimer les QR codes
    </Button>
  )
}

/**
 * Temps réel : à chaque changement du dossier, de ses parties ou de sa
 * timeline, la page serveur est relue (router.refresh).
 */
export function ActualisationTempsReel({ dossierId }: { dossierId: string }) {
  const router = useRouter()
  const [connecte, setConnecte] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const rafraichir = () => router.refresh()
    const canal = supabase
      .channel(`juridiction-dossier-${dossierId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "evenements", filter: `dossier_id=eq.${dossierId}` }, rafraichir)
      .on("postgres_changes", { event: "*", schema: "public", table: "parties", filter: `dossier_id=eq.${dossierId}` }, rafraichir)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "dossiers", filter: `id=eq.${dossierId}` }, rafraichir)
      .subscribe((statut) => setConnecte(statut === "SUBSCRIBED"))

    return () => {
      supabase.removeChannel(canal)
    }
  }, [dossierId, router])

  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <span aria-hidden className={connecte ? "size-2 rounded-full bg-succes" : "size-2 rounded-full bg-input"} />
      {connecte ? "Mise à jour en temps réel" : "Connexion au temps réel…"}
    </p>
  )
}
