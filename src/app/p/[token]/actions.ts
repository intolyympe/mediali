"use server"

import {
  creneauxLibres,
  enregistrerReponse,
  memeNom,
  trouverPartieParToken,
} from "@/lib/dossiers"

import { libelleCreneau } from "./dates"
import { normaliserTelephone, verifierCoordonnees } from "./validation"

// Server actions du parcours partie. Elles sont appelables par n'importe qui :
// chacune repart du token et revérifie tout (nom, déjà répondu, saisies).

const ERREUR_LIEN = "Ce lien ne fonctionne pas. Vérifiez le QR code sur votre courrier."
const ERREUR_DEJA_REPONDU = "Une réponse a déjà été envoyée pour ce dossier."
const ERREUR_NOM =
  "Ce nom ne correspond pas. Écrivez votre nom de famille comme sur le courrier reçu."

async function verifierAcces(token: string, nom: string) {
  const partie = await trouverPartieParToken(token)
  if (!partie?.dossier) return { erreur: ERREUR_LIEN } as const
  if (partie.confirme_le) return { erreur: ERREUR_DEJA_REPONDU } as const
  if (!memeNom(nom, partie.nom)) return { erreur: ERREUR_NOM } as const
  return { partie }
}

/** Étape 1 : vérifie le nom de famille. Ne renvoie aucune donnée de la partie. */
export async function verifierNom(token: string, nom: string) {
  const { erreur } = await verifierAcces(token, nom)
  return { erreur: erreur ?? null }
}

export type ReponseFormulaire = {
  nom: string
  telephone: string
  email: string
  consentement: boolean
  creneauIds: string[]
}

export type ResultatEnvoi =
  | { erreur: string }
  | { erreur: null; rdv: string | null }

/** Étape 4 : enregistre la réponse puis renvoie le rendez-vous s'il est fixé. */
export async function envoyerReponse(
  token: string,
  reponse: ReponseFormulaire
): Promise<ResultatEnvoi> {
  const acces = await verifierAcces(token, reponse.nom)
  if (acces.erreur) return { erreur: acces.erreur }
  const { partie } = acces

  const telephone = normaliserTelephone(reponse.telephone)
  const erreurs = verifierCoordonnees(reponse.telephone, reponse.email)
  if (!telephone || erreurs.telephone || erreurs.email) {
    return { erreur: "Vos coordonnées ne sont pas valides. Revenez à l'étape 2." }
  }
  if (reponse.consentement !== true) {
    return { erreur: "Vous devez donner votre accord à l'étape 3." }
  }

  // On ne garde que les créneaux encore libres du médiateur du dossier
  const libres = partie.dossier.mediateur_id
    ? await creneauxLibres(partie.dossier.mediateur_id)
    : []
  const idsLibres = new Set(libres.map((creneau) => creneau.id))
  const creneauIds = [...new Set(reponse.creneauIds)].filter((id) => idsLibres.has(id))

  try {
    // Le statut du dossier est recalculé par la base : rien d'autre à faire
    const dossier = await enregistrerReponse(
      partie.id,
      {
        rempli_par: "partie",
        consentement_rgpd: true,
        telephone,
        email: reponse.email.trim() || null,
      },
      creneauIds
    )
    return { erreur: null, rdv: dossier.rdv ? libelleCreneau(dossier.rdv) : null }
  } catch (erreur) {
    console.error("Enregistrement de la réponse d'une partie impossible :", erreur)
    return {
      erreur: "Votre réponse n'a pas pu être envoyée. Réessayez dans quelques minutes.",
    }
  }
}
