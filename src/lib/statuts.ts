import type { Enums, Tables } from "@/lib/supabase/database.types"

// Libellés français de toutes les valeurs d'enum de la base (modèle V2).
// Toujours afficher ces libellés, jamais la valeur technique.

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

export const LIBELLES_REMPLI_PAR: Record<Enums<"rempli_par">, string> = {
  partie: "La partie",
  avocat: "Son avocat",
}

export const LIBELLES_MODE: Record<Enums<"mode_amiable">, string> = {
  mediation: "Médiation",
  conciliation: "Conciliation",
}

export const LIBELLES_FONCTION: Record<Enums<"fonction_amiable">, string> = {
  mediateur: "Médiateur",
  conciliateur: "Conciliateur",
}

export const LIBELLES_CHOIX: Record<Enums<"choix_partie">, string> = {
  information: "Réunion d'information d'abord",
  accepte: "Accepte la médiation",
  refuse: "Refuse",
}

export const LIBELLES_PREF_FORMAT: Record<Enums<"preference_format">, string> = {
  ensemble: "Ensemble",
  separe: "Séparément",
  indifferent: "Indifférent",
}

export const LIBELLES_PREF_LIEU: Record<Enums<"preference_lieu">, string> = {
  presentiel: "En présentiel",
  distanciel: "À distance",
  indifferent: "Indifférent",
}

export const LIBELLES_RDV_FORMAT: Record<Enums<"format_rdv">, string> = {
  ensemble: "Ensemble",
  separe: "Séparément",
}

export const LIBELLES_RDV_LIEU: Record<Enums<"lieu_rdv">, string> = {
  presentiel: "En présentiel",
  distanciel: "À distance",
}

export const LIBELLES_ISSUE: Record<Enums<"issue_dossier">, string> = {
  en_cours: "En cours",
  accord_total: "Accord total",
  accord_partiel: "Accord partiel",
  echec: "Échec",
  carence: "Carence",
  refus: "Refus",
}

export const LIBELLES_ACTEUR: Record<Tables<"evenements">["acteur"], string> = {
  juridiction: "Juridiction",
  partie: "Partie",
  avocat: "Avocat",
  mediateur: "Médiateur",
  systeme: "Automatique",
}

const ORDRE_ROLE: Record<Enums<"role_partie">, number> = {
  demandeur: 0,
  defendeur: 1,
}

/**
 * Trie les parties d'un dossier : demandeurs d'abord, puis défendeurs.
 * Le tri est stable : l'ordre d'origine est gardé entre parties de même rôle.
 */
export function trierParties<T extends { role: Enums<"role_partie"> }>(parties: T[]) {
  return [...parties].sort((a, b) => ORDRE_ROLE[a.role] - ORDRE_ROLE[b.role])
}

/**
 * Une partie « a répondu » : même règle que la fonction SQL
 * recalculer_statut_dossier (confirmé avec consentement, ou refus).
 */
export function aRepondu(
  partie: Pick<Tables<"parties">, "confirme_le" | "consentement_rgpd"> & {
    choix?: Enums<"choix_partie"> | null
  }
) {
  return partie.confirme_le !== null && (partie.consentement_rgpd || partie.choix === "refuse")
}
