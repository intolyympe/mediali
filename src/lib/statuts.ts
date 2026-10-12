import type { Enums } from "@/lib/supabase/database.types"

export const LIBELLES_STATUT: Record<Enums<"statut_dossier">, string> = {
  en_attente: "En attente",
  partiellement_joignable: "Partiellement joignable",
  joignable: "Joignable",
  rdv_fixe: "RDV fixé",
}

export const LIBELLES_ROLE: Record<Enums<"role_partie">, string> = {
  demandeur: "Demandeur",
  defendeur: "Défendeur",
}
