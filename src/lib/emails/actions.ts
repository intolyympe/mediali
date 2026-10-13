"use server"

import { lireMediateurId, lireRole } from "@/lib/roles"
import { aRepondu } from "@/lib/statuts"
import { createClient } from "@/lib/supabase/server"
import { urlPartie } from "@/lib/url"

import { envoyerEmails, miseEnForme, vocabulaire, type Email } from "./envoyer"

export type ResultatRelance = {
  envoyes: number
  erreur?: string
}

/**
 * Bouton « Relancer » : envoie le lien du QR code (/p/<token>) aux parties
 * pas encore confirmées dont un e-mail est connu (partie et/ou avocat).
 * Réservé à la juridiction et aux intervenants du dossier (principal ou
 * co-médiateur). Chaque relance est ajoutée à la timeline du dossier.
 */
export async function relancerParties(dossierId: string): Promise<ResultatRelance> {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const role = lireRole(claims?.claims)
  if (!role) return { envoyes: 0, erreur: "Vous devez être connecté." }

  const { data: dossier, error } = await supabase
    .from("dossiers")
    .select("id, numero_rg, mode, mediateur_id, co_mediateur_id, parties(token, email, avocat_email, consentement_rgpd, confirme_le, choix)")
    .eq("id", dossierId)
    .maybeSingle()

  if (error) return { envoyes: 0, erreur: "Impossible de lire le dossier." }
  if (!dossier) return { envoyes: 0, erreur: "Dossier introuvable." }
  const mediateurId = lireMediateurId(claims?.claims)
  if (role === "mediateur" && dossier.mediateur_id !== mediateurId && dossier.co_mediateur_id !== mediateurId) {
    return { envoyes: 0, erreur: "Ce dossier ne vous est pas confié." }
  }

  const mots = vocabulaire(dossier.mode)
  const emails: Email[] = []
  for (const partie of dossier.parties) {
    // Déjà répondu (y compris un refus) : pas de relance
    if (aRepondu(partie)) continue

    const lien = urlPartie(partie.token)
    const destinataires = new Set([partie.email, partie.avocat_email].filter((e) => e))
    for (const destinataire of destinataires) {
      emails.push({
        a: destinataire!,
        sujet: `${mots.Procedure} – dossier n° ${dossier.numero_rg} : vos coordonnées`,
        texte: miseEnForme(
          [
            "Bonjour,",
            "",
            `Un ${mots.tiers} a été désigné par le juge dans le dossier n° ${dossier.numero_rg}.`,
            "Pour qu'il puisse vous contacter, merci de transmettre vos coordonnées et vos disponibilités en suivant ce lien :",
            "",
            lien,
            "",
            "Si vous êtes l'avocat de cette partie, le même lien vous permet de répondre pour votre client.",
          ].join("\n"),
          dossier.mode
        ),
      })
    }
  }

  if (emails.length === 0) {
    return { envoyes: 0, erreur: "Aucune partie en attente avec un e-mail connu." }
  }

  const ok = await envoyerEmails(emails)
  if (!ok) return { envoyes: 0, erreur: "L'envoi des e-mails a échoué." }

  // Visible dans la timeline des espaces juridiction et médiateur
  await supabase.from("evenements").insert({
    dossier_id: dossier.id,
    type: "relance",
    libelle: `Relance envoyée par e-mail (${emails.length} destinataire${emails.length > 1 ? "s" : ""})`,
    acteur: role === "greffe" ? "juridiction" : "mediateur",
  })
  return { envoyes: emails.length }
}
