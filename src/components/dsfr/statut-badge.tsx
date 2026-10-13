import { Badge } from "@/components/ui/badge"
import { LIBELLES_ISSUE, LIBELLES_STATUT } from "@/lib/statuts"
import type { Enums } from "@/lib/supabase/database.types"
import { cn } from "@/lib/utils"

// Badges aux couleurs du DSFR. Toujours avec un texte : la couleur seule ne
// doit jamais porter l'information (RGAA). Contrastes vérifiés ≥ 4,5:1.

export type TypeBadge = "information" | "avertissement" | "succes" | "neutre" | "erreur"

const COULEURS: Record<TypeBadge, string> = {
  information: "bg-[#e8edff] text-[#0063cb]",
  avertissement: "bg-[#ffe9e6] text-[#b34000]",
  succes: "bg-[#b8fec9] text-[#18753c]",
  neutre: "bg-[#eeeeee] text-[#3a3a3a]",
  // Rouge Marianne plein : le texte rouge sur fond rose pâle n'atteint pas 4,5:1
  erreur: "bg-[#e1000f] text-white",
}

export function BadgeDsfr({
  type,
  children,
  className,
}: {
  type: TypeBadge
  children: React.ReactNode
  className?: string
}) {
  return (
    <Badge className={cn("h-auto rounded-sm px-2 py-0.5 font-bold uppercase", COULEURS[type], className)}>
      {children}
    </Badge>
  )
}

export const TYPE_STATUT: Record<Enums<"statut_dossier">, TypeBadge> = {
  en_attente: "neutre",
  partiellement_joignable: "avertissement",
  joignable: "information",
  rdv_fixe: "succes",
}

export const TYPE_ISSUE: Record<Enums<"issue_dossier">, TypeBadge> = {
  en_cours: "neutre",
  accord_total: "succes",
  accord_partiel: "succes",
  echec: "erreur",
  carence: "avertissement",
  refus: "erreur",
}

/** Statut d'un dossier : « En attente », « RDV fixé »… */
export function BadgeStatut({ statut }: { statut: Enums<"statut_dossier"> }) {
  return <BadgeDsfr type={TYPE_STATUT[statut]}>{LIBELLES_STATUT[statut]}</BadgeDsfr>
}

/** Issue d'un dossier : « Accord total », « Carence »… */
export function BadgeIssue({ issue }: { issue: Enums<"issue_dossier"> }) {
  return <BadgeDsfr type={TYPE_ISSUE[issue]}>{LIBELLES_ISSUE[issue]}</BadgeDsfr>
}
