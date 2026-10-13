"use server"

import {
  creneauxLibres,
  enregistrerReponse,
  memeNom,
  trouverPartieParToken,
} from "@/lib/dossiers"
import type { Enums } from "@/lib/supabase/database.types"

import { libelleCreneau } from "./dates"
import { normaliserTelephone, verifierCoordonnees, type Coordonnees } from "./validation"

// Server actions du parcours partie. Elles sont appelables par n'importe qui :
// chacune repart du token et revérifie tout (nom, déjà répondu, saisies).
// Le statut du dossier et la timeline sont mis à jour par la base.

const ERREUR_LIEN = "Ce lien ne fonctionne pas. Vérifiez le QR code sur votre courrier."
const ERREUR_DEJA_REPONDU = "Une réponse a déjà été envoyée pour ce dossier."
const ERREUR_NOM =
  "Ce nom ne correspond pas. Écrivez votre nom de famille comme sur le courrier reçu."
const ERREUR_CLOS = "Ce dossier est clôturé : il n'est plus possible de répondre."
const ERREUR_ENVOI = "Votre réponse n'a pas pu être envoyée. Réessayez dans quelques minutes."

const FORMATS: Enums<"preference_format">[] = ["ensemble", "separe", "indifferent"]
const LIEUX: Enums<"preference_lieu">[] = ["presentiel", "distanciel", "indifferent"]

async function verifierAcces(token: string, nom: string) {
  const partie = await trouverPartieParToken(token)
  if (!partie?.dossier) return { erreur: ERREUR_LIEN } as const
  if (partie.confirme_le) return { erreur: ERREUR_DEJA_REPONDU } as const
  if (partie.dossier.cloture_le) return { erreur: ERREUR_CLOS } as const
  if (typeof nom !== "string" || !memeNom(nom, partie.nom)) return { erreur: ERREUR_NOM } as const
  return { partie }
}

/** Étape 1 : vérifie le nom de famille. Ne renvoie aucune donnée de la partie. */
export async function verifierNom(token: string, nom: string) {
  const { erreur } = await verifierAcces(token, nom)
  return { erreur: erreur ?? null }
}

export type ResultatEnvoi = { erreur: string } | { erreur: null; rdv: string | null }

/** Refus : enregistré sans coordonnées ni consentement. Le juge en sera informé. */
export async function envoyerRefus(token: string, nom: string): Promise<ResultatEnvoi> {
  const acces = await verifierAcces(token, nom)
  if (acces.erreur) return { erreur: acces.erreur }

  try {
    await enregistrerReponse(acces.partie.id, { rempli_par: "partie", choix: "refuse" }, [])
    return { erreur: null, rdv: null }
  } catch (erreur) {
    console.error("Enregistrement du refus d'une partie impossible :", erreur)
    return { erreur: ERREUR_ENVOI }
  }
}

export type ReponseFormulaire = Coordonnees & {
  nom: string
  choix: "information" | "accepte"
  consentement: boolean
  pref_format: Enums<"preference_format">
  pref_lieu: Enums<"preference_lieu">
  creneauIds: string[]
}

/** Dernière étape : enregistre la réponse puis renvoie le rendez-vous s'il est fixé. */
export async function envoyerReponse(
  token: string,
  reponse: ReponseFormulaire
): Promise<ResultatEnvoi> {
  const acces = await verifierAcces(token, reponse?.nom)
  if (acces.erreur) return { erreur: acces.erreur }
  const { partie } = acces

  if (reponse.choix !== "information" && reponse.choix !== "accepte") {
    return { erreur: "Indiquez ce que vous souhaitez à l'étape 2." }
  }
  const coordonnees: Coordonnees = {
    telephone: String(reponse.telephone ?? ""),
    email: String(reponse.email ?? ""),
    telephone_2: String(reponse.telephone_2 ?? ""),
    email_2: String(reponse.email_2 ?? ""),
    adresse: String(reponse.adresse ?? ""),
  }
  if (Object.keys(verifierCoordonnees(coordonnees)).length > 0) {
    return { erreur: "Vos coordonnées ne sont pas valides. Revenez à l'étape 3." }
  }
  if (reponse.consentement !== true) {
    return { erreur: "Vous devez donner votre accord à l'étape 4." }
  }
  if (!FORMATS.includes(reponse.pref_format) || !LIEUX.includes(reponse.pref_lieu)) {
    return { erreur: "Répondez aux deux questions de l'étape 5." }
  }

  // On ne garde que les créneaux encore libres du médiateur du dossier
  const libres = partie.dossier.mediateur_id ? await creneauxLibres(partie.dossier.mediateur_id) : []
  const idsLibres = new Set(libres.map((creneau) => creneau.id))
  const creneauIds = [...new Set(Array.isArray(reponse.creneauIds) ? reponse.creneauIds : [])].filter(
    (id) => idsLibres.has(id)
  )

  try {
    const dossier = await enregistrerReponse(
      partie.id,
      {
        rempli_par: "partie",
        choix: reponse.choix,
        consentement_rgpd: true,
        telephone: normaliserTelephone(coordonnees.telephone),
        email: coordonnees.email.trim() || null,
        telephone_2: normaliserTelephone(coordonnees.telephone_2),
        email_2: coordonnees.email_2.trim() || null,
        adresse: coordonnees.adresse.trim() || null,
        pref_format: reponse.pref_format,
        pref_lieu: reponse.pref_lieu,
      },
      creneauIds
    )
    return { erreur: null, rdv: dossier.rdv ? libelleCreneau(dossier.rdv) : null }
  } catch (erreur) {
    console.error("Enregistrement de la réponse d'une partie impossible :", erreur)
    return { erreur: ERREUR_ENVOI }
  }
}
