import "server-only"

import { connection } from "next/server"

import { envoyerConfirmationsRdv } from "@/lib/emails/confirmation-rdv"
import { createAdminClient } from "@/lib/supabase/admin"
import type { TablesUpdate } from "@/lib/supabase/database.types"

// Fonctions partagées des parcours publics (partie : src/app/p/[token],
// avocat : src/app/p/[token]/avocat). Elles utilisent la clé service_role :
// à appeler uniquement depuis des Server Components ou des server actions,
// toujours à partir du token du QR code.
//
// Le statut du dossier et la réservation du premier créneau commun sont
// recalculés AUTOMATIQUEMENT par la base (trigger SQL, voir
// supabase/migrations/20261012000000_schema_initial.sql). Aucune fonction de
// recalcul n'est à appeler depuis le code.
//
// Les fonctions de lecture commencent par `await connection()` : elles sont
// utilisables dans une page (dans un <Suspense>) sans erreur de prérendu.

/**
 * Retrouve une partie et son dossier à partir du token du QR code.
 * Renvoie null si le token est inconnu.
 */
export async function trouverPartieParToken(token: string) {
  await connection()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("parties")
    .select("*, dossier:dossiers(id, numero_rg, juridiction, mode, mediateur_id, statut, cloture_le)")
    .eq("token", token)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Compare deux noms sans tenir compte des majuscules, des accents, des espaces,
 * des tirets ni des apostrophes : memeNom("Rivière", "RIVIERE") === true.
 */
export function memeNom(saisi: string, attendu: string) {
  const normaliser = (nom: string) =>
    nom
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z]/g, "")

  return normaliser(saisi) !== "" && normaliser(saisi) === normaliser(attendu)
}

/**
 * Créneaux à venir d'un médiateur, pas encore réservés par un dossier,
 * triés par date. À proposer aux parties à l'étape « Disponibilités ».
 */
export async function creneauxLibres(mediateurId: string) {
  await connection()
  const supabase = createAdminClient()
  const [creneaux, reserves] = await Promise.all([
    supabase
      .from("creneaux")
      .select("id, debut, fin")
      .eq("mediateur_id", mediateurId)
      .gt("debut", new Date().toISOString())
      .order("debut"),
    supabase.from("dossiers").select("rdv_creneau_id").not("rdv_creneau_id", "is", null),
  ])

  if (creneaux.error) throw creneaux.error
  if (reserves.error) throw reserves.error

  const idsReserves = new Set(reserves.data.map((d) => d.rdv_creneau_id))
  return creneaux.data.filter((creneau) => !idsReserves.has(creneau.id))
}

/**
 * Relit un dossier après une réponse : statut à jour et rendez-vous s'il est
 * fixé (null sinon).
 */
export async function relireDossier(dossierId: string) {
  await connection()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("dossiers")
    .select("id, numero_rg, statut, rdv:creneaux!dossiers_rdv_creneau_id_fkey(debut, fin)")
    .eq("id", dossierId)
    .single()

  if (error) throw error
  return data
}

export type DossierRelu = Awaited<ReturnType<typeof relireDossier>>

/**
 * Champs qu'une partie ou son avocat peut renseigner. Le consentement RGPD est
 * obligatoire, sauf si la partie refuse (choix = "refuse").
 */
export type ReponsePartie = Pick<
  TablesUpdate<"parties">,
  | "telephone"
  | "telephone_2"
  | "email"
  | "email_2"
  | "adresse"
  | "pref_format"
  | "pref_lieu"
  | "passer_par_avocat"
  | "avocat_nom"
  | "avocat_email"
  | "avocat_telephone"
  | "avocat_barreau"
> & {
  rempli_par: "partie" | "avocat"
} & (
    | { choix?: "information" | "accepte" | null; consentement_rgpd: true }
    | { choix: "refuse"; consentement_rgpd?: boolean }
  )

/**
 * Enregistre la réponse d'une partie (ou de son avocat) : disponibilités,
 * coordonnées, consentement et date de confirmation. Puis relit le dossier.
 *
 * Les disponibilités sont enregistrées AVANT la confirmation de la partie :
 * ainsi le dossier ne change de statut qu'une seule fois (utile pour le
 * temps réel du tableau de bord médiateur).
 *
 * Lève une erreur si la partie a déjà répondu ou si le dossier est clôturé :
 * vérifier `confirme_le` et `dossier.cloture_le` avant.
 */
export async function enregistrerReponse(
  partieId: string,
  reponse: ReponsePartie,
  creneauIds: string[]
): Promise<DossierRelu> {
  const supabase = createAdminClient()

  const { data: partie, error: erreurLecture } = await supabase
    .from("parties")
    .select("dossier_id, confirme_le, dossier:dossiers(cloture_le)")
    .eq("id", partieId)
    .single()

  if (erreurLecture) throw erreurLecture
  if (partie.confirme_le) throw new Error("Cette partie a déjà répondu.")
  if (partie.dossier?.cloture_le) throw new Error("Ce dossier est clôturé.")

  const { error: erreurSuppression } = await supabase
    .from("disponibilites")
    .delete()
    .eq("partie_id", partieId)
  if (erreurSuppression) throw erreurSuppression

  if (creneauIds.length > 0) {
    const { error: erreurDisponibilites } = await supabase
      .from("disponibilites")
      .insert(creneauIds.map((creneauId) => ({ partie_id: partieId, creneau_id: creneauId })))
    if (erreurDisponibilites) throw erreurDisponibilites
  }

  const { error: erreurPartie } = await supabase
    .from("parties")
    .update({ ...reponse, confirme_le: new Date().toISOString() })
    .eq("id", partieId)
  if (erreurPartie) throw erreurPartie

  const dossier = await relireDossier(partie.dossier_id)

  // Le rendez-vous vient d'être fixé par cette réponse : e-mails de
  // confirmation aux parties (ou à leur avocat) et au médiateur. Ne lève jamais.
  if (dossier.statut === "rdv_fixe") {
    await envoyerConfirmationsRdv(dossier.id)
  }

  return dossier
}
