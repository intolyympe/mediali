"use server"

import {
  creneauxLibres,
  enregistrerReponse,
  memeNom,
  trouverPartieParToken,
} from "@/lib/dossiers"
import type { Enums } from "@/lib/supabase/database.types"

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
// Le statut du dossier et la timeline sont mis à jour par la base.

const ERREUR_LIEN = "Ce lien ne fonctionne pas. Vérifiez le QR code de la notification."
const ERREUR_DEJA_REPONDU = "Une réponse a déjà été transmise pour ce dossier."
const ERREUR_IDENTIFICATION =
  "Le numéro de dossier ou le nom du client ne correspond pas. Vérifiez la notification."
const ERREUR_CLOS = "Ce dossier est clôturé : il n'est plus possible de répondre."
const ERREUR_ENVOI = "La réponse n'a pas pu être envoyée. Réessayez dans quelques minutes."

const FORMATS: Enums<"preference_format">[] = ["ensemble", "separe", "indifferent"]
const LIEUX: Enums<"preference_lieu">[] = ["presentiel", "distanciel", "indifferent"]

type Identification = { numeroRg: string; nomClient: string }

async function verifierAcces(token: string, identification: Identification) {
  const partie = await trouverPartieParToken(token)
  if (!partie?.dossier) return { erreur: ERREUR_LIEN } as const
  if (partie.confirme_le) return { erreur: ERREUR_DEJA_REPONDU } as const
  if (partie.dossier.cloture_le) return { erreur: ERREUR_CLOS } as const
  const { numeroRg, nomClient } = identification ?? {}
  // Un seul message pour les deux champs : on ne dit pas lequel est faux
  if (
    typeof numeroRg !== "string" ||
    typeof nomClient !== "string" ||
    !memeNumeroRg(numeroRg, partie.dossier.numero_rg) ||
    !memeNom(nomClient, partie.nom)
  ) {
    return { erreur: ERREUR_IDENTIFICATION } as const
  }
  return { partie }
}

/** Champs « avocat » communs à la réponse et au refus, normalisés. */
function champsAvocat(avocat: SaisieAvocat) {
  return {
    avocat_nom: avocat.nom.trim(),
    avocat_email: avocat.email.trim(),
    avocat_telephone: normaliserTelephone(avocat.telephone),
    avocat_barreau: avocat.barreau,
  }
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

export type ResultatEnvoi = { erreur: string } | { erreur: null; rdv: string | null }

/** Le client refuse : enregistré avec l'identité de l'avocat, sans disponibilités. */
export async function envoyerRefusAvocat(
  token: string,
  reponse: Identification & { avocat: SaisieAvocat }
): Promise<ResultatEnvoi> {
  const acces = await verifierAcces(token, reponse)
  if (acces.erreur) return { erreur: acces.erreur }
  if (!reponse.avocat || Object.keys(verifierAvocat(reponse.avocat)).length > 0) {
    return { erreur: "Vos coordonnées ne sont pas valides. Revenez à l'étape 2." }
  }

  try {
    await enregistrerReponse(
      acces.partie.id,
      { rempli_par: "avocat", choix: "refuse", ...champsAvocat(reponse.avocat) },
      []
    )
    return { erreur: null, rdv: null }
  } catch (erreur) {
    console.error("Enregistrement du refus transmis par un avocat impossible :", erreur)
    return { erreur: ERREUR_ENVOI }
  }
}

export type ReponseAvocat = Identification & {
  avocat: SaisieAvocat
  choix: "information" | "accepte"
  client: SaisieClient
  consentement: boolean
  pref_format: Enums<"preference_format">
  pref_lieu: Enums<"preference_lieu">
  creneauIds: string[]
}

/** Dernière étape : enregistre la réponse puis renvoie le rendez-vous s'il est fixé. */
export async function envoyerReponseAvocat(
  token: string,
  reponse: ReponseAvocat
): Promise<ResultatEnvoi> {
  const acces = await verifierAcces(token, reponse)
  if (acces.erreur) return { erreur: acces.erreur }
  const { partie } = acces

  if (!reponse.avocat || Object.keys(verifierAvocat(reponse.avocat)).length > 0) {
    return { erreur: "Vos coordonnées ne sont pas valides. Revenez à l'étape 2." }
  }
  if (reponse.choix !== "information" && reponse.choix !== "accepte") {
    return { erreur: "Indiquez la position de votre client à l'étape 3." }
  }
  const client: SaisieClient = {
    telephone: String(reponse.client?.telephone ?? ""),
    email: String(reponse.client?.email ?? ""),
    telephone_2: String(reponse.client?.telephone_2 ?? ""),
    email_2: String(reponse.client?.email_2 ?? ""),
    adresse: String(reponse.client?.adresse ?? ""),
    passerParAvocat: reponse.client?.passerParAvocat === true,
  }
  if (Object.keys(verifierClient(client)).length > 0) {
    return { erreur: "Les coordonnées du client ne sont pas valides. Revenez à l'étape 4." }
  }
  if (reponse.consentement !== true) {
    return { erreur: "Vous devez cocher la case de l'étape 5." }
  }
  if (!FORMATS.includes(reponse.pref_format) || !LIEUX.includes(reponse.pref_lieu)) {
    return { erreur: "Répondez aux deux questions de l'étape 6." }
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
        rempli_par: "avocat",
        choix: reponse.choix,
        consentement_rgpd: true,
        ...champsAvocat(reponse.avocat),
        passer_par_avocat: client.passerParAvocat,
        telephone: normaliserTelephone(client.telephone),
        email: client.email.trim() || null,
        telephone_2: normaliserTelephone(client.telephone_2),
        email_2: client.email_2.trim() || null,
        adresse: client.adresse.trim() || null,
        pref_format: reponse.pref_format,
        pref_lieu: reponse.pref_lieu,
      },
      creneauIds
    )
    return { erreur: null, rdv: dossier.rdv ? libelleCreneau(dossier.rdv) : null }
  } catch (erreur) {
    console.error("Enregistrement de la réponse d'un avocat impossible :", erreur)
    return { erreur: ERREUR_ENVOI }
  }
}
