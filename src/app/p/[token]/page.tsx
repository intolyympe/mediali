import type { Metadata } from "next"
import { Suspense } from "react"

import { creneauxLibres, trouverPartieParToken } from "@/lib/dossiers"

import { grouperParJour } from "./dates"
import { ParcoursPartie } from "./parcours-partie"

export const metadata: Metadata = {
  title: "Vos coordonnées — Médiation",
}

// Page publique ouverte en scannant le QR code de la notification (personne 3).

export default function PagePartie({ params }: PageProps<"/p/[token]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-6">
      <p className="text-sm font-medium text-muted-foreground">
        Médiation — Cour d&apos;appel de Saint-Denis
      </p>

      <Suspense fallback={<p className="text-lg">Chargement…</p>}>
        <ContenuPagePartie params={params} />
      </Suspense>

      <footer className="mt-auto border-t pt-4 text-center text-base text-muted-foreground">
        Besoin d&apos;aide&nbsp;? Contactez votre avocat ou la juridiction.
      </footer>
    </main>
  )
}

// Lit la base : rendu à chaque requête, d'où le Suspense.
async function ContenuPagePartie({ params }: Pick<PageProps<"/p/[token]">, "params">) {
  const { token } = await params
  const partie = await trouverPartieParToken(token)

  if (!partie?.dossier) {
    return (
      <Message titre="Ce lien ne fonctionne pas">
        Vérifiez que vous avez bien scanné le QR code imprimé sur votre courrier.
      </Message>
    )
  }

  if (partie.confirme_le) {
    return (
      <Message titre="Vous avez déjà répondu">
        {partie.rempli_par === "avocat"
          ? "Votre avocat a déjà transmis vos informations au médiateur."
          : "Vos informations ont bien été transmises au médiateur."}{" "}
        Le médiateur vous contactera prochainement. Vous n&apos;avez rien d&apos;autre à faire.
      </Message>
    )
  }

  // Seuls le numéro du dossier et les créneaux sont envoyés au navigateur :
  // le nom de la partie reste sur le serveur pour la vérification.
  const creneaux = partie.dossier.mediateur_id
    ? await creneauxLibres(partie.dossier.mediateur_id)
    : []

  return (
    <ParcoursPartie
      token={token}
      numeroRg={partie.dossier.numero_rg}
      jours={grouperParJour(creneaux)}
    />
  )
}

function Message({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">{titre}</h1>
      <p className="text-lg">{children}</p>
    </section>
  )
}
