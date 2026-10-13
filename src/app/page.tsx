import Link from "next/link"

import { Button } from "@/components/ui/button"

// Page d'accueil publique : présentation du projet et accès aux deux espaces.
export default function Accueil() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-4 py-12">
      <p className="text-sm font-medium text-muted-foreground">
        Cour d&apos;appel de Saint-Denis · Hackathon Justice Tech
      </p>

      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Médiation : un QR code pour joindre les parties
        </h1>
        <p className="text-lg text-muted-foreground">
          Un QR code imprimé sur la notification de l&apos;ordonnance permet à chaque
          partie, ou à son avocat, de transmettre en quelques minutes ses coordonnées et
          ses disponibilités au médiateur, qui voit le premier rendez-vous se fixer en
          temps réel.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          render={<Link href="/greffe" />}
          nativeButton={false}
          className="h-12 px-6 text-base"
        >
          Espace greffe
        </Button>
        <Button
          variant="outline"
          render={<Link href="/mediateur" />}
          nativeButton={false}
          className="h-12 px-6 text-base"
        >
          Espace médiateur
        </Button>
      </div>
    </main>
  )
}
