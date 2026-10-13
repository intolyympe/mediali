"use server"

import { lireMediateurId, lireRole } from "@/lib/roles"
import { createClient } from "@/lib/supabase/server"
import { urlPartie } from "@/lib/url"

import { envoyerEmails, miseEnForme, type Email } from "./envoyer"

export type ResultatRelance = {
  envoyes: number
  erreur?: string
}

/**
 * Bouton « Relancer » : envoie le lien du QR code (/p/<token>) aux parties
 * pas encore confirmées dont un e-mail est connu (partie et/ou avocat).
 * Réservé au greffe et au médiateur du dossier.
 */
export async function relancerParties(dossierId: string): Promise<ResultatRelance> {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const role = lireRole(claims?.claims)
  if (!role) return { envoyes: 0, erreur: "Vous devez être connecté." }

  const { data: dossier, error } = await supabase
    .from("dossiers")
    .select("numero_rg, mediateur_id, parties(token, email, avocat_email, consentement_rgpd, confirme_le)")
    .eq("id", dossierId)
    .maybeSingle()

  if (error) return { envoyes: 0, erreur: "Impossible de lire le dossier." }
  if (!dossier) return { envoyes: 0, erreur: "Dossier introuvable." }
  if (role === "mediateur" && dossier.mediateur_id !== lireMediateurId(claims?.claims)) {
    return { envoyes: 0, erreur: "Ce dossier ne vous est pas confié." }
  }

  const emails: Email[] = []
  for (const partie of dossier.parties) {
    if (partie.consentement_rgpd && partie.confirme_le) continue

    const lien = urlPartie(partie.token)
    const destinataires = new Set([partie.email, partie.avocat_email].filter((e) => e))
    for (const destinataire of destinataires) {
      emails.push({
        a: destinataire!,
        sujet: `Médiation – dossier n° ${dossier.numero_rg} : vos coordonnées`,
        texte: miseEnForme(
          [
            "Bonjour,",
            "",
            `Un médiateur a été désigné par le juge dans le dossier n° ${dossier.numero_rg}.`,
            "Pour qu'il puisse vous contacter, merci de transmettre vos coordonnées et vos disponibilités en suivant ce lien :",
            "",
            lien,
            "",
            "Si vous êtes l'avocat de cette partie, le même lien vous permet de répondre pour votre client.",
          ].join("\n")
        ),
      })
    }
  }

  if (emails.length === 0) {
    return { envoyes: 0, erreur: "Aucune partie en attente avec un e-mail connu." }
  }

  const ok = await envoyerEmails(emails)
  return ok ? { envoyes: emails.length } : { envoyes: 0, erreur: "L'envoi des e-mails a échoué." }
}
