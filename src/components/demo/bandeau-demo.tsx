import { TriangleAlertIcon } from "lucide-react"

import { MODE_DEMO } from "@/lib/demo/mode"

// Bandeau d'information importante (DSFR, « notice » d'avertissement), sous
// l'en-tête de toutes les pages, seulement en mode démo. Couleurs de
// l'avertissement de BadgeDsfr (contraste 5,8:1).
export function BandeauDemo() {
  if (!MODE_DEMO) return null

  return (
    <div role="note" aria-label="Démonstration" className="bg-[#ffe9e6] text-avertissement print:hidden">
      <p className="mx-auto flex w-full max-w-5xl items-start gap-3 px-4 py-3 text-sm sm:text-base">
        <TriangleAlertIcon aria-hidden className="mt-0.5 size-5 shrink-0" />
        <span>
          <strong>Démonstration :</strong> toutes les données sont fictives et remises à zéro
          chaque nuit. Ne saisissez aucune donnée personnelle réelle.
        </span>
      </p>
    </div>
  )
}
