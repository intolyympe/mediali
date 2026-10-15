import Link from "next/link"

import { LogoMediali } from "./logo"

// En-tête commun à toutes les pages.
export function EnTete() {
  return (
    <header className="border-b border-border bg-background shadow-[0_2px_4px_rgb(0_0_18/0.12)] print:hidden">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-8 gap-y-4 px-4 py-4">
        <Link
          href="/"
          title="Accueil — Médiali"
          className="text-foreground no-underline"
        >
          <LogoMediali />
        </Link>
        {/* Évite toute confusion avec un service officiel */}
        <p className="rounded-sm bg-[#feecc2] px-2 py-1 text-xs font-bold text-[#716043] uppercase sm:ml-auto">
          Prototype – Hackathon Justice Tech
        </p>
      </div>
    </header>
  )
}
