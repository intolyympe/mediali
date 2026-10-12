import { Badge } from "@/components/ui/badge"
import { LIBELLES_STATUT } from "@/lib/statuts"
import type { Enums } from "@/lib/supabase/database.types"

const COULEURS: Record<Enums<"statut_dossier">, string> = {
  en_attente: "bg-gray-200 text-gray-800",
  partiellement_joignable: "bg-orange-100 text-orange-800",
  joignable: "bg-blue-100 text-blue-800",
  rdv_fixe: "bg-green-100 text-green-800",
}

export function BadgeStatut({ statut }: { statut: Enums<"statut_dossier"> }) {
  return <Badge className={COULEURS[statut]}>{LIBELLES_STATUT[statut]}</Badge>
}
