import type { Metadata } from "next"
import { Suspense } from "react"

import { creneauxLibres, trouverPartieParToken } from "@/lib/dossiers"

import { grouperParJour } from "../dates"
import { ParcoursAvocat } from "./parcours-avocat"

export const metadata: Metadata = {
  title: "Espace avocat — Médiation",
}

// Page publique de l'avocat d'une partie, même QR code que la partie (personne 6).

export default function PageAvocat({ params }: PageProps<"/p/[token]/avocat">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-6">
      <p className="text-sm font-medium text-muted-foreground">
        Médiation — Cour d&apos;appel de Saint-Denis · Espace avocat
      </p>

      <Suspense fallback={<p className="text-lg">Chargement…</p>}>
        <ContenuPageAvocat params={params} />
      </Suspense>

      <footer className="mt-auto border-t pt-4 text-center text-base text-muted-foreground print:hidden">
        Besoin d&apos;aide&nbsp;? Contactez la juridiction.
      </footer>
    </main>
  )
}

// Lit la base : rendu à chaque requête, d'où le Suspense.
async function ContenuPageAvocat({ params }: Pick<PageProps<"/p/[token]/avocat">, "params">) {
  const { token } = await params
  const partie = await trouverPartieParToken(token)

  if (!partie?.dossier) {
    return (
      <Message titre="Ce lien ne fonctionne pas">
        Vérifiez que vous avez bien scanné le QR code imprimé sur la notification.
      </Message>
    )
  }

  if (partie.confirme_le) {
    return (
      <Message titre="Une réponse a déjà été transmise">
        {partie.rempli_par === "avocat"
          ? "Un avocat a déjà répondu pour cette partie."
          : "Votre client a déjà répondu lui-même."}{" "}
        Ses coordonnées et ses disponibilités ont été transmises au médiateur, qui prendra
        contact prochainement.
      </Message>
    )
  }

  // Seuls les créneaux sont envoyés au navigateur : le numéro RG et le nom du
  // client restent sur le serveur pour la vérification.
  const creneaux = partie.dossier.mediateur_id
    ? await creneauxLibres(partie.dossier.mediateur_id)
    : []

  return <ParcoursAvocat token={token} jours={grouperParJour(creneaux)} />
}

function Message({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">{titre}</h1>
      <p className="text-lg">{children}</p>
    </section>
  )
}
