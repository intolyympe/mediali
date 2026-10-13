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

const ORDRE_ROLE: Record<Enums<"role_partie">, number> = {
  demandeur: 0,
  defendeur: 1,
}

/** Trie les parties d'un dossier : demandeur d'abord, puis défendeur. */
export function trierParties<T extends { role: Enums<"role_partie"> }>(parties: T[]) {
  return [...parties].sort((a, b) => ORDRE_ROLE[a.role] - ORDRE_ROLE[b.role])
}
