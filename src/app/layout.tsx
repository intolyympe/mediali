import type { Metadata } from "next"
import { Geist_Mono } from "next/font/google"
import localFont from "next/font/local"

import { BandeauDemo } from "@/components/demo/bandeau-demo"
import { PiedDePage } from "@/components/dsfr/footer"
import { EnTete } from "@/components/dsfr/header"
import { Toaster } from "@/components/ui/sonner"

import "./globals.css"

// Police Marianne, chargée depuis les fichiers du paquet officiel @gouvfr/dsfr
// (sans le CSS du DSFR, pour ne pas casser les composants shadcn).
const marianne = localFont({
  variable: "--font-sans",
  display: "swap",
  src: [
    { path: "../../node_modules/@gouvfr/dsfr/dist/fonts/Marianne-Light.woff2", weight: "300", style: "normal" },
    { path: "../../node_modules/@gouvfr/dsfr/dist/fonts/Marianne-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../node_modules/@gouvfr/dsfr/dist/fonts/Marianne-Regular_Italic.woff2", weight: "400", style: "italic" },
    { path: "../../node_modules/@gouvfr/dsfr/dist/fonts/Marianne-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../node_modules/@gouvfr/dsfr/dist/fonts/Marianne-Bold.woff2", weight: "700", style: "normal" },
  ],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Médiali — Médiation et conciliation judiciaires",
  description:
    "Transmission des coordonnées et disponibilités des parties au médiateur ou au conciliateur désigné — Cour d'appel de Saint-Denis de La Réunion.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${marianne.variable} ${geistMono.variable} h-full antialiased`}
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
        <Toaster />
      </body>
    </html>
  )
}
