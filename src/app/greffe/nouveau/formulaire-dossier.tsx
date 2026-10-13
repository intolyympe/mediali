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

const etatInitial: EtatNouveauDossier = { essai: 0 }

type Mediateur = { id: string; nom: string }

export function FormulaireDossier({ mediateurs }: { mediateurs: Mediateur[] }) {
  const [etat, action, enCours] = useActionState(creerDossier, etatInitial)
  const valeur = (nom: string) => etat.valeurs?.[nom]

  return (
    // La clé change à chaque erreur : le formulaire est recréé avec les valeurs saisies
    <form key={etat.essai} action={action} className="flex flex-col gap-6">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-medium">Dossier</legend>
        <Champ nom="numero_rg" libelle="Numéro RG" placeholder="26/00123" valeur={valeur("numero_rg")} />
        <Champ nom="juridiction" libelle="Juridiction" valeur={valeur("juridiction")} />
        <Champ
          nom="date_ordonnance"
          libelle="Date de l'ordonnance"
          type="date"
          valeur={valeur("date_ordonnance")}
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor="mediateur_id">Médiateur</Label>
          <NativeSelect id="mediateur_id" name="mediateur_id" required defaultValue={valeur("mediateur_id") ?? ""}>
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
          <Champ nom={`${role}_nom`} libelle="Nom" valeur={valeur(`${role}_nom`)} />
          <Champ nom={`${role}_prenom`} libelle="Prénom" valeur={valeur(`${role}_prenom`)} />
          <Champ
            nom={`${role}_avocat_nom`}
            libelle="Avocat (optionnel)"
            requis={false}
            valeur={valeur(`${role}_avocat_nom`)}
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
  valeur,
}: {
  nom: string
  libelle: string
  type?: string
  requis?: boolean
  placeholder?: string
  valeur?: string
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
        defaultValue={valeur}
      />
    </div>
  )
}
