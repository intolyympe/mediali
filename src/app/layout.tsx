import type { Metadata } from "next"
import { Geist_Mono, Public_Sans } from "next/font/google"
import { Suspense } from "react"

import { BoutonAide } from "@/components/aide/bouton-aide"
import { BandeauDemo } from "@/components/demo/bandeau-demo"
import { PiedDePage } from "@/components/dsfr/footer"
import { EnTete } from "@/components/dsfr/header"
import { Toaster } from "@/components/ui/sonner"

import "./globals.css"

// Public Sans : police libre proche de Marianne (pas de police de l'État, le
// site est un prototype et non un service officiel).
const publicSans = Public_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  // Chaque page donne son titre : « Tableau de suivi – Espace juridiction – Médiali »
  title: {
    default: "Médiali – Médiation et conciliation judiciaires",
    template: "%s – Médiali",
  },
  description:
    "Transmission des coordonnées et disponibilités des parties au médiateur ou au conciliateur désigné — Prototype · Hackathon Justice Tech 2026.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${publicSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a href="#contenu" className="lien-evitement">
          Aller au contenu
        </a>
        <EnTete />
        <BandeauDemo />
        <div id="contenu" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          {children}
        </div>
        <PiedDePage />
        {/* usePathname suspend sur les pages à paramètre dynamique (/p/[token]…) */}
        <Suspense fallback={null}>
          <BoutonAide />
        </Suspense>
        <Toaster />
      </body>
    </html>
  )
}
