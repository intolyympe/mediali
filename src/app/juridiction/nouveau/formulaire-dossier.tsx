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

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
    juridiction: "Cour d'appel de démonstration",
    date_ordonnance: "",
    mediateur_id: "",
    co_mediateur_id: "",
  })
  const [parties, setParties] = useState([partieVide("p1", "demandeur"), partieVide("p2", "defendeur")])
  const [coordonneesOuvertes, setCoordonneesOuvertes] = useState<string[]>([])
  const [erreur, setErreur] = useState<string | null>(null)
  // Erreurs par champ, indexées par l'id du champ (mêmes règles que le serveur)
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [enCours, demarrer] = useTransition()
  const compteur = useRef(3)

  const fonction = FONCTION_PAR_MODE[dossier.mode]
  const conciliation = dossier.mode === "conciliation"
  const proposes = intervenants.filter((intervenant) => intervenant.fonction === fonction)
  const coProposes = proposes.filter((intervenant) => intervenant.id !== dossier.mediateur_id)
  const plusDeDeuxParties = parties.length > 2

  function effacerErreur(id: string) {
    setErreurs((actuelles) => {
      if (!(id in actuelles)) return actuelles
      const copie = { ...actuelles }
      delete copie[id]
      return copie
    })
  }

  function changerDossier(champ: keyof typeof dossier, valeur: string) {
    setDossier((actuel) => ({ ...actuel, [champ]: valeur }))
    effacerErreur(champ)
  }

  function changerMode(mode: Enums<"mode_amiable">) {
    // La liste des intervenants change : on vide les choix devenus impossibles
    setDossier((actuel) => ({ ...actuel, mode, mediateur_id: "", co_mediateur_id: "" }))
  }

  function changerPartie(cle: string, champ: keyof PartieSaisie, valeur: string) {
    setParties((actuelles) => actuelles.map((p) => (p.cle === cle ? { ...p, [champ]: valeur } : p)))
    effacerErreur(`${cle}-${champ}`)
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

  /** Erreurs par id de champ, dans l'ordre d'affichage du formulaire. */
  function verifier() {
    const trouvees: [string, string][] = []
    if (!dossier.numero_rg.trim()) trouvees.push(["numero_rg", "Indiquez le numéro RG."])
    if (!dossier.juridiction.trim()) trouvees.push(["juridiction", "Indiquez la juridiction."])
    if (!dossier.date_ordonnance) trouvees.push(["date_ordonnance", "Indiquez la date de l'ordonnance."])
    if (!dossier.mediateur_id) {
      trouvees.push(["mediateur_id", conciliation ? "Choisissez un conciliateur." : "Choisissez un médiateur."])
    }
    for (const role of ["demandeur", "defendeur"] as const) {
      for (const partie of parties.filter((p) => p.role === role)) {
        if (!partie.nom.trim()) trouvees.push([`${partie.cle}-nom`, "Indiquez le nom."])
        if (!partie.prenom.trim()) trouvees.push([`${partie.cle}-prenom`, "Indiquez le prénom."])
        if (partie.email.trim() && !EMAIL.test(partie.email.trim())) {
          trouvees.push([`${partie.cle}-email`, "Cette adresse e-mail n'est pas valide. Exemple : nom@exemple.fr."])
        }
      }
    }
    return trouvees
  }

  function envoyer(event: React.FormEvent) {
    event.preventDefault()
    if (enCours) return
    setErreur(null)
    const trouvees = verifier()
    setErreurs(Object.fromEntries(trouvees))
    if (trouvees.length > 0) {
      // Une adresse e-mail invalide est dans un bloc replié : on le rouvre
      const aRouvrir = parties.filter((p) => trouvees.some(([id]) => id === `${p.cle}-email`)).map((p) => p.cle)
      setCoordonneesOuvertes((ouvertes) => [...new Set([...ouvertes, ...aRouvrir])])
      const premier = trouvees[0][0]
      requestAnimationFrame(() => document.getElementById(premier)?.focus())
      return
    }
    const saisie: DossierSaisi = {
      ...dossier,
      co_mediateur_id: plusDeDeuxParties ? dossier.co_mediateur_id : "",
      parties,
    }
    demarrer(async () => {
      // En cas de succès, l'action redirige vers la page du dossier
      const resultat = await creerDossier(saisie)
      if (!resultat?.erreur) return
      setErreur(resultat.erreur)
      // Focus sur le message pour qu'il soit lu et visible
      requestAnimationFrame(() => document.getElementById("erreur-creation")?.focus())
    })
  }

  return (
    <form noValidate onSubmit={envoyer} className="flex flex-col gap-10">
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
        <Champ id="numero_rg" libelle="Numéro RG" requis placeholder="Ex. : 26/00123" erreur={erreurs.numero_rg}
          valeur={dossier.numero_rg} onChange={(v) => changerDossier("numero_rg", v)} />
        <Champ id="juridiction" libelle="Juridiction" requis erreur={erreurs.juridiction}
          valeur={dossier.juridiction} onChange={(v) => changerDossier("juridiction", v)} />
        <Champ id="date_ordonnance" libelle="Date de l'ordonnance" requis type="date" erreur={erreurs.date_ordonnance}
          valeur={dossier.date_ordonnance} onChange={(v) => changerDossier("date_ordonnance", v)} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="mediateur_id">{conciliation ? "Conciliateur" : "Médiateur"} (obligatoire)</Label>
          <NativeSelect
            id="mediateur_id"
            aria-invalid={erreurs.mediateur_id ? true : undefined}
            aria-describedby={erreurs.mediateur_id ? "mediateur_id-erreur" : undefined}
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
          <MessageErreur id="mediateur_id-erreur" erreur={erreurs.mediateur_id} />
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
                erreurs={erreurs}
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
        <p id="erreur-creation" role="alert" tabIndex={-1} className="font-medium text-destructive">
          {erreur}
        </p>
      )}

      <Button type="submit" size="lg" aria-disabled={enCours || undefined} className="self-start">
        {enCours ? "Création…" : "Créer le dossier"}
      </Button>
    </form>
  )
}

function FichePartie({
  partie,
  titre,
  erreurs,
  retirable,
  coordonneesOuvertes,
  onChange,
  onRetirer,
  onBasculerCoordonnees,
}: {
  partie: PartieSaisie
  titre: string
  erreurs: Record<string, string>
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
        <h2 className="font-bold">{titre}</h2>
        {retirable && (
          <Button type="button" variant="ghost" size="sm" onClick={onRetirer}>
            Retirer<span className="sr-only"> {titre}</span>
          </Button>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Champ id={id("nom")} libelle="Nom" requis erreur={erreurs[id("nom")]}
          valeur={partie.nom} onChange={(v) => onChange("nom", v)} />
        <Champ id={id("prenom")} libelle="Prénom" requis erreur={erreurs[id("prenom")]}
          valeur={partie.prenom} onChange={(v) => onChange("prenom", v)} />
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
          <Champ id={id("email")} libelle="E-mail" type="email" valeur={partie.email} erreur={erreurs[id("email")]}
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
  erreur,
}: {
  id: string
  libelle: string
  valeur: string
  onChange: (valeur: string) => void
  type?: string
  requis?: boolean
  placeholder?: string
  erreur?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {libelle}
        {requis && " (obligatoire)"}
      </Label>
      <Input
        id={id}
        type={type}
        // Coordonnées d'autres personnes : pas de remplissage automatique
        autoComplete="off"
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? `${id}-erreur` : undefined}
        placeholder={placeholder}
        value={valeur}
        onChange={(event) => onChange(event.target.value)}
      />
      <MessageErreur id={`${id}-erreur`} erreur={erreur} />
    </div>
  )
}

/** Message d'erreur annoncé (role="alert"), relié au champ par son id. */
function MessageErreur({ id, erreur }: { id: string; erreur?: string }) {
  if (!erreur) return null
  return (
    <p id={id} role="alert" className="text-sm font-medium text-destructive">
      {erreur}
    </p>
  )
}
