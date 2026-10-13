// Validation du parcours avocat, partagée entre le formulaire (navigateur) et
// la server action (serveur).

import { normaliserTelephone } from "../validation"

export const BARREAUX = [
  "Saint-Denis de La Réunion",
  "Mayotte",
  "Paris",
  "Marseille",
  "Lyon",
  "Bordeaux",
  "Toulouse",
  "Montpellier",
  "Nantes",
  "Lille",
  "Autre barreau",
]

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** « 26 / 00123 » et « 26/00123 » sont le même numéro RG. */
export function memeNumeroRg(saisi: string, attendu: string) {
  const normaliser = (rg: string) => rg.toLowerCase().replace(/[^0-9a-z]/g, "")
  return normaliser(saisi) !== "" && normaliser(saisi) === normaliser(attendu)
}

export type SaisieAvocat = {
  nom: string
  email: string
  telephone: string
  barreau: string
}

export type ErreursAvocat = Partial<Record<keyof SaisieAvocat, string>>

/** Tous les champs de l'avocat sont obligatoires. */
export function verifierAvocat(avocat: SaisieAvocat) {
  const erreurs: ErreursAvocat = {}

  if (!avocat.nom.trim()) erreurs.nom = "Indiquez votre nom."

  if (!avocat.email.trim()) {
    erreurs.email = "Indiquez votre adresse e-mail."
  } else if (!EMAIL.test(avocat.email.trim())) {
    erreurs.email = "Cette adresse e-mail n'est pas valide. Exemple : nom@exemple.fr."
  }

  if (!avocat.telephone.trim()) {
    erreurs.telephone = "Indiquez votre numéro de téléphone."
  } else if (!normaliserTelephone(avocat.telephone)) {
    erreurs.telephone = "Ce numéro n'est pas valide. Exemple : 0262 12 34 56."
  }

  if (!BARREAUX.includes(avocat.barreau)) erreurs.barreau = "Choisissez votre barreau."

  return erreurs
}

export type SaisieClient = {
  telephone: string
  email: string
  passerParAvocat: boolean
}

export type ErreursClient = { telephone?: string; email?: string }

/**
 * Le téléphone du client est obligatoire, sauf si le médiateur doit passer par
 * l'avocat. L'e-mail est toujours facultatif.
 */
export function verifierClient(client: SaisieClient) {
  const erreurs: ErreursClient = {}

  if (!client.telephone.trim()) {
    if (!client.passerParAvocat) {
      erreurs.telephone =
        "Indiquez le téléphone de votre client, ou cochez la case ci-dessous."
    }
  } else if (!normaliserTelephone(client.telephone)) {
    erreurs.telephone = "Ce numéro n'est pas valide. Exemple : 0692 12 34 56."
  }

  if (client.email.trim() && !EMAIL.test(client.email.trim())) {
    erreurs.email = "Cette adresse e-mail n'est pas valide. Exemple : nom@exemple.fr."
  }

  return erreurs
}
