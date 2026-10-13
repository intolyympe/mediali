import { aRepondu, LIBELLES_CHOIX } from "@/lib/statuts"
import type { Enums, Tables } from "@/lib/supabase/database.types"

// Requête commune au rendu serveur et au rechargement temps réel du tableau de bord.
export const SELECT_DOSSIERS =
  "id, numero_rg, date_ordonnance, mode, statut, issue, mediateur_id, co_mediateur_id, parties(id, role, nom, prenom, consentement_rgpd, confirme_le, rempli_par, choix)"

type PartieTableau = Pick<
  Tables<"parties">,
  "id" | "role" | "nom" | "prenom" | "consentement_rgpd" | "confirme_le" | "rempli_par" | "choix"
>

export type DossierTableau = Pick<
  Tables<"dossiers">,
  "id" | "numero_rg" | "date_ordonnance" | "mode" | "statut" | "issue" | "mediateur_id" | "co_mediateur_id"
> & { parties: PartieTableau[] }

/** Filtre Supabase : dossiers où l'intervenant est principal ou co-médiateur. */
export const filtreIntervenant = (mediateurId: string) =>
  `mediateur_id.eq.${mediateurId},co_mediateur_id.eq.${mediateurId}`

const JOUR_MS = 24 * 60 * 60 * 1000

// Même règle que la base : une partie qui a refusé a aussi répondu
export const estConfirmee = aRepondu

export function joursDepuis(dateOrdonnance: string, maintenant: number) {
  return Math.floor((maintenant - new Date(dateOrdonnance).getTime()) / JOUR_MS)
}

// Plus de 7 jours après l'ordonnance sans que toutes les parties aient répondu
export function estEnRetard(dossier: DossierTableau, maintenant: number) {
  const incomplet =
    dossier.statut === "en_attente" || dossier.statut === "partiellement_joignable"
  return dossier.issue === "en_cours" && incomplet && joursDepuis(dossier.date_ordonnance, maintenant) > 7
}

// Délai moyen (en jours) entre l'ordonnance et la dernière réponse, pour les
// dossiers dont toutes les parties ont répondu. null si aucun.
export function delaiMoyenConfirmation(dossiers: DossierTableau[]) {
  const delais = dossiers
    .filter((d) => d.parties.length > 0 && d.parties.every(estConfirmee))
    .map((d) => {
      const derniere = Math.max(...d.parties.map((p) => new Date(p.confirme_le!).getTime()))
      return (derniere - new Date(d.date_ordonnance).getTime()) / JOUR_MS
    })
  if (delais.length === 0) return null
  return delais.reduce((a, b) => a + b, 0) / delais.length
}

/** Vocabulaire selon le mode du dossier. */
export function mots(mode: Enums<"mode_amiable">) {
  return mode === "conciliation"
    ? { procedure: "conciliation", tiers: "conciliateur", coTiers: "Co-conciliation" }
    : { procedure: "médiation", tiers: "médiateur", coTiers: "Co-médiation" }
}

/** Choix d'une partie, « Accepte la conciliation » en conciliation. */
export function libelleChoix(
  partie: Pick<PartieTableau, "choix" | "confirme_le" | "consentement_rgpd">,
  mode: Enums<"mode_amiable">
) {
  if (!aRepondu(partie)) return "Sans réponse"
  if (!partie.choix) return "A répondu"
  if (partie.choix === "accepte") return `Accepte la ${mots(mode).procedure}`
  return LIBELLES_CHOIX[partie.choix]
}
