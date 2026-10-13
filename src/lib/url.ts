// Adresse publique du site (QR codes, liens des e-mails). Jamais déduite de la
// requête : en local, le poste de la juridiction est sur localhost, mais le téléphone
// qui scanne le QR code doit pouvoir ouvrir le lien.
//   Local      : NEXT_PUBLIC_SITE_URL=http://localhost:3000
//   Production : NEXT_PUBLIC_SITE_URL=https://<projet>.vercel.app

function urlDuSite() {
  const url = process.env.NEXT_PUBLIC_SITE_URL
  if (!url) {
    throw new Error("NEXT_PUBLIC_SITE_URL manquante : ajoutez-la à .env.local (ou dans Vercel).")
  }
  return url.replace(/\/+$/, "")
}

/** Lien du QR code d'une partie : https://…/p/<token> */
export function urlPartie(token: string) {
  return `${urlDuSite()}/p/${token}`
}
