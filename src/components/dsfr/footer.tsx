import Link from "next/link"

import { LogoMediali } from "./logo"

// Pied de page commun à toutes les pages (filet bleu en haut).
export function PiedDePage() {
  return (
    <footer className="mt-12 border-t-2 border-primary bg-background print:hidden">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-8 pb-24 sm:flex-row sm:items-start sm:justify-between">
        <LogoMediali taille="petite" />
        <div className="flex max-w-xl flex-col gap-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Médiali</strong> transmet au médiateur
            ou au conciliateur désigné par le juge les coordonnées et les disponibilités
            des parties, pour fixer plus vite le premier rendez-vous.
          </p>
          <p>
            Prototype réalisé lors du hackathon Justice Tech 2026 (Cour d&apos;appel de
            Saint-Denis × Epitech La Réunion) par l&apos;équipe MEIDI. Ce site n&apos;est
            pas un service officiel.
          </p>
          <p>
            Accessibilité :{" "}
            <Link href="/accessibilite" className="underline">
              partiellement conforme
            </Link>{" "}
            (prototype non audité).
          </p>
          <nav aria-label="Pied de page">
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              <li>
                <Link href="/" className="inline-flex min-h-11 items-center underline sm:min-h-0">
                  Accueil
                </Link>
              </li>
              <li>
                <Link href="/juridiction" className="inline-flex min-h-11 items-center underline sm:min-h-0">
                  Espace juridiction
                </Link>
              </li>
              <li>
                <Link href="/mediateur" className="inline-flex min-h-11 items-center underline sm:min-h-0">
                  Espace médiateur
                </Link>
              </li>
              <li>
                <Link href="/accessibilite" className="inline-flex min-h-11 items-center underline sm:min-h-0">
                  Accessibilité
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  )
}
