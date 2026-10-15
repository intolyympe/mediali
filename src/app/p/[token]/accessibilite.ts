import { useEffect, useRef } from "react"

// Aides d'accessibilité partagées par les parcours partie et avocat.

/**
 * Place le focus sur le titre de la page quand `cle` change (nouvelle étape,
 * écran final), pour que le lecteur d'écran annonce « Étape 3 sur 6 : … ».
 * Rien au premier affichage : le focus reste en haut de page.
 */
export function useFocusTitre(cle: string) {
  const ref = useRef<HTMLHeadingElement>(null)
  const precedente = useRef(cle)
  useEffect(() => {
    if (precedente.current === cle) return
    precedente.current = cle
    ref.current?.focus()
  }, [cle])
  return ref
}

/**
 * Focus sur le premier champ en erreur (sélecteur CSS), après le rendu : le
 * champ peut apparaître à l'instant (« autre moyen de contact » rouvert).
 */
export function focaliser(selecteur: string) {
  requestAnimationFrame(() => document.querySelector<HTMLElement>(selecteur)?.focus())
}

/** Premier champ en erreur, dans l'ordre d'affichage. */
export function premierEnErreur<C extends string>(ordre: C[], erreurs: Partial<Record<C, string>>) {
  return ordre.find((champ) => erreurs[champ])
}
