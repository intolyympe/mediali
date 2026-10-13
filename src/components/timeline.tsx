import { LIBELLES_ACTEUR } from "@/lib/statuts"
import type { Tables } from "@/lib/supabase/database.types"
import { cn } from "@/lib/utils"

// Timeline d'un dossier, style DSFR. Ne fait aucune requête : elle affiche les
// événements reçus en props (lignes de la table `evenements`). Utilisable dans
// un Server Component comme dans un composant client (temps réel).

export type EvenementTimeline = Pick<
  Tables<"evenements">,
  "id" | "created_at" | "acteur" | "libelle"
> & {
  /** Précision affichée sous le libellé (texte, lien, extrait du compte rendu…) */
  detail?: React.ReactNode
}

const FUSEAU = "Indian/Reunion"
const formatJour = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: FUSEAU })
const formatHeure = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: FUSEAU,
})

export function Timeline({
  evenements,
  plusRecentEnPremier = false,
  titre = "Historique du dossier",
}: {
  evenements: EvenementTimeline[]
  /** Par défaut, ordre chronologique (le plus ancien en haut). */
  plusRecentEnPremier?: boolean
  /** Nom de la liste lu par les lecteurs d'écran. */
  titre?: string
}) {
  if (evenements.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun événement pour l&apos;instant.</p>
  }

  const tries = [...evenements].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  if (plusRecentEnPremier) tries.reverse()

  return (
    <ol aria-label={titre} className="flex flex-col">
      {tries.map((evenement) => {
        const date = new Date(evenement.created_at)
        const automatique = evenement.acteur === "systeme"
        return (
          <li
            key={evenement.id}
            className={cn(
              "relative pb-6 pl-8 last:pb-0",
              // Trait vertical qui relie les puces
              "before:absolute before:top-5 before:-bottom-1 before:left-[5px] before:w-0.5 before:bg-border last:before:hidden"
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute top-1.5 left-0 size-3 rounded-full border-2",
                automatique ? "border-[#3a3a3a] bg-background" : "border-primary bg-primary"
              )}
            />
            <p className="text-sm text-muted-foreground">
              <time dateTime={evenement.created_at}>
                {formatJour.format(date)} à {formatHeure.format(date)}
              </time>
              {" · "}
              <span className="font-medium">{LIBELLES_ACTEUR[evenement.acteur]}</span>
            </p>
            <p className="font-medium text-foreground">{evenement.libelle}</p>
            {evenement.detail && (
              <div className="mt-1 text-sm text-muted-foreground">{evenement.detail}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
