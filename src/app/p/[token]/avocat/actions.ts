"use server"

import {
  creneauxLibres,
  enregistrerReponse,
  memeNom,
  trouverPartieParToken,
} from "@/lib/dossiers"

import { libelleCreneau } from "../dates"
import { normaliserTelephone } from "../validation"
import {
  memeNumeroRg,
  verifierAvocat,
  verifierClient,
  type SaisieAvocat,
  type SaisieClient,
} from "./validation"

// Server actions du parcours avocat. Elles sont appelables par n'importe qui :
// chacune repart du token et revérifie tout (numéro RG, nom, déjà répondu, saisies).

const ERREUR_LIEN = "Ce lien ne fonctionne pas. Vérifiez le QR code de la notification."
const ERREUR_DEJA_REPONDU = "Une réponse a déjà été transmise pour ce dossier."
const ERREUR_IDENTIFICATION =
  "Le numéro de dossier ou le nom du client ne correspond pas. Vérifiez la notification."

type Identification = { numeroRg: string; nomClient: string }

async function verifierAcces(token: string, { numeroRg, nomClient }: Identification) {
  const partie = await trouverPartieParToken(token)
  if (!partie?.dossier) return { erreur: ERREUR_LIEN } as const
  if (partie.confirme_le) return { erreur: ERREUR_DEJA_REPONDU } as const
  // Un seul message pour les deux champs : on ne dit pas lequel est faux
  if (!memeNumeroRg(numeroRg, partie.dossier.numero_rg) || !memeNom(nomClient, partie.nom)) {
    return { erreur: ERREUR_IDENTIFICATION } as const
  }
  return { partie }
}

/**
 * Étape 1 : vérifie le numéro RG et le nom du client. Renvoie leur orthographe
 * officielle (déjà connue de l'avocat) pour le récapitulatif.
 */
export async function verifierDossier(token: string, identification: Identification) {
  const acces = await verifierAcces(token, identification)
  if (acces.erreur) return { erreur: acces.erreur, numeroRg: null, nomClient: null }
  const { partie } = acces
  return { erreur: null, numeroRg: partie.dossier.numero_rg, nomClient: partie.nom }
}

export type ReponseAvocat = Identification & {
  avocat: SaisieAvocat
  client: SaisieClient
  consentement: boolean
  creneauIds: string[]
}

export type ResultatEnvoi =
  | { erreur: string }
  | { erreur: null; rdv: string | null }

/** Étape 5 : enregistre la réponse puis renvoie le rendez-vous s'il est fixé. */
export async function envoyerReponseAvocat(
  token: string,
  reponse: ReponseAvocat
): Promise<ResultatEnvoi> {
  const acces = await verifierAcces(token, reponse)
  if (acces.erreur) return { erreur: acces.erreur }
  const { partie } = acces

  const erreursAvocat = verifierAvocat(reponse.avocat)
  if (Object.keys(erreursAvocat).length > 0) {
    return { erreur: "Vos coordonnées ne sont pas valides. Revenez à l'étape 2." }
  }
  const erreursClient = verifierClient(reponse.client)
  if (Object.keys(erreursClient).length > 0) {
    return { erreur: "Les coordonnées du client ne sont pas valides. Revenez à l'étape 3." }
  }
  if (reponse.consentement !== true) {
    return { erreur: "Vous devez cocher la case de l'étape 4." }
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
        rempli_par: "avocat",
        consentement_rgpd: true,
        avocat_nom: reponse.avocat.nom.trim(),
        avocat_email: reponse.avocat.email.trim(),
        avocat_telephone: normaliserTelephone(reponse.avocat.telephone),
        avocat_barreau: reponse.avocat.barreau,
        passer_par_avocat: reponse.client.passerParAvocat,
        telephone: normaliserTelephone(reponse.client.telephone),
        email: reponse.client.email.trim() || null,
      },
      creneauIds
    )
    return { erreur: null, rdv: dossier.rdv ? libelleCreneau(dossier.rdv) : null }
  } catch (erreur) {
    console.error("Enregistrement de la réponse d'un avocat impossible :", erreur)
    return {
      erreur: "Votre réponse n'a pas pu être envoyée. Réessayez dans quelques minutes.",
    }
  }
}
