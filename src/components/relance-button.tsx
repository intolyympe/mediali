import { Button } from "@/components/ui/button"

// Emplacement du bouton « Relancer » : la personne 5 y branche l'envoi des
// e-mails de relance aux parties non confirmées.
export function RelanceButton({ dossierId }: { dossierId: string }) {
  return (
    <Button variant="outline" disabled data-dossier-id={dossierId}>
      Relancer
    </Button>
  )
}
