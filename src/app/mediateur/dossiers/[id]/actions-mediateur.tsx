"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { BadgeDsfr } from "@/components/dsfr/statut-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LIBELLES_ISSUE } from "@/lib/statuts"
import type { Enums } from "@/lib/supabase/database.types"
import { cn } from "@/lib/utils"

import {
  ajouterCompteRendu,
  cloturerDossier,
  enregistrerSeance,
  fixerRendezVous,
  signalerAbsence,
  type Resultat,
} from "./actions"

export type CreneauPropose = {
  id: string
  libelle: string
  /** Parties (qui n'ont pas refusé) disponibles sur ce créneau */
  disponibles: string[]
}

export type PartieAction = {
  id: string
  nom: string
  refus: boolean
  preference: string | null
}

type Action = "rdv" | "reunion_information" | "seance" | "absence" | "compte_rendu" | "cloture"

const ISSUES: Enums<"issue_dossier">[] = ["accord_total", "accord_partiel", "echec", "carence", "refus"]

export function ActionsMediateur({
  dossierId,
  mode,
  aujourdhui,
  creneaux,
  nbParticipants,
  parties,
  rdvActuel,
}: {
  dossierId: string
  mode: Enums<"mode_amiable">
  /** Date du jour à La Réunion (AAAA-MM-JJ), fournie par le serveur */
  aujourdhui: string
  creneaux: CreneauPropose[]
  nbParticipants: number
  parties: PartieAction[]
  rdvActuel: { creneauId: string; format: Enums<"format_rdv"> | null; lieu: Enums<"lieu_rdv"> | null } | null
}) {
  const router = useRouter()
  const [ouverte, setOuverte] = useState<Action | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, demarrer] = useTransition()
  const procedure = mode === "conciliation" ? "conciliation" : "médiation"

  const ACTIONS: { id: Action; libelle: string }[] = [
    { id: "rdv", libelle: rdvActuel ? "Modifier le premier rendez-vous" : "Fixer le premier rendez-vous" },
    { id: "reunion_information", libelle: "Réunion d'information tenue" },
    { id: "seance", libelle: "Séance tenue" },
    { id: "absence", libelle: "Partie absente" },
    { id: "compte_rendu", libelle: "Ajouter un compte rendu" },
    { id: "cloture", libelle: "Clôturer le dossier" },
  ]

  function ouvrir(action: Action) {
    setErreur(null)
    setOuverte((actuelle) => (actuelle === action ? null : action))
  }

  function executer(appel: () => Promise<Resultat>, succes: string) {
    setErreur(null)
    demarrer(async () => {
      const { erreur: message } = await appel()
      if (message) return setErreur(message)
      toast.success(succes)
      setOuverte(null)
      router.refresh()
    })
  }

  const titre = ACTIONS.find((action) => action.id === ouverte)?.libelle

  return (
    <section aria-labelledby="titre-actions" className="flex flex-col gap-4">
      <h2 id="titre-actions" className="text-xl font-bold">
        Actions
      </h2>
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((action) => (
          <Button
            key={action.id}
            variant={ouverte === action.id ? "default" : "outline"}
            aria-expanded={ouverte === action.id}
            aria-controls="panneau-action"
            onClick={() => ouvrir(action.id)}
          >
            {action.libelle}
          </Button>
        ))}
      </div>

      {ouverte && (
        <Card id="panneau-action" className="border-t-4 border-primary">
          <CardHeader>
            <CardTitle className="text-lg">{titre}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {ouverte === "rdv" && (
              <FormulaireRendezVous
                creneaux={creneaux}
                nbParticipants={nbParticipants}
                parties={parties}
                rdvActuel={rdvActuel}
                enCours={enCours}
                onValider={(saisie) =>
                  executer(() => fixerRendezVous(dossierId, saisie), "Premier rendez-vous enregistré.")
                }
              />
            )}
            {(ouverte === "reunion_information" || ouverte === "seance") && (
              <FormulaireSeance
                key={ouverte}
                aujourdhui={aujourdhui}
                parties={parties}
                enCours={enCours}
                onValider={(date, presents) =>
                  executer(
                    () => enregistrerSeance(dossierId, { type: ouverte, date, presents }),
                    ouverte === "seance" ? "Séance enregistrée." : "Réunion d'information enregistrée."
                  )
                }
              />
            )}
            {ouverte === "absence" && (
              <FormulaireAbsence
                parties={parties}
                enCours={enCours}
                onValider={(partieId) =>
                  executer(() => signalerAbsence(dossierId, partieId), "Absence enregistrée.")
                }
              />
            )}
            {ouverte === "compte_rendu" && (
              <FormulaireCompteRendu
                procedure={procedure}
                enCours={enCours}
                onValider={(texte) =>
                  executer(() => ajouterCompteRendu(dossierId, texte), "Compte rendu ajouté.")
                }
              />
            )}
            {ouverte === "cloture" && (
              <FormulaireCloture
                aujourdhui={aujourdhui}
                enCours={enCours}
                onValider={(issue, date) =>
                  executer(() => cloturerDossier(dossierId, { issue, date }), "Dossier clôturé.")
                }
              />
            )}
            {erreur && (
              <p role="alert" className="font-medium text-destructive">
                {erreur}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------

function FormulaireRendezVous({
  creneaux,
  nbParticipants,
  parties,
  rdvActuel,
  enCours,
  onValider,
}: {
  creneaux: CreneauPropose[]
  nbParticipants: number
  parties: PartieAction[]
  rdvActuel: { creneauId: string; format: Enums<"format_rdv"> | null; lieu: Enums<"lieu_rdv"> | null } | null
  enCours: boolean
  onValider: (saisie: Parameters<typeof fixerRendezVous>[1]) => void
}) {
  // Proposition automatique : le rendez-vous actuel, sinon le créneau où le plus de parties sont disponibles
  const [choix, setChoix] = useState<string>(rdvActuel?.creneauId ?? creneaux[0]?.id ?? "autre")
  const [autre, setAutre] = useState({ date: "", debut: "09:00", fin: "12:00" })
  const [format, setFormat] = useState<Enums<"format_rdv"> | null>(rdvActuel?.format ?? null)
  const [lieu, setLieu] = useState<Enums<"lieu_rdv"> | null>(rdvActuel?.lieu ?? null)
  const [manque, setManque] = useState(false)

  function valider(event: React.FormEvent) {
    event.preventDefault()
    if (!format || !lieu || (choix === "autre" && !autre.date)) return setManque(true)
    onValider({
      creneauId: choix === "autre" ? null : choix,
      autre: choix === "autre" ? autre : null,
      format,
      lieu,
    })
  }

  return (
    <form onSubmit={valider} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex flex-col gap-6">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-bold">Date</legend>
          {creneaux.map((creneau, index) => {
            const commun = nbParticipants > 0 && creneau.disponibles.length === nbParticipants
            return (
              <Option key={creneau.id} name="creneau" checked={choix === creneau.id} onChange={() => setChoix(creneau.id)}>
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  {creneau.libelle}
                  {rdvActuel?.creneauId === creneau.id && <BadgeDsfr type="succes">Rendez-vous actuel</BadgeDsfr>}
                  {commun && <BadgeDsfr type="information">Commun à toutes les parties</BadgeDsfr>}
                  {index === 0 && !rdvActuel && <BadgeDsfr type="neutre">Proposé</BadgeDsfr>}
                </span>
                <span className="text-sm text-muted-foreground">
                  {creneau.disponibles.length}/{nbParticipants} partie(s) disponible(s)
                  {creneau.disponibles.length > 0 && ` : ${creneau.disponibles.join(", ")}`}
                </span>
              </Option>
            )
          })}
          <Option name="creneau" checked={choix === "autre"} onChange={() => setChoix("autre")}>
            <span className="font-medium">Autre date</span>
          </Option>
          {choix === "autre" && (
            <div className="grid gap-4 border-l-4 border-primary pl-4 sm:grid-cols-3">
              <Champ id="rdv-date" libelle="Date" type="date" valeur={autre.date}
                onChange={(date) => setAutre((a) => ({ ...a, date }))} />
              <Champ id="rdv-debut" libelle="Début" type="time" valeur={autre.debut}
                onChange={(debut) => setAutre((a) => ({ ...a, debut }))} />
              <Champ id="rdv-fin" libelle="Fin" type="time" valeur={autre.fin}
                onChange={(fin) => setAutre((a) => ({ ...a, fin }))} />
            </div>
          )}
        </fieldset>

        <div className="grid gap-6 sm:grid-cols-2">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-bold">Format</legend>
            <Option name="format" checked={format === "ensemble"} onChange={() => setFormat("ensemble")}>
              Parties reçues ensemble
            </Option>
            <Option name="format" checked={format === "separe"} onChange={() => setFormat("separe")}>
              Parties reçues séparément
            </Option>
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-bold">Lieu</legend>
            <Option name="lieu" checked={lieu === "presentiel"} onChange={() => setLieu("presentiel")}>
              En personne
            </Option>
            <Option name="lieu" checked={lieu === "distanciel"} onChange={() => setLieu("distanciel")}>
              À distance (visio ou téléphone)
            </Option>
          </fieldset>
        </div>

        {manque && (
          <p role="alert" className="font-medium text-destructive">
            Choisissez la date, le format et le lieu.
          </p>
        )}
        <Button type="submit" disabled={enCours} className="self-start">
          {enCours ? "Enregistrement…" : "Enregistrer le rendez-vous"}
        </Button>
      </div>

      <aside aria-label="Préférences des parties" className="flex flex-col gap-3 rounded-sm bg-muted p-4">
        <h3 className="font-bold">Préférences des parties</h3>
        <ul className="flex flex-col gap-3 text-sm">
          {parties.map((partie) => (
            <li key={partie.id}>
              <span className="font-medium">{partie.nom}</span>
              <span className="block text-muted-foreground">
                {partie.refus ? "A refusé" : (partie.preference ?? "Pas encore de préférence")}
              </span>
            </li>
          ))}
        </ul>
      </aside>
    </form>
  )
}

function FormulaireSeance({
  aujourdhui,
  parties,
  enCours,
  onValider,
}: {
  aujourdhui: string
  parties: PartieAction[]
  enCours: boolean
  onValider: (date: string, presents: string[]) => void
}) {
  const [date, setDate] = useState(aujourdhui)
  const [presents, setPresents] = useState(parties.filter((p) => !p.refus).map((p) => p.id))

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onValider(date, presents)
      }}
      className="flex flex-col gap-6"
    >
      <Champ id="seance-date" libelle="Date" type="date" valeur={date} onChange={setDate} className="sm:w-60" />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-bold">Parties présentes</legend>
        {parties.map((partie) => (
          <Label key={partie.id} className="flex min-h-10 cursor-pointer items-center gap-3 font-normal">
            <Checkbox
              checked={presents.includes(partie.id)}
              onCheckedChange={(coche) =>
                setPresents((actuels) => (coche ? [...actuels, partie.id] : actuels.filter((id) => id !== partie.id)))
              }
            />
            {partie.nom}
          </Label>
        ))}
      </fieldset>
      <Button type="submit" disabled={enCours || !date} className="self-start">
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  )
}

function FormulaireAbsence({
  parties,
  enCours,
  onValider,
}: {
  parties: PartieAction[]
  enCours: boolean
  onValider: (partieId: string) => void
}) {
  const [partieId, setPartieId] = useState<string | null>(null)
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (partieId) onValider(partieId)
      }}
      className="flex flex-col gap-6"
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-bold">Quelle partie était absente ?</legend>
        {parties.map((partie) => (
          <Option key={partie.id} name="absente" checked={partieId === partie.id} onChange={() => setPartieId(partie.id)}>
            {partie.nom}
          </Option>
        ))}
      </fieldset>
      <Button type="submit" disabled={enCours || !partieId} className="self-start">
        {enCours ? "Enregistrement…" : "Enregistrer l'absence"}
      </Button>
    </form>
  )
}

function FormulaireCompteRendu({
  procedure,
  enCours,
  onValider,
}: {
  procedure: string
  enCours: boolean
  onValider: (texte: string) => void
}) {
  const [texte, setTexte] = useState("")
  const MAX = 2000
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onValider(texte)
      }}
      className="flex flex-col gap-4"
    >
      <div role="note" className="flex flex-col gap-1 border-l-4 border-information bg-[#e8edff] p-4">
        <p className="font-bold text-[#0063cb]">Rappel : confidentialité</p>
        <p className="text-sm">
          Le contenu des échanges en {procedure} reste confidentiel et ne doit pas figurer dans le
          compte rendu. Indiquez seulement des faits : dates, parties présentes, poursuite ou non
          de la {procedure}, existence d&apos;un accord.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="compte-rendu">Compte rendu</Label>
        <textarea
          id="compte-rendu"
          aria-describedby="compte-rendu-aide"
          value={texte}
          maxLength={MAX}
          rows={5}
          onChange={(event) => setTexte(event.target.value)}
          className="w-full rounded-sm border border-input bg-transparent px-3 py-2 text-base"
        />
        <p id="compte-rendu-aide" className="text-sm text-muted-foreground">
          Texte court · {texte.length}/{MAX} caractères
        </p>
      </div>
      <Button type="submit" disabled={enCours || !texte.trim()} className="self-start">
        {enCours ? "Enregistrement…" : "Ajouter le compte rendu"}
      </Button>
    </form>
  )
}

function FormulaireCloture({
  aujourdhui,
  enCours,
  onValider,
}: {
  aujourdhui: string
  enCours: boolean
  onValider: (issue: Enums<"issue_dossier">, date: string) => void
}) {
  const [issue, setIssue] = useState<Enums<"issue_dossier"> | null>(null)
  const [date, setDate] = useState(aujourdhui)
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (issue && date) onValider(issue, date)
      }}
      className="flex flex-col gap-6"
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-bold">Issue</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {ISSUES.map((valeur) => (
            <Option key={valeur} name="issue" checked={issue === valeur} onChange={() => setIssue(valeur)}>
              {LIBELLES_ISSUE[valeur]}
            </Option>
          ))}
        </div>
      </fieldset>
      <Champ id="cloture-date" libelle="Date de clôture" type="date" valeur={date} onChange={setDate} className="sm:w-60" />
      <p className="border-l-4 border-avertissement bg-[#ffe9e6] p-3 text-sm">
        Une fois clôturé, le dossier passe en lecture seule : aucune action ne sera plus possible.
      </p>
      <Button type="submit" disabled={enCours || !issue || !date} className="self-start">
        {enCours ? "Clôture…" : "Clôturer le dossier"}
      </Button>
    </form>
  )
}

// ---------------------------------------------------------------------------

function Option({
  name,
  checked,
  onChange,
  children,
}: {
  name: string
  checked: boolean
  onChange: () => void
  children: React.ReactNode
}) {
  return (
    <label
      className={cn(
        "flex min-h-10 cursor-pointer items-start gap-3 rounded-sm border px-3 py-2",
        checked ? "border-primary bg-secondary" : "border-input"
      )}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-1 size-4 shrink-0 accent-primary" />
      <span className="flex flex-col gap-0.5">{children}</span>
    </label>
  )
}

function Champ({
  id,
  libelle,
  valeur,
  onChange,
  type = "text",
  className,
}: {
  id: string
  libelle: string
  valeur: string
  onChange: (valeur: string) => void
  type?: string
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id}>{libelle}</Label>
      <Input id={id} type={type} value={valeur} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}
