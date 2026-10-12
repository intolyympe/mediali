// Validation des coordonnées, partagée entre le formulaire (navigateur) et la
// server action (serveur).

/** Garde uniquement les chiffres et le « + » initial : « 0692 12.34-56 » → « 0692123456 ». */
function nettoyerTelephone(saisi: string) {
  return saisi.trim().replace(/[\s.\-()]/g, "")
}

// Numéros français et réunionnais : 0692123456, 0262123456, +262692123456,
// +33612345678, 00262…, 0033…
const TELEPHONE = /^(?:0|\+33|0033|\+262|00262)([1-9]\d{8})$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Met un numéro valide au format national à 10 chiffres, en paires :
 * « +262 692 12 34 56 » → « 06 92 12 34 56 ». Renvoie null si invalide.
 */
export function normaliserTelephone(saisi: string) {
  const correspondance = nettoyerTelephone(saisi).match(TELEPHONE)
  if (!correspondance) return null
  return `0${correspondance[1]}`.replace(/(\d{2})(?=\d)/g, "$1 ")
}

export type ErreursCoordonnees = { telephone?: string; email?: string }

/** Le téléphone est obligatoire, l'e-mail facultatif. */
export function verifierCoordonnees(telephone: string, email: string) {
  const erreurs: ErreursCoordonnees = {}

  if (!telephone.trim()) {
    erreurs.telephone = "Indiquez votre numéro de téléphone."
  } else if (!normaliserTelephone(telephone)) {
    erreurs.telephone = "Ce numéro n'est pas valide. Exemple : 0692 12 34 56."
  }

  if (email.trim() && !EMAIL.test(email.trim())) {
    erreurs.email = "Cette adresse e-mail n'est pas valide. Exemple : nom@exemple.fr."
  }

  return erreurs
}
