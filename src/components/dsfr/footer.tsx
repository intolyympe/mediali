import Link from "next/link"

import { BlocMarque } from "./bloc-marque"

// Pied de page commun à toutes les pages (DSFR : filet bleu France en haut).
export function PiedDePage() {
  return (
    <footer className="mt-12 border-t-2 border-primary bg-background print:hidden">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-start sm:justify-between">
        <BlocMarque taille="petite" />
        <div className="flex max-w-xl flex-col gap-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Médiali</strong> transmet au médiateur
            ou au conciliateur désigné par le juge les coordonnées et les disponibilités
            des parties, pour fixer plus vite le premier rendez-vous.
          </p>
          <p>
            Prototype réalisé lors du hackathon Justice Tech de la Cour d&apos;appel de
            Saint-Denis de La Réunion. Ce site n&apos;est pas un service public en
            ligne. Accessibilité : non conforme (prototype non audité).
          </p>
          <nav aria-label="Pied de page">
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              <li>
                <Link href="/" className="underline">
                  Accueil
                </Link>
              </li>
              <li>
                <Link href="/juridiction" className="underline">
                  Espace juridiction
                </Link>
              </li>
              <li>
                <Link href="/mediateur" className="underline">
                  Espace médiateur
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  )
}
