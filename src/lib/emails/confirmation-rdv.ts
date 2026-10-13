import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

import { envoyerEmails, miseEnForme, type Email } from "./envoyer"

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
 * avocat si passer_par_avocat est vrai) et au médiateur.
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
        `numero_rg,
         rdv:creneaux!dossiers_rdv_creneau_id_fkey(debut, fin),
         mediateur:mediateurs(nom, email, telephone),
         parties(nom, prenom, email, passer_par_avocat, avocat_email)`
      )
      .eq("id", dossierId)
      .single()

    if (error) throw error
    if (!dossier.rdv) return

    const { numero_rg, rdv, mediateur, parties } = dossier
    const date = formatJour.format(new Date(rdv.debut))
    const heure = `${formatHeure.format(new Date(rdv.debut))} – ${formatHeure.format(new Date(rdv.fin))}`
    const sujet = `Rendez-vous de médiation fixé – dossier n° ${numero_rg}`

    const lignesRdv = [
      `Dossier n° ${numero_rg}`,
      `Date : ${date}`,
      `Heure : ${heure} (heure de La Réunion)`,
    ]
    const lignesMediateur = mediateur
      ? [
          `Médiateur : ${mediateur.nom}`,
          `Contact : ${[mediateur.email, mediateur.telephone].filter(Boolean).join(" – ")}`,
        ]
      : []

    const emails: Email[] = []

    for (const partie of parties) {
      const viaAvocat = partie.passer_par_avocat && partie.avocat_email
      const destinataire = viaAvocat ? partie.avocat_email : (partie.email ?? partie.avocat_email)
      if (!destinataire) continue

      const introduction = viaAvocat
        ? `Le premier rendez-vous de médiation de votre client, ${partie.prenom} ${partie.nom}, est fixé.`
        : "Votre premier rendez-vous de médiation est fixé."

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
            "En cas d'empêchement, contactez le médiateur au plus tôt.",
          ].join("\n")
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
            "Les deux parties ont confirmé leurs coordonnées et un rendez-vous a été fixé automatiquement.",
            "",
            ...lignesRdv,
            "",
            "Les coordonnées des parties sont disponibles dans votre espace médiateur.",
          ].join("\n")
        ),
      })
    }

    await envoyerEmails(emails)
  } catch (erreur) {
    console.error(`Confirmation du rendez-vous non envoyée (dossier ${dossierId}) :`, erreur)
  }
}
