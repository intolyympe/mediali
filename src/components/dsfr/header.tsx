import Link from "next/link"

import { BlocMarque } from "./bloc-marque"

// En-tête commun à toutes les pages, sur le modèle des sites de l'État (DSFR).
export function EnTete() {
  return (
    <header className="border-b border-border bg-background shadow-[0_2px_4px_rgb(0_0_18/0.12)] print:hidden">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-8 gap-y-4 px-4 py-4">
        <Link
          href="/"
          title="Accueil — Médialien"
          className="flex items-center gap-6 text-foreground no-underline sm:gap-8"
        >
          <BlocMarque />
          <span className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground sm:text-sm">
              Cour d&apos;appel de Saint-Denis de La Réunion
            </span>
            <span className="text-xl font-bold text-foreground">Médialien</span>
            <span className="text-sm text-muted-foreground">
              Médiation et conciliation judiciaires
            </span>
          </span>
        </Link>
        {/* Évite toute confusion avec un service officiel (CGU du DSFR) */}
        <p className="rounded-sm bg-[#feecc2] px-2 py-1 text-xs font-bold text-[#716043] uppercase sm:ml-auto">
          Prototype – Hackathon Justice Tech
        </p>
      </div>
    </header>
  )
}
