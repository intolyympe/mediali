import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

import { envoyerEmails, miseEnForme, vocabulaire, type Email } from "./envoyer"

const formatJour = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "full",
  timeZone: "Indian/Reunion",
})
const formatHeure = new Intl.DateTimeFormat("fr-FR", {
  timeStyle: "short",
  timeZone: "Indian/Reunion",
})

/**
 * Envoie l'e-mail de confirmation du rendez-vous à chaque partie (ou à son
 * avocat si passer_par_avocat est vrai) et au médiateur ou conciliateur.
 * Le vocabulaire suit dossiers.mode (médiation ou conciliation).
 *
 * Appelée par enregistrerReponse (src/lib/dossiers.ts) quand le dossier vient
 * de passer en rdv_fixe. Ne lève jamais d'erreur : un échec d'envoi ne doit
 * pas faire échouer la réponse de la partie, déjà enregistrée.
 */
export async function envoyerConfirmationsRdv(dossierId: string) {
  try {
    const supabase = createAdminClient()
    const { data: dossier, error } = await supabase
      .from("dossiers")
      .select(
        `numero_rg, mode, rdv_format, rdv_lieu,
         rdv:creneaux!dossiers_rdv_creneau_id_fkey(debut, fin),
         mediateur:mediateurs!dossiers_mediateur_id_fkey(nom, email, telephone),
         parties(nom, prenom, email, passer_par_avocat, avocat_email, choix)`
      )
      .eq("id", dossierId)
      .single()

    if (error) throw error
    if (!dossier.rdv) return

    const { numero_rg, mode, rdv_format, rdv_lieu, rdv, mediateur, parties } = dossier
    const mots = vocabulaire(mode)
    const date = formatJour.format(new Date(rdv.debut))
    const heure = `${formatHeure.format(new Date(rdv.debut))} – ${formatHeure.format(new Date(rdv.fin))}`
    const sujet = `Rendez-vous de ${mots.procedure} fixé – dossier n° ${numero_rg}`

    const lignesRdv = [
      `Dossier n° ${numero_rg}`,
      `Date : ${date}`,
      `Heure : ${heure} (heure de La Réunion)`,
      // Renseignés par le médiateur quand il confirme le rendez-vous
      ...(rdv_format ? [`Format : parties reçues ${rdv_format === "ensemble" ? "ensemble" : "séparément"}`] : []),
      ...(rdv_lieu ? [`Lieu : ${rdv_lieu === "presentiel" ? "en personne" : "à distance (visio ou téléphone)"}`] : []),
    ]
    const lignesMediateur = mediateur
      ? [
          `${mots.Tiers} : ${mediateur.nom}`,
          `Contact : ${[mediateur.email, mediateur.telephone].filter(Boolean).join(" – ")}`,
        ]
      : []

    const emails: Email[] = []

    for (const partie of parties) {
      // Une partie qui a refusé ne participe pas au rendez-vous
      if (partie.choix === "refuse") continue

      const viaAvocat = partie.passer_par_avocat && partie.avocat_email
      const destinataire = viaAvocat ? partie.avocat_email : (partie.email ?? partie.avocat_email)
      if (!destinataire) continue

      const introduction = viaAvocat
        ? `Le premier rendez-vous de ${mots.procedure} de votre client, ${partie.prenom} ${partie.nom}, est fixé.`
        : `Votre premier rendez-vous de ${mots.procedure} est fixé.`

      emails.push({
        a: destinataire,
        sujet,
        texte: miseEnForme(
          [
            "Bonjour,",
            "",
            introduction,
            "",
            ...lignesRdv,
            ...lignesMediateur,
            "",
            `En cas d'empêchement, contactez le ${mots.tiers} au plus tôt.`,
          ].join("\n"),
          mode
        ),
      })
    }

    if (mediateur?.email) {
      emails.push({
        a: mediateur.email,
        sujet,
        texte: miseEnForme(
          [
            "Bonjour,",
            "",
            "Toutes les parties ont répondu et un premier rendez-vous a été fixé automatiquement.",
            "",
            ...lignesRdv,
            "",
            "Les coordonnées des parties sont disponibles dans votre espace Médiali.",
          ].join("\n"),
          mode
        ),
      })
    }

    await envoyerEmails(emails)
  } catch (erreur) {
    console.error(`Confirmation du rendez-vous non envoyée (dossier ${dossierId}) :`, erreur)
  }
}
