"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select"
import { LIBELLES_ROLE } from "@/lib/statuts"

import { creerDossier, type EtatNouveauDossier } from "./actions"

const etatInitial: EtatNouveauDossier = {}

type Mediateur = { id: string; nom: string }

export function FormulaireDossier({ mediateurs }: { mediateurs: Mediateur[] }) {
  const [etat, action, enCours] = useActionState(creerDossier, etatInitial)

  return (
    <form action={action} className="flex flex-col gap-6">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-medium">Dossier</legend>
        <Champ nom="numero_rg" libelle="Numéro RG" placeholder="26/00123" />
        <Champ nom="juridiction" libelle="Juridiction" />
        <Champ nom="date_ordonnance" libelle="Date de l'ordonnance" type="date" />
        <div className="flex flex-col gap-2">
          <Label htmlFor="mediateur_id">Médiateur</Label>
          <NativeSelect id="mediateur_id" name="mediateur_id" required defaultValue="">
            <NativeSelectOption value="" disabled>
              Choisir un médiateur
            </NativeSelectOption>
            {mediateurs.map((mediateur) => (
              <NativeSelectOption key={mediateur.id} value={mediateur.id}>
                {mediateur.nom}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </fieldset>

      {(["demandeur", "defendeur"] as const).map((role) => (
        <fieldset key={role} className="grid gap-4 sm:grid-cols-3">
          <legend className="mb-2 font-medium">{LIBELLES_ROLE[role]}</legend>
          <Champ nom={`${role}_nom`} libelle="Nom" />
          <Champ nom={`${role}_prenom`} libelle="Prénom" />
          <Champ
            nom={`${role}_avocat_nom`}
            libelle="Avocat (optionnel)"
            requis={false}
          />
        </fieldset>
      ))}

      {etat.erreur && (
        <p role="alert" className="text-sm text-destructive">
          {etat.erreur}
        </p>
      )}

      <Button type="submit" disabled={enCours} className="self-start">
        {enCours ? "Création…" : "Créer le dossier"}
      </Button>
    </form>
  )
}

function Champ({
  nom,
  libelle,
  type = "text",
  requis = true,
  placeholder,
}: {
  nom: string
  libelle: string
  type?: string
  requis?: boolean
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={nom}>{libelle}</Label>
      <Input
        id={nom}
        name={nom}
        type={type}
        required={requis}
        placeholder={placeholder}
      />
    </div>
  )
}
