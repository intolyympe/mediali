import type { Enums, Tables } from "@/lib/supabase/database.types"

// Requête commune au rendu serveur et au rechargement temps réel du tableau de bord.
export const SELECT_DOSSIERS =
  "id, numero_rg, date_ordonnance, statut, parties(id, role, consentement_rgpd, confirme_le, rempli_par)"

type PartieTableau = Pick<
  Tables<"parties">,
  "id" | "role" | "consentement_rgpd" | "confirme_le" | "rempli_par"
>

export type DossierTableau = Pick<
  Tables<"dossiers">,
  "id" | "numero_rg" | "date_ordonnance" | "statut"
> & { parties: PartieTableau[] }

// Gris, orange, bleu, vert
export const COULEURS_STATUT: Record<Enums<"statut_dossier">, string> = {
  en_attente: "bg-zinc-200 text-zinc-800",
  partiellement_joignable: "bg-orange-100 text-orange-800",
  joignable: "bg-blue-100 text-blue-800",
  rdv_fixe: "bg-green-100 text-green-800",
}

const JOUR_MS = 24 * 60 * 60 * 1000

export function estConfirmee(partie: Pick<PartieTableau, "consentement_rgpd" | "confirme_le">) {
  return partie.consentement_rgpd && partie.confirme_le !== null
}

export function joursDepuis(dateOrdonnance: string, maintenant: number) {
  return Math.floor((maintenant - new Date(dateOrdonnance).getTime()) / JOUR_MS)
}

// Plus de 7 jours après l'ordonnance sans que les deux parties aient confirmé
export function estEnRetard(dossier: DossierTableau, maintenant: number) {
  const incomplet =
    dossier.statut === "en_attente" || dossier.statut === "partiellement_joignable"
  return incomplet && joursDepuis(dossier.date_ordonnance, maintenant) > 7
}

// Délai moyen (en jours) entre l'ordonnance et la dernière confirmation, pour
// les dossiers dont toutes les parties ont confirmé. null si aucun.
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
