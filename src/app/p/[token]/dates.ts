// Affichage des dates en heure de La Réunion.

const FUSEAU = "Indian/Reunion"

const formatJour = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: FUSEAU,
})

const formatHeure = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: FUSEAU,
})

function libelleJour(date: string) {
  const jour = formatJour.format(new Date(date))
  return jour.charAt(0).toUpperCase() + jour.slice(1)
}

function libelleHeures(debut: string, fin: string) {
  return `de ${formatHeure.format(new Date(debut))} à ${formatHeure.format(new Date(fin))}`
}

/** « Lundi 14 octobre, de 09:00 à 12:00 » */
export function libelleCreneau(creneau: { debut: string; fin: string }) {
  return `${libelleJour(creneau.debut)}, ${libelleHeures(creneau.debut, creneau.fin)}`
}

export type JourCreneaux = {
  jour: string
  creneaux: { id: string; heures: string; libelle: string }[]
}

/** Regroupe des créneaux (déjà triés) par jour. */
export function grouperParJour(creneaux: { id: string; debut: string; fin: string }[]) {
  const jours: JourCreneaux[] = []

  for (const creneau of creneaux) {
    const jour = libelleJour(creneau.debut)
    if (jours.at(-1)?.jour !== jour) jours.push({ jour, creneaux: [] })
    jours.at(-1)!.creneaux.push({
      id: creneau.id,
      heures: libelleHeures(creneau.debut, creneau.fin),
      libelle: libelleCreneau(creneau),
    })
  }

  return jours
}
