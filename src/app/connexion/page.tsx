import type { Metadata } from "next"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { EntreeDemo } from "@/components/demo/entree-demo"
import { MODE_DEMO } from "@/lib/demo/mode"

import { FormulaireConnexion } from "./formulaire-connexion"

export const metadata: Metadata = {
  title: "Connexion",
}

export default function PageConnexion() {
  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1 className="text-lg font-bold">Connexion aux espaces juridiction et médiateur</h1>
          </CardTitle>
          <CardDescription>
            Prototype · Hackathon Justice Tech 2026 — connectez-vous pour suivre vos
            dossiers de médiation.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {MODE_DEMO && (
            <>
              <section aria-labelledby="titre-demo" className="flex flex-col gap-3">
                <h2 id="titre-demo" className="font-bold">
                  Démonstration sans mot de passe
                </h2>
                <EntreeDemo vertical />
              </section>
              <p className="flex items-center gap-3 text-sm text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
                ou avec votre compte
              </p>
            </>
          )}
          <FormulaireConnexion />
        </CardContent>
      </Card>
    </main>
  )
}
