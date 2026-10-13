import type { Metadata } from "next"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { FormulaireConnexion } from "./formulaire-connexion"

export const metadata: Metadata = {
  title: "Connexion — Médiation",
}

export default function PageConnexion() {
  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">Espace juridiction et médiateur</CardTitle>
          <CardDescription>
            Cour d&apos;appel de Saint-Denis — connectez-vous pour suivre vos
            dossiers de médiation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormulaireConnexion />
        </CardContent>
      </Card>
    </main>
  )
}
