"use client"

import { CircleCheckIcon } from "lucide-react"
import Link from "next/link"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

import { envoyerReponse, verifierNom } from "./actions"
import type { JourCreneaux } from "./dates"
import {
  normaliserTelephone,
  verifierCoordonnees,
  type ErreursCoordonnees,
} from "./validation"

const TITRES_ETAPES = ["Vérification", "Vos coordonnées", "Votre accord", "Vos disponibilités"]

type Props = {
  token: string
  numeroRg: string
  jours: JourCreneaux[]
}

// Parcours en 4 étapes. Le nom saisi à l'étape 1 est renvoyé avec la réponse
// finale : le serveur le revérifie avant d'enregistrer.
export function ParcoursPartie({ token, numeroRg, jours }: Props) {
  const [etape, setEtape] = useState(1)
  const [nom, setNom] = useState("")
  const [telephone, setTelephone] = useState("")
  const [email, setEmail] = useState("")
  const [consentement, setConsentement] = useState(false)
  const [choix, setChoix] = useState<string[]>([])

  const [erreur, setErreur] = useState<string | null>(null)
  const [erreursCoordonnees, setErreursCoordonnees] = useState<ErreursCoordonnees>({})
  const [enCours, startTransition] = useTransition()
  const [rdv, setRdv] = useState<string | null | undefined>(undefined)

  function allerA(nouvelleEtape: number) {
    setErreur(null)
    setEtape(nouvelleEtape)
    window.scrollTo(0, 0)
  }

  function validerNom(event: React.FormEvent) {
    event.preventDefault()
    if (!nom.trim()) return setErreur("Écrivez votre nom de famille.")
    startTransition(async () => {
      const resultat = await verifierNom(token, nom)
      if (resultat.erreur) setErreur(resultat.erreur)
      else allerA(2)
    })
  }

  function validerCoordonnees(event: React.FormEvent) {
    event.preventDefault()
    const erreurs = verifierCoordonnees(telephone, email)
    setErreursCoordonnees(erreurs)
    if (!erreurs.telephone && !erreurs.email) allerA(3)
  }

  function validerConsentement(event: React.FormEvent) {
    event.preventDefault()
    if (!consentement) return setErreur("Cochez la case pour continuer.")
    allerA(4)
  }

  function envoyer(event: React.FormEvent) {
    event.preventDefault()
    startTransition(async () => {
      const resultat = await envoyerReponse(token, {
        nom,
        telephone,
        email,
        consentement,
        creneauIds: choix,
      })
      if (resultat.erreur !== null) return setErreur(resultat.erreur)
      setRdv(resultat.rdv)
      window.scrollTo(0, 0)
    })
  }

  function basculerCreneau(id: string, coche: boolean) {
    setChoix((actuels) => (coche ? [...actuels, id] : actuels.filter((c) => c !== id)))
  }

  // Écran final
  if (rdv !== undefined) {
    const creneauxChoisis = jours
      .flatMap((jour) => jour.creneaux)
      .filter((creneau) => choix.includes(creneau.id))

    return (
      <section className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <CircleCheckIcon className="size-16 text-green-600" aria-hidden />
          <h1 className="text-2xl font-semibold">Merci, c&apos;est envoyé&nbsp;!</h1>
          <p className="text-lg">
            {rdv
              ? "Votre rendez-vous de médiation est fixé\u00a0:"
              : "Le médiateur vous contactera prochainement."}
          </p>
          {rdv && <p className="text-xl font-semibold">{rdv}</p>}
        </div>

        <Card>
          <CardContent className="flex flex-col gap-4 text-base">
            <h2 className="text-lg font-semibold">Récapitulatif</h2>
            <Ligne titre="Dossier">n° {numeroRg}</Ligne>
            <Ligne titre="Téléphone">{normaliserTelephone(telephone)}</Ligne>
            <Ligne titre="E-mail">{email.trim() || "Non renseigné"}</Ligne>
            <Ligne titre="Vos disponibilités">
              {creneauxChoisis.length > 0 ? (
                <ul className="flex flex-col gap-1">
                  {creneauxChoisis.map((creneau) => (
                    <li key={creneau.id}>{creneau.libelle}</li>
                  ))}
                </ul>
              ) : (
                "Aucune date choisie"
              )}
            </Ligne>
          </CardContent>
        </Card>

        <p className="text-center text-lg">Vous pouvez fermer cette page.</p>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <BarreProgression etape={etape} />

      {etape === 1 && (
        <form onSubmit={validerNom} noValidate className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold">Dossier n° {numeroRg}</h1>
            <p className="text-lg">
              Pour commencer, écrivez votre nom de famille.
            </p>
          </div>
          <Champ id="nom" label="Votre nom de famille">
            <Input
              id="nom"
              value={nom}
              onChange={(event) => setNom(event.target.value)}
              autoComplete="family-name"
              autoCapitalize="characters"
              aria-invalid={Boolean(erreur)}
              className="h-14 text-lg md:text-lg"
            />
          </Champ>
          <MessageErreur erreur={erreur} />
          <GrandBouton disabled={enCours}>
            {enCours ? "Vérification…" : "Continuer"}
          </GrandBouton>
          <Link
            href={`/p/${token}/avocat`}
            className="rounded-lg border-2 border-primary p-4 text-center text-lg font-medium text-primary underline-offset-4 hover:underline"
          >
            Vous êtes l&apos;avocat de cette partie&nbsp;? Cliquez ici
          </Link>
        </form>
      )}

      {etape === 2 && (
        <form onSubmit={validerCoordonnees} noValidate className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold">Comment vous joindre&nbsp;?</h1>
            <p className="text-lg">Le médiateur vous contactera avec ces coordonnées.</p>
          </div>
          <Champ id="telephone" label="Votre téléphone" erreur={erreursCoordonnees.telephone}>
            <Input
              id="telephone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0692 12 34 56"
              value={telephone}
              onChange={(event) => setTelephone(event.target.value)}
              aria-invalid={Boolean(erreursCoordonnees.telephone)}
              className="h-14 text-lg md:text-lg"
            />
          </Champ>
          <Champ
            id="email"
            label="Votre e-mail (si vous en avez un)"
            erreur={erreursCoordonnees.email}
          >
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="nom@exemple.fr"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(erreursCoordonnees.email)}
              className="h-14 text-lg md:text-lg"
            />
          </Champ>
          <GrandBouton>Continuer</GrandBouton>
          <BoutonRetour onClick={() => allerA(1)} />
        </form>
      )}

      {etape === 3 && (
        <form onSubmit={validerConsentement} noValidate className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold">Votre accord</h1>
            <p className="text-lg">
              Vos coordonnées seront transmises <strong>uniquement</strong> au médiateur
              désigné par le juge. Il s&apos;en servira seulement pour organiser la
              médiation.
            </p>
          </div>
          <label
            className={cn(
              "flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 text-lg",
              consentement ? "border-primary bg-primary/5" : "border-input",
              erreur && "border-destructive"
            )}
          >
            <Checkbox
              checked={consentement}
              onCheckedChange={(coche) => {
                setConsentement(coche)
                setErreur(null)
              }}
              aria-invalid={Boolean(erreur)}
              className="mt-1 size-6 [&_svg]:size-5"
            />
            J&apos;accepte que mes coordonnées soient transmises au médiateur.
          </label>
          <MessageErreur erreur={erreur} />
          <GrandBouton>Continuer</GrandBouton>
          <BoutonRetour onClick={() => allerA(2)} />
        </form>
      )}

      {etape === 4 && (
        <form onSubmit={envoyer} noValidate className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold">Quand êtes-vous disponible&nbsp;?</h1>
            <p className="text-lg">
              {jours.length > 0
                ? "Cochez toutes les dates qui vous conviennent pour le premier rendez-vous."
                : "Le médiateur n'a pas encore proposé de dates. Envoyez vos réponses : il vous contactera."}
            </p>
          </div>

          {jours.map((jour) => (
            <fieldset key={jour.jour} className="flex flex-col gap-3">
              <legend className="mb-3 text-lg font-semibold">{jour.jour}</legend>
              {jour.creneaux.map((creneau) => {
                const coche = choix.includes(creneau.id)
                return (
                  <label
                    key={creneau.id}
                    className={cn(
                      "flex min-h-14 cursor-pointer items-center gap-4 rounded-lg border-2 px-4 py-3 text-lg",
                      coche ? "border-primary bg-primary/5" : "border-input"
                    )}
                  >
                    <Checkbox
                      checked={coche}
                      onCheckedChange={(valeur) => basculerCreneau(creneau.id, valeur)}
                      className="size-6 [&_svg]:size-5"
                    />
                    {creneau.heures}
                  </label>
                )
              })}
            </fieldset>
          ))}

          {jours.length > 0 && choix.length === 0 && (
            <p className="text-base text-muted-foreground">
              Aucune date ne vous convient&nbsp;? Envoyez quand même&nbsp;: le médiateur vous
              proposera une autre date.
            </p>
          )}

          <MessageErreur erreur={erreur} />
          <GrandBouton disabled={enCours}>
            {enCours ? "Envoi en cours…" : "Envoyer mes réponses"}
          </GrandBouton>
          <BoutonRetour onClick={() => allerA(3)} disabled={enCours} />
        </form>
      )}
    </section>
  )
}

function BarreProgression({ etape }: { etape: number }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-base font-medium">
        Étape {etape} sur {TITRES_ETAPES.length} : {TITRES_ETAPES[etape - 1]}
      </p>
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={TITRES_ETAPES.length}
        aria-valuenow={etape}
        aria-label="Progression"
        className="flex gap-2"
      >
        {TITRES_ETAPES.map((titre, index) => (
          <div
            key={titre}
            className={cn("h-2 flex-1 rounded-full", index < etape ? "bg-primary" : "bg-muted")}
          />
        ))}
      </div>
    </div>
  )
}

function Champ({
  id,
  label,
  erreur,
  children,
}: {
  id: string
  label: string
  erreur?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-lg">
        {label}
      </Label>
      {children}
      <MessageErreur erreur={erreur} />
    </div>
  )
}

function MessageErreur({ erreur }: { erreur?: string | null }) {
  if (!erreur) return null
  return (
    <p role="alert" className="text-base font-medium text-destructive">
      {erreur}
    </p>
  )
}

function GrandBouton({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <Button type="submit" disabled={disabled} className="h-14 w-full text-lg">
      {children}
    </Button>
  )
}

function BoutonRetour({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      disabled={disabled}
      className="h-12 w-full text-lg"
    >
      Retour
    </Button>
  )
}

function Ligne({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted-foreground">{titre}</span>
      <div className="font-medium">{children}</div>
    </div>
  )
}
