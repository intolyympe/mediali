"use client"

import { CircleCheckIcon, PrinterIcon } from "lucide-react"
import Link from "next/link"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { cn } from "@/lib/utils"

import type { JourCreneaux } from "../dates"
import { normaliserTelephone } from "../validation"
import { envoyerReponseAvocat, verifierDossier } from "./actions"
import {
  BARREAUX,
  verifierAvocat,
  verifierClient,
  type ErreursAvocat,
  type ErreursClient,
} from "./validation"

const TITRES_ETAPES = ["Vérification", "Vos coordonnées", "Votre client", "Accord", "Disponibilités"]

const formatEnvoi = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Indian/Reunion",
})

type Props = {
  token: string
  jours: JourCreneaux[]
}

// Parcours en 5 étapes. Le numéro RG et le nom saisis à l'étape 1 sont
// renvoyés avec la réponse finale : le serveur les revérifie avant d'enregistrer.
export function ParcoursAvocat({ token, jours }: Props) {
  const [etape, setEtape] = useState(1)
  const [numeroRg, setNumeroRg] = useState("")
  const [nomClient, setNomClient] = useState("")
  const [avocat, setAvocat] = useState({
    nom: "",
    email: "",
    telephone: "",
    barreau: BARREAUX[0],
  })
  const [client, setClient] = useState({ telephone: "", email: "", passerParAvocat: false })
  const [consentement, setConsentement] = useState(false)
  const [choix, setChoix] = useState<string[]>([])

  const [erreur, setErreur] = useState<string | null>(null)
  const [erreursAvocat, setErreursAvocat] = useState<ErreursAvocat>({})
  const [erreursClient, setErreursClient] = useState<ErreursClient>({})
  const [enCours, startTransition] = useTransition()
  const [envoi, setEnvoi] = useState<{ rdv: string | null; le: string } | null>(null)

  function allerA(nouvelleEtape: number) {
    setErreur(null)
    setEtape(nouvelleEtape)
    window.scrollTo(0, 0)
  }

  function validerDossier(event: React.FormEvent) {
    event.preventDefault()
    if (!numeroRg.trim() || !nomClient.trim()) {
      return setErreur("Remplissez les deux champs.")
    }
    startTransition(async () => {
      const resultat = await verifierDossier(token, { numeroRg, nomClient })
      if (resultat.erreur !== null) return setErreur(resultat.erreur)
      setNumeroRg(resultat.numeroRg)
      setNomClient(resultat.nomClient)
      allerA(2)
    })
  }

  function validerAvocat(event: React.FormEvent) {
    event.preventDefault()
    const erreurs = verifierAvocat(avocat)
    setErreursAvocat(erreurs)
    if (Object.keys(erreurs).length === 0) allerA(3)
  }

  function validerClient(event: React.FormEvent) {
    event.preventDefault()
    const erreurs = verifierClient(client)
    setErreursClient(erreurs)
    if (Object.keys(erreurs).length === 0) allerA(4)
  }

  function validerConsentement(event: React.FormEvent) {
    event.preventDefault()
    if (!consentement) return setErreur("Cochez la case pour continuer.")
    allerA(5)
  }

  function envoyer(event: React.FormEvent) {
    event.preventDefault()
    startTransition(async () => {
      const resultat = await envoyerReponseAvocat(token, {
        numeroRg,
        nomClient,
        avocat,
        client,
        consentement,
        creneauIds: choix,
      })
      if (resultat.erreur !== null) return setErreur(resultat.erreur)
      setEnvoi({ rdv: resultat.rdv, le: formatEnvoi.format(new Date()) })
      window.scrollTo(0, 0)
    })
  }

  function basculerCreneau(id: string, coche: boolean) {
    setChoix((actuels) => (coche ? [...actuels, id] : actuels.filter((c) => c !== id)))
  }

  // Écran final : récapitulatif imprimable pour le dossier du cabinet
  if (envoi) {
    const creneauxChoisis = jours
      .flatMap((jour) => jour.creneaux)
      .filter((creneau) => choix.includes(creneau.id))

    return (
      <section className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <CircleCheckIcon className="size-16 text-green-600 print:hidden" aria-hidden />
          <h1 className="text-2xl font-semibold">Réponse transmise au médiateur</h1>
          <p className="text-lg">
            {envoi.rdv
              ? "Le rendez-vous de médiation est fixé :"
              : "Le médiateur prendra contact prochainement."}
          </p>
          {envoi.rdv && <p className="text-xl font-semibold">{envoi.rdv}</p>}
        </div>

        <Card>
          <CardContent className="flex flex-col gap-4 text-base">
            <h2 className="text-lg font-semibold">Récapitulatif</h2>
            <Ligne titre="Dossier">n° {numeroRg}</Ligne>
            <Ligne titre="Client">{nomClient}</Ligne>
            <Ligne titre="Transmis le">{envoi.le}</Ligne>
            <Ligne titre="Avocat">
              {avocat.nom.trim()}
              <br />
              Barreau : {avocat.barreau}
              <br />
              {normaliserTelephone(avocat.telephone)} · {avocat.email.trim()}
            </Ligne>
            <Ligne titre="Coordonnées du client">
              {normaliserTelephone(client.telephone) ?? "Téléphone non renseigné"}
              <br />
              {client.email.trim() || "E-mail non renseigné"}
            </Ligne>
            {client.passerParAvocat && (
              <Ligne titre="Contact">Le médiateur passe par l&apos;avocat.</Ligne>
            )}
            <Ligne titre="Disponibilités">
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

        <Button
          type="button"
          onClick={() => window.print()}
          className="h-14 w-full text-lg print:hidden"
        >
          <PrinterIcon aria-hidden />
          Imprimer le récapitulatif
        </Button>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <BarreProgression etape={etape} />

      {etape === 1 && (
        <form onSubmit={validerDossier} noValidate className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold">Répondre pour votre client</h1>
            <p className="text-lg">
              Indiquez le numéro du dossier et le nom de famille de votre client, tels
              qu&apos;ils figurent sur la notification.
            </p>
          </div>
          <Champ id="numero-rg" label="Numéro RG du dossier">
            <Input
              id="numero-rg"
              value={numeroRg}
              onChange={(event) => setNumeroRg(event.target.value)}
              placeholder="26/00123"
              autoComplete="off"
              aria-invalid={Boolean(erreur)}
              className="h-14 text-lg md:text-lg"
            />
          </Champ>
          <Champ id="nom-client" label="Nom de famille du client">
            <Input
              id="nom-client"
              value={nomClient}
              onChange={(event) => setNomClient(event.target.value)}
              autoComplete="off"
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
            href={`/p/${token}`}
            className="text-center text-lg font-medium text-primary underline underline-offset-4"
          >
            Vous êtes la partie&nbsp;? Répondre vous-même
          </Link>
        </form>
      )}

      {etape === 2 && (
        <form onSubmit={validerAvocat} noValidate className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold">Vos coordonnées</h1>
            <p className="text-lg">Dossier n° {numeroRg}</p>
          </div>
          <Champ id="avocat-nom" label="Votre nom" erreur={erreursAvocat.nom}>
            <Input
              id="avocat-nom"
              value={avocat.nom}
              onChange={(event) => setAvocat({ ...avocat, nom: event.target.value })}
              autoComplete="name"
              placeholder="Me Sophie Lebon"
              aria-invalid={Boolean(erreursAvocat.nom)}
              className="h-14 text-lg md:text-lg"
            />
          </Champ>
          <Champ id="avocat-email" label="Votre e-mail" erreur={erreursAvocat.email}>
            <Input
              id="avocat-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="nom@cabinet.fr"
              value={avocat.email}
              onChange={(event) => setAvocat({ ...avocat, email: event.target.value })}
              aria-invalid={Boolean(erreursAvocat.email)}
              className="h-14 text-lg md:text-lg"
            />
          </Champ>
          <Champ id="avocat-telephone" label="Votre téléphone" erreur={erreursAvocat.telephone}>
            <Input
              id="avocat-telephone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0262 12 34 56"
              value={avocat.telephone}
              onChange={(event) => setAvocat({ ...avocat, telephone: event.target.value })}
              aria-invalid={Boolean(erreursAvocat.telephone)}
              className="h-14 text-lg md:text-lg"
            />
          </Champ>
          <Champ id="avocat-barreau" label="Votre barreau" erreur={erreursAvocat.barreau}>
            <NativeSelect
              id="avocat-barreau"
              value={avocat.barreau}
              onChange={(event) => setAvocat({ ...avocat, barreau: event.target.value })}
              aria-invalid={Boolean(erreursAvocat.barreau)}
              className="w-full [&_select]:h-14 [&_select]:text-lg"
            >
              {BARREAUX.map((barreau) => (
                <NativeSelectOption key={barreau} value={barreau}>
                  {barreau}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Champ>
          <GrandBouton>Continuer</GrandBouton>
          <BoutonRetour onClick={() => allerA(1)} />
        </form>
      )}

      {etape === 3 && (
        <form onSubmit={validerClient} noValidate className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold">Votre client</h1>
            <p className="text-lg">Coordonnées de votre client, si vous les avez.</p>
          </div>
          <CaseACocher
            coche={client.passerParAvocat}
            onChange={(coche) => {
              setClient({ ...client, passerParAvocat: coche })
              setErreursClient({})
            }}
          >
            Mon client souhaite que le médiateur passe par moi.
          </CaseACocher>
          <Champ
            id="client-telephone"
            label={
              client.passerParAvocat
                ? "Téléphone du client (facultatif)"
                : "Téléphone du client"
            }
            erreur={erreursClient.telephone}
          >
            <Input
              id="client-telephone"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="0692 12 34 56"
              value={client.telephone}
              onChange={(event) => setClient({ ...client, telephone: event.target.value })}
              aria-invalid={Boolean(erreursClient.telephone)}
              className="h-14 text-lg md:text-lg"
            />
          </Champ>
          <Champ
            id="client-email"
            label="E-mail du client (facultatif)"
            erreur={erreursClient.email}
          >
            <Input
              id="client-email"
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder="nom@exemple.fr"
              value={client.email}
              onChange={(event) => setClient({ ...client, email: event.target.value })}
              aria-invalid={Boolean(erreursClient.email)}
              className="h-14 text-lg md:text-lg"
            />
          </Champ>
          <GrandBouton>Continuer</GrandBouton>
          <BoutonRetour onClick={() => allerA(2)} />
        </form>
      )}

      {etape === 4 && (
        <form onSubmit={validerConsentement} noValidate className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold">Accord</h1>
            <p className="text-lg">
              Ces informations seront transmises <strong>uniquement</strong> au médiateur
              désigné par le juge, pour organiser la médiation.
            </p>
          </div>
          <CaseACocher
            coche={consentement}
            invalide={Boolean(erreur)}
            onChange={(coche) => {
              setConsentement(coche)
              setErreur(null)
            }}
          >
            J&apos;agis pour le compte de mon client et j&apos;accepte que ces informations
            soient transmises au médiateur désigné.
          </CaseACocher>
          <MessageErreur erreur={erreur} />
          <GrandBouton>Continuer</GrandBouton>
          <BoutonRetour onClick={() => allerA(3)} />
        </form>
      )}

      {etape === 5 && (
        <form onSubmit={envoyer} noValidate className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold">Disponibilités</h1>
            <p className="text-lg">
              {jours.length > 0
                ? "Cochez toutes les dates qui conviennent pour le premier rendez-vous."
                : "Le médiateur n'a pas encore proposé de dates. Envoyez la réponse : il prendra contact."}
            </p>
          </div>

          {jours.map((jour) => (
            <fieldset key={jour.jour} className="flex flex-col gap-3">
              <legend className="mb-3 text-lg font-semibold">{jour.jour}</legend>
              {jour.creneaux.map((creneau) => (
                <CaseACocher
                  key={creneau.id}
                  coche={choix.includes(creneau.id)}
                  onChange={(coche) => basculerCreneau(creneau.id, coche)}
                >
                  {creneau.heures}
                </CaseACocher>
              ))}
            </fieldset>
          ))}

          {jours.length > 0 && choix.length === 0 && (
            <p className="text-base text-muted-foreground">
              Aucune date ne convient&nbsp;? Envoyez quand même&nbsp;: le médiateur
              proposera une autre date.
            </p>
          )}

          <MessageErreur erreur={erreur} />
          <GrandBouton disabled={enCours}>
            {enCours ? "Envoi en cours…" : "Envoyer la réponse"}
          </GrandBouton>
          <BoutonRetour onClick={() => allerA(4)} disabled={enCours} />
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

function CaseACocher({
  coche,
  invalide,
  onChange,
  children,
}: {
  coche: boolean
  invalide?: boolean
  onChange: (coche: boolean) => void
  children: React.ReactNode
}) {
  return (
    <label
      className={cn(
        "flex min-h-14 cursor-pointer items-start gap-4 rounded-lg border-2 px-4 py-3 text-lg",
        coche ? "border-primary bg-primary/5" : "border-input",
        invalide && "border-destructive"
      )}
    >
      <Checkbox
        checked={coche}
        onCheckedChange={onChange}
        aria-invalid={invalide}
        className="mt-1 size-6 [&_svg]:size-5"
      />
      <span>{children}</span>
    </label>
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
