import "server-only"

// Envoi d'e-mails en texte simple avec l'API Resend (https://resend.com/docs).
// Sans RESEND_API_KEY (développement local), les e-mails sont affichés dans la
// console au lieu d'être envoyés.

export type Email = {
  a: string
  sujet: string
  texte: string
}

const EN_TETE = "Médiation – Cour d'appel de Saint-Denis"

// Adresse d'expédition : doit appartenir à un domaine vérifié sur Resend.
// onboarding@resend.dev ne peut écrire qu'à l'adresse du compte Resend.
const EXPEDITEUR =
  process.env.EMAIL_EXPEDITEUR ?? "Médiation Saint-Denis <onboarding@resend.dev>"

/** Ajoute l'en-tête et la mention de bas de page communs à tous les e-mails. */
export function miseEnForme(corps: string) {
  return `${EN_TETE}\n\n${corps}\n\n--\nMessage automatique, merci de ne pas y répondre.`
}

/**
 * Envoie plusieurs e-mails en une seule requête. Ne lève jamais d'erreur :
 * renvoie false (et l'écrit dans la console) si l'envoi a échoué.
 */
export async function envoyerEmails(emails: Email[]): Promise<boolean> {
  if (emails.length === 0) return true

  const cle = process.env.RESEND_API_KEY
  if (!cle) {
    for (const email of emails) {
      console.info(
        `[e-mail non envoyé : RESEND_API_KEY absente]\nÀ : ${email.a}\nObjet : ${email.sujet}\n\n${email.texte}\n`
      )
    }
    return true
  }

  try {
    const reponse = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cle}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        emails.map((email) => ({
          from: EXPEDITEUR,
          to: [email.a],
          subject: email.sujet,
          text: email.texte,
        }))
      ),
    })

    if (!reponse.ok) {
      console.error("Échec de l'envoi des e-mails (Resend) :", reponse.status, await reponse.text())
      return false
    }
    return true
  } catch (erreur) {
    console.error("Échec de l'envoi des e-mails (Resend) :", erreur)
    return false
  }
}
