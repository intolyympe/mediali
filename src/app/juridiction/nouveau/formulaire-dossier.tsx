"use client"

import { PlusIcon } from "lucide-react"
import { useRef, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { LIBELLES_ROLE } from "@/lib/statuts"
import type { Enums } from "@/lib/supabase/database.types"
import { cn } from "@/lib/utils"

import { creerDossier, type DossierSaisi, type PartieSaisie } from "./actions"

type Intervenant = { id: string; nom: string; fonction: Enums<"fonction_amiable"> }

const FONCTION_PAR_MODE: Record<Enums<"mode_amiable">, Enums<"fonction_amiable">> = {
  mediation: "mediateur",
  conciliation: "conciliateur",
}

const MODES = [
  { valeur: "mediation", titre: "Médiation", aide: "Un médiateur aide les parties à trouver un accord." },
  { valeur: "conciliation", titre: "Conciliation", aide: "Un conciliateur de justice recherche un accord amiable." },
] as const

const partieVide = (cle: string, role: Enums<"role_partie">): PartieSaisie => ({
  cle,
  role,
  nom: "",
  prenom: "",
  avocat_nom: "",
  telephone: "",
  telephone_2: "",
  email: "",
  adresse: "",
})

export function FormulaireDossier({ intervenants }: { intervenants: Intervenant[] }) {
  const [dossier, setDossier] = useState({
    mode: "mediation" as Enums<"mode_amiable">,
    numero_rg: "",
    juridiction: "Cour d'appel de Saint-Denis",
    date_ordonnance: "",
    mediateur_id: "",
    co_mediateur_id: "",
  })
  const [parties, setParties] = useState([partieVide("p1", "demandeur"), partieVide("p2", "defendeur")])
  const [coordonneesOuvertes, setCoordonneesOuvertes] = useState<string[]>([])
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, demarrer] = useTransition()
  const compteur = useRef(3)

  const fonction = FONCTION_PAR_MODE[dossier.mode]
  const conciliation = dossier.mode === "conciliation"
  const proposes = intervenants.filter((intervenant) => intervenant.fonction === fonction)
  const coProposes = proposes.filter((intervenant) => intervenant.id !== dossier.mediateur_id)
  const plusDeDeuxParties = parties.length > 2

  function changerDossier(champ: keyof typeof dossier, valeur: string) {
    setDossier((actuel) => ({ ...actuel, [champ]: valeur }))
  }

  function changerMode(mode: Enums<"mode_amiable">) {
    // La liste des intervenants change : on vide les choix devenus impossibles
    setDossier((actuel) => ({ ...actuel, mode, mediateur_id: "", co_mediateur_id: "" }))
  }

  function changerPartie(cle: string, champ: keyof PartieSaisie, valeur: string) {
    setParties((actuelles) => actuelles.map((p) => (p.cle === cle ? { ...p, [champ]: valeur } : p)))
  }

  function ajouterPartie(role: Enums<"role_partie">) {
    // Clé calculée hors de la fonction de mise à jour (React peut l'appeler deux fois)
    const cle = `p${compteur.current++}`
    setParties((actuelles) => [...actuelles, partieVide(cle, role)])
  }

  function retirerPartie(cle: string) {
    setParties((actuelles) => actuelles.filter((p) => p.cle !== cle))
  }

  function basculerCoordonnees(cle: string) {
    setCoordonneesOuvertes((ouvertes) =>
      ouvertes.includes(cle) ? ouvertes.filter((c) => c !== cle) : [...ouvertes, cle]
    )
  }

  function envoyer(event: React.FormEvent) {
    event.preventDefault()
    setErreur(null)
    const saisie: DossierSaisi = {
      ...dossier,
      co_mediateur_id: plusDeDeuxParties ? dossier.co_mediateur_id : "",
      parties,
    }
    demarrer(async () => {
      // En cas de succès, l'action redirige vers la page du dossier
      const resultat = await creerDossier(saisie)
      if (resultat?.erreur) setErreur(resultat.erreur)
    })
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-10">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-lg font-bold">Type de procédure</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {MODES.map((option) => (
            <label
              key={option.valeur}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-sm border p-4",
                dossier.mode === option.valeur ? "border-primary bg-secondary" : "border-input"
              )}
            >
              <input
                type="radio"
                name="mode"
                value={option.valeur}
                checked={dossier.mode === option.valeur}
                onChange={() => changerMode(option.valeur)}
                className="mt-1 size-4 accent-primary"
              />
              <span className="flex flex-col gap-0.5">
                <span className="font-bold">{option.titre}</span>
                <span className="text-sm text-muted-foreground">{option.aide}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-lg font-bold">Dossier</legend>
        <Champ id="numero_rg" libelle="Numéro RG" requis placeholder="26/00123"
          valeur={dossier.numero_rg} onChange={(v) => changerDossier("numero_rg", v)} />
        <Champ id="juridiction" libelle="Juridiction" requis
          valeur={dossier.juridiction} onChange={(v) => changerDossier("juridiction", v)} />
        <Champ id="date_ordonnance" libelle="Date de l'ordonnance" requis type="date"
          valeur={dossier.date_ordonnance} onChange={(v) => changerDossier("date_ordonnance", v)} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="mediateur_id">{conciliation ? "Conciliateur" : "Médiateur"}</Label>
          <NativeSelect
            id="mediateur_id"
            required
            value={dossier.mediateur_id}
            onChange={(event) => changerDossier("mediateur_id", event.target.value)}
            className="w-full"
          >
            <NativeSelectOption value="" disabled>
              {conciliation ? "Choisir un conciliateur" : "Choisir un médiateur"}
            </NativeSelectOption>
            {proposes.map((intervenant) => (
              <NativeSelectOption key={intervenant.id} value={intervenant.id}>
                {intervenant.nom}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {proposes.length === 0 && (
            <p className="text-sm text-destructive">
              Aucun {conciliation ? "conciliateur" : "médiateur"} enregistré.
            </p>
          )}
        </div>
      </fieldset>

      {(["demandeur", "defendeur"] as const).map((role) => {
        const duRole = parties.filter((partie) => partie.role === role)
        return (
          <fieldset key={role} className="flex flex-col gap-4">
            <legend className="mb-3 text-lg font-bold">
              {role === "demandeur" ? "Demandeurs" : "Défendeurs"}
            </legend>
            {duRole.map((partie, index) => (
              <FichePartie
                key={partie.cle}
                partie={partie}
                titre={`${LIBELLES_ROLE[role]} ${duRole.length > 1 ? index + 1 : ""}`.trim()}
                retirable={duRole.length > 1}
                coordonneesOuvertes={coordonneesOuvertes.includes(partie.cle)}
                onChange={(champ, valeur) => changerPartie(partie.cle, champ, valeur)}
                onRetirer={() => retirerPartie(partie.cle)}
                onBasculerCoordonnees={() => basculerCoordonnees(partie.cle)}
              />
            ))}
            <Button type="button" variant="outline" className="self-start" onClick={() => ajouterPartie(role)}>
              <PlusIcon aria-hidden />
              {role === "demandeur" ? "Ajouter un demandeur" : "Ajouter un défendeur"}
            </Button>
          </fieldset>
        )
      })}

      {plusDeDeuxParties && (
        <fieldset className="flex flex-col gap-2 rounded-sm border-l-4 border-information bg-muted p-4">
          <legend className="sr-only">Co-médiation</legend>
          <Label htmlFor="co_mediateur_id">
            {conciliation ? "Co-conciliateur (facultatif)" : "Co-médiateur (facultatif)"}
          </Label>
          <p className="text-sm text-muted-foreground" id="aide-co">
            Le dossier compte {parties.length} parties : un second intervenant peut être désigné.
          </p>
          <NativeSelect
            id="co_mediateur_id"
            aria-describedby="aide-co"
            value={dossier.co_mediateur_id}
            onChange={(event) => changerDossier("co_mediateur_id", event.target.value)}
            className="w-full bg-background sm:w-96"
          >
            <NativeSelectOption value="">Aucun</NativeSelectOption>
            {coProposes.map((intervenant) => (
              <NativeSelectOption key={intervenant.id} value={intervenant.id}>
                {intervenant.nom}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </fieldset>
      )}

      {erreur && (
        <p role="alert" className="font-medium text-destructive">
          {erreur}
        </p>
      )}

      <Button type="submit" size="lg" disabled={enCours} className="self-start">
        {enCours ? "Création…" : "Créer le dossier"}
      </Button>
    </form>
  )
}

function FichePartie({
  partie,
  titre,
  retirable,
  coordonneesOuvertes,
  onChange,
  onRetirer,
  onBasculerCoordonnees,
}: {
  partie: PartieSaisie
  titre: string
  retirable: boolean
  coordonneesOuvertes: boolean
  onChange: (champ: keyof PartieSaisie, valeur: string) => void
  onRetirer: () => void
  onBasculerCoordonnees: () => void
}) {
  const id = (champ: string) => `${partie.cle}-${champ}`
  return (
    <div className="flex flex-col gap-4 rounded-sm border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold">{titre}</h3>
        {retirable && (
          <Button type="button" variant="ghost" size="sm" onClick={onRetirer}>
            Retirer<span className="sr-only"> {titre}</span>
          </Button>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Champ id={id("nom")} libelle="Nom" requis valeur={partie.nom} onChange={(v) => onChange("nom", v)} />
        <Champ id={id("prenom")} libelle="Prénom" requis valeur={partie.prenom} onChange={(v) => onChange("prenom", v)} />
        <Champ id={id("avocat")} libelle="Avocat (facultatif)" valeur={partie.avocat_nom}
          onChange={(v) => onChange("avocat_nom", v)} />
      </div>
      <Button
        type="button"
        variant="link"
        className="h-auto self-start px-0"
        aria-expanded={coordonneesOuvertes}
        aria-controls={id("coordonnees")}
        onClick={onBasculerCoordonnees}
      >
        {coordonneesOuvertes ? "Masquer les coordonnées connues" : "Ajouter des coordonnées connues"}
      </Button>
      {coordonneesOuvertes && (
        <div id={id("coordonnees")} className="grid gap-4 sm:grid-cols-2">
          <Champ id={id("telephone")} libelle="Téléphone" type="tel" valeur={partie.telephone}
            onChange={(v) => onChange("telephone", v)} />
          <Champ id={id("telephone-2")} libelle="Téléphone 2" type="tel" valeur={partie.telephone_2}
            onChange={(v) => onChange("telephone_2", v)} />
          <Champ id={id("email")} libelle="E-mail" type="email" valeur={partie.email}
            onChange={(v) => onChange("email", v)} />
          <Champ id={id("adresse")} libelle="Adresse" valeur={partie.adresse}
            onChange={(v) => onChange("adresse", v)} />
        </div>
      )}
    </div>
  )
}

function Champ({
  id,
  libelle,
  valeur,
  onChange,
  type = "text",
  requis = false,
  placeholder,
}: {
  id: string
  libelle: string
  valeur: string
  onChange: (valeur: string) => void
  type?: string
  requis?: boolean
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{libelle}</Label>
      <Input
        id={id}
        type={type}
        required={requis}
        placeholder={placeholder}
        value={valeur}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}
