"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { seConnecter, type EtatConnexion } from "./actions"

const etatInitial: EtatConnexion = {}

export function FormulaireConnexion() {
  const [etat, action, enCours] = useActionState(seConnecter, etatInitial)

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Adresse e-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={etat.email}
          className="h-10"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="mot_de_passe">Mot de passe</Label>
        <Input
          id="mot_de_passe"
          name="mot_de_passe"
          type="password"
          autoComplete="current-password"
          required
          className="h-10"
        />
      </div>

      {etat.erreur && (
        <p role="alert" className="text-sm text-destructive">
          {etat.erreur}
        </p>
      )}

      <Button type="submit" disabled={enCours} className="h-10">
        {enCours ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  )
}
