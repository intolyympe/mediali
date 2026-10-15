"use client"

import { ArrowRightLeftIcon } from "lucide-react"
import { useActionState } from "react"

import { entrerEnDemo, type EtatDemo } from "@/app/connexion/actions"
import { Button } from "@/components/ui/button"
import type { EspaceDemo } from "@/lib/demo/mode"

// Boutons de la démo publique (affichés seulement si MODE_DEMO). Le formulaire
// n'envoie que le nom de l'espace : les identifiants restent sur le serveur.

const etatInitial: EtatDemo = {}

/**
 * Accueil et /connexion : « Entrer comme juridiction » / « Entrer comme
 * médiateur ». `vertical` : boutons l'un sous l'autre (colonne étroite).
 */
export function EntreeDemo({ vertical = false }: { vertical?: boolean }) {
  const [etat, action, enCours] = useActionState(entrerEnDemo, etatInitial)
  const classeBouton = vertical ? "h-14 px-6 text-base" : "h-14 px-6 text-base sm:flex-1"

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className={vertical ? "flex flex-col gap-3" : "flex flex-col gap-3 sm:flex-row"}>
        <Button
          type="submit"
          name="espace"
          value="juridiction"
          size="lg"
          disabled={enCours}
          className={classeBouton}
        >
          Entrer comme juridiction
        </Button>
        <Button
          type="submit"
          name="espace"
          value="mediateur"
          size="lg"
          variant="outline"
          disabled={enCours}
          className={classeBouton}
        >
          Entrer comme médiateur
        </Button>
      </div>
      {enCours && (
        <p role="status" className="text-sm text-muted-foreground">
          Connexion au compte de démonstration…
        </p>
      )}
      {etat.erreur && (
        <p role="alert" className="text-sm text-destructive">
          {etat.erreur}
        </p>
      )}
    </form>
  )
}

/** Dans chaque espace : passe au compte de démonstration de l'autre espace. */
export function BoutonChangerEspace({ vers }: { vers: EspaceDemo }) {
  const [etat, action, enCours] = useActionState(entrerEnDemo, etatInitial)

  return (
    <form action={action} className="flex flex-col gap-1">
      <Button type="submit" name="espace" value={vers} variant="outline" disabled={enCours}>
        <ArrowRightLeftIcon aria-hidden />
        Changer d&apos;espace
        <span className="sr-only">
          {" "}
          : aller à l&apos;espace {vers === "juridiction" ? "juridiction" : "médiateur"}
        </span>
      </Button>
      {etat.erreur && (
        <p role="alert" className="text-sm text-destructive">
          {etat.erreur}
        </p>
      )}
    </form>
  )
}
