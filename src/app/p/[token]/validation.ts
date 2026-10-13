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

export type Coordonnees = {
  telephone: string
  email: string
  telephone_2: string
  email_2: string
  adresse: string
}

export type ErreursCoordonnees = Partial<Record<keyof Coordonnees | "general", string>>

const ADRESSE_MAX = 300

/**
 * Au moins un téléphone ou une adresse e-mail. Les autres moyens de contact
 * sont facultatifs mais vérifiés s'ils sont remplis.
 */
export function verifierCoordonnees(coordonnees: Coordonnees) {
  const erreurs: ErreursCoordonnees = {}
  const telephoneInvalide = (valeur: string) => valeur.trim() !== "" && !normaliserTelephone(valeur)
  const emailInvalide = (valeur: string) => valeur.trim() !== "" && !EMAIL.test(valeur.trim())

  if (!coordonnees.telephone.trim() && !coordonnees.email.trim()) {
    erreurs.general = "Indiquez au moins un numéro de téléphone ou une adresse e-mail."
  }
  if (telephoneInvalide(coordonnees.telephone)) {
    erreurs.telephone = "Ce numéro n'est pas valide. Exemple : 0692 12 34 56."
  }
  if (emailInvalide(coordonnees.email)) {
    erreurs.email = "Cette adresse e-mail n'est pas valide. Exemple : nom@exemple.fr."
  }
  if (telephoneInvalide(coordonnees.telephone_2)) {
    erreurs.telephone_2 = "Ce numéro n'est pas valide. Exemple : 0262 12 34 56."
  }
  if (emailInvalide(coordonnees.email_2)) {
    erreurs.email_2 = "Cette adresse e-mail n'est pas valide. Exemple : nom@exemple.fr."
  }
  if (coordonnees.adresse.trim().length > ADRESSE_MAX) {
    erreurs.adresse = "Cette adresse est trop longue."
  }

  return erreurs
}
