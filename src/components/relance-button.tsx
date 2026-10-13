"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { relancerParties } from "@/lib/emails/actions"

// Bouton « Relancer » de la page de détail d'un dossier (espace médiateur) :
// renvoie par e-mail le lien du QR code aux parties qui n'ont pas répondu.
export function RelanceButton({ dossierId }: { dossierId: string }) {
  const [enCours, demarrer] = useTransition()

  function relancer() {
    demarrer(async () => {
      const resultat = await relancerParties(dossierId)
      if (resultat.erreur) {
        toast.error(resultat.erreur)
      } else {
        toast.success(
          resultat.envoyes > 1 ? `${resultat.envoyes} e-mails de relance envoyés.` : "E-mail de relance envoyé."
        )
      }
    })
  }

  return (
    <Button variant="outline" onClick={relancer} disabled={enCours}>
      {enCours ? "Envoi…" : "Relancer"}
    </Button>
  )
}
