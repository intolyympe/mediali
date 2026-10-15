"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { AIDE, pageAide } from "@/lib/aide"

// Mémorise que l'aide de l'accueil s'est déjà ouverte toute seule
const CLE_PREMIERE_VISITE = "mediali-aide-vue"

/**
 * Bouton « ? » fixé en bas à droite de toutes les pages : ouvre l'aide de la
 * page en cours (contenu dans src/lib/aide.ts). À la toute première visite de
 * l'accueil, l'aide s'ouvre automatiquement.
 */
export function BoutonAide() {
  const chemin = usePathname()
  const aide = AIDE[pageAide(chemin)]
  const [ouverte, setOuverte] = useState(false)

  useEffect(() => {
    if (chemin !== "/") return
    try {
      if (localStorage.getItem(CLE_PREMIERE_VISITE)) return
    } catch {
      // Stockage indisponible (navigation privée, cookies bloqués) : ne pas
      // ouvrir l'aide à chaque visite
      return
    }
    // Ouverture après le premier affichage ; mémorisée seulement une fois
    // faite (en développement, React exécute l'effet deux fois)
    const id = requestAnimationFrame(() => {
      setOuverte(true)
      try {
        localStorage.setItem(CLE_PREMIERE_VISITE, "1")
      } catch {
        // Sans stockage, l'aide se rouvrira à la prochaine visite
      }
    })
    return () => cancelAnimationFrame(id)
  }, [chemin])

  const Liste = aide.numerotee ? "ol" : "ul"

  return (
    <Dialog open={ouverte} onOpenChange={setOuverte}>
      <DialogTrigger
        render={
          <Button
            aria-label="Aide"
            title="Aide"
            className="fixed right-4 bottom-4 z-40 size-12 rounded-full p-0 text-xl font-bold shadow-[0_2px_6px_rgb(0_0_18/0.24)] print:hidden"
          />
        }
      >
        <span aria-hidden>?</span>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto p-6 text-base sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{aide.titre}</DialogTitle>
          <DialogDescription className="text-base text-foreground">{aide.intro}</DialogDescription>
        </DialogHeader>

        <section aria-labelledby="titre-liste-aide" className="flex flex-col gap-3">
          <h3 id="titre-liste-aide" className="font-bold">
            {aide.titreListe}
          </h3>
          <Liste className={aide.numerotee ? "flex list-decimal flex-col gap-3 pl-6" : "flex list-disc flex-col gap-3 pl-6"}>
            {aide.liste.map((element) => (
              <li key={element.titre}>
                <strong className="block">{element.titre}</strong>
                {element.texte}
              </li>
            ))}
          </Liste>
        </section>

        {aide.note && <p className="border-l-4 border-primary pl-3 text-muted-foreground">{aide.note}</p>}

        <DialogFooter className="-mx-6 -mb-6 px-6">
          <DialogClose render={<Button />}>Fermer</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
