"use client"

import { CircleCheckIcon, PlusIcon } from "lucide-react"
import Link from "next/link"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Enums } from "@/lib/supabase/database.types"
import { cn } from "@/lib/utils"

import { envoyerRefus, envoyerReponse, verifierNom, type ResultatEnvoi } from "./actions"
import type { JourCreneaux } from "./dates"
import {
  normaliserTelephone,
  verifierCoordonnees,
  type Coordonnees,
  type ErreursCoordonnees,
} from "./validation"
import { vocabulaire, type Vocabulaire } from "./vocabulaire"

const TITRES_ETAPES = [
  "Vérification",
  "Votre choix",
  "Vos coordonnées",
  "Votre accord",
  "Votre premier rendez-vous",
  "Vos disponibilités",
]

type Choix = Enums<"choix_partie">

const TEXTES_FORMAT: Record<Enums<"preference_format">, string> = {
  ensemble: "Avec l'autre partie",
  separe: "Séparément",
  indifferent: "Peu importe",
}

const TEXTES_LIEU: Record<Enums<"preference_lieu">, string> = {
  presentiel: "En personne",
  distanciel: "À distance (visio ou téléphone)",
  indifferent: "Peu importe",
}

function textesChoix(mots: Vocabulaire): Record<Choix, { titre: string; aide: string; recap: string }> {
  return {
    information: {
      titre: "Je souhaite d'abord une réunion d'information gratuite pour comprendre la démarche",
      aide: `${majuscule(mots.leTiers)} vous expliquera comment se passe ${mots.laProcedure}. Cela ne vous engage à rien.`,
      recap: "Réunion d'information gratuite d'abord",
    },
    accepte: {
      titre: `J'accepte directement ${mots.laProcedure}`,
      aide: "Vous passez directement à l'organisation du premier rendez-vous.",
      recap: `J'accepte ${mots.laProcedure}`,
    },
    refuse: {
      titre: `Je refuse ${mots.laProcedure}`,
      aide: "Le juge sera informé de votre choix.",
      recap: `Je refuse ${mots.laProcedure}`,
    },
  }
}

const majuscule = (texte: string) => texte.charAt(0).toUpperCase() + texte.slice(1)

type Props = {
  token: string
  numeroRg: string
  mode: Enums<"mode_amiable">
  jours: JourCreneaux[]
}

// Parcours en 6 étapes (ou 2 en cas de refus). Le nom saisi à l'étape 1 est
// renvoyé avec la réponse finale : le serveur le revérifie avant d'enregistrer.
export function ParcoursPartie({ token, numeroRg, mode, jours }: Props) {
  const mots = vocabulaire(mode)
  const choixPossibles = textesChoix(mots)

  const [etape, setEtape] = useState(1)
  const [nom, setNom] = useState("")
  const [choix, setChoix] = useState<Choix | null>(null)
  const [confirmationRefus, setConfirmationRefus] = useState(false)
  const [coordonnees, setCoordonnees] = useState<Coordonnees>({
    telephone: "",
    email: "",
    telephone_2: "",
    email_2: "",
    adresse: "",
  })
  const [autreContact, setAutreContact] = useState(false)
  const [consentement, setConsentement] = useState(false)
  const [prefFormat, setPrefFormat] = useState<Enums<"preference_format"> | null>(null)
  const [prefLieu, setPrefLieu] = useState<Enums<"preference_lieu"> | null>(null)
  const [creneauxChoisis, setCreneauxChoisis] = useState<string[]>([])

  const [erreur, setErreur] = useState<string | null>(null)
  const [erreursCoordonnees, setErreursCoordonnees] = useState<ErreursCoordonnees>({})
  const [enCours, startTransition] = useTransition()
  const [resultat, setResultat] = useState<{ rdv: string | null } | null>(null)

  function allerA(nouvelleEtape: number) {
    setErreur(null)
    setEtape(nouvelleEtape)
    window.scrollTo(0, 0)
  }

  function terminer(reponse: ResultatEnvoi) {
    if (reponse.erreur !== null) return setErreur(reponse.erreur)
    setResultat({ rdv: reponse.rdv })
    window.scrollTo(0, 0)
  }

  function validerNom(event: React.FormEvent) {
    event.preventDefault()
    if (!nom.trim()) return setErreur("Écrivez votre nom de famille.")
    startTransition(async () => {
      const reponse = await verifierNom(token, nom)
      if (reponse.erreur) setErreur(reponse.erreur)
      else allerA(2)
    })
  }

  function validerChoix(event: React.FormEvent) {
    event.preventDefault()
    if (!choix) return setErreur("Choisissez une réponse pour continuer.")
    if (choix === "refuse") {
      setErreur(null)
      setConfirmationRefus(true)
      window.scrollTo(0, 0)
      return
    }
    allerA(3)
  }

  function confirmerRefus() {
    startTransition(async () => terminer(await envoyerRefus(token, nom)))
  }

  function changerCoordonnee(champ: keyof Coordonnees, valeur: string) {
    setCoordonnees((actuelles) => ({ ...actuelles, [champ]: valeur }))
    // L'erreur de ce champ disparaît dès qu'on le corrige
    setErreursCoordonnees((erreurs) => ({ ...erreurs, [champ]: undefined, general: undefined }))
  }

  function validerCoordonnees(event: React.FormEvent) {
    event.preventDefault()
    const erreurs = verifierCoordonnees(coordonnees)
    setErreursCoordonnees(erreurs)
    // Une erreur sur un champ caché : on rouvre « autre moyen de contact »
    if (erreurs.telephone_2 || erreurs.email_2 || erreurs.adresse) setAutreContact(true)
    if (Object.keys(erreurs).length === 0) allerA(4)
  }

  function validerConsentement(event: React.FormEvent) {
    event.preventDefault()
    if (!consentement) return setErreur("Cochez la case pour continuer.")
    allerA(5)
  }

  function validerPreferences(event: React.FormEvent) {
    event.preventDefault()
    if (!prefFormat || !prefLieu) return setErreur("Répondez aux deux questions pour continuer.")
    allerA(6)
  }

  function envoyer(event: React.FormEvent) {
    event.preventDefault()
    if (!choix || choix === "refuse" || !prefFormat || !prefLieu) return
    startTransition(async () =>
      terminer(
        await envoyerReponse(token, {
          nom,
          choix,
          ...coordonnees,
          consentement,
          pref_format: prefFormat,
          pref_lieu: prefLieu,
          creneauIds: creneauxChoisis,
        })
      )
    )
  }

  function basculerCreneau(id: string, coche: boolean) {
    setCreneauxChoisis((actuels) => (coche ? [...actuels, id] : actuels.filter((c) => c !== id)))
  }

  // ---------------------------------------------------------------------------
  // Écran final
  // ---------------------------------------------------------------------------
  if (resultat) {
    if (choix === "refuse") {
      return (
        <section className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <CircleCheckIcon className="size-16 text-succes" aria-hidden />
            <h1 className="text-2xl font-bold">Votre réponse est enregistrée</h1>
            <p className="text-lg">
              Vous avez refusé {mots.laProcedure}. Le juge en sera informé.
            </p>
          </div>
          <Card>
            <CardContent className="flex flex-col gap-4 text-base">
              <h2 className="text-lg font-bold">Récapitulatif</h2>
              <Ligne titre="Dossier">n° {numeroRg}</Ligne>
              <Ligne titre="Votre choix">{choixPossibles.refuse.recap}</Ligne>
            </CardContent>
          </Card>
          <p className="text-center text-lg">Vous pouvez fermer cette page.</p>
        </section>
      )
    }

    const libellesCreneaux = jours
      .flatMap((jour) => jour.creneaux)
      .filter((creneau) => creneauxChoisis.includes(creneau.id))
      .map((creneau) => creneau.libelle)
    const telephones = [coordonnees.telephone, coordonnees.telephone_2]
      .filter((t) => t.trim())
      .map((t) => normaliserTelephone(t))
    const emails = [coordonnees.email, coordonnees.email_2].map((e) => e.trim()).filter(Boolean)

    return (
      <section className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <CircleCheckIcon className="size-16 text-succes" aria-hidden />
          <h1 className="text-2xl font-bold">Merci, c&apos;est envoyé&nbsp;!</h1>
          {resultat.rdv ? (
            <>
              <p className="text-lg">Votre premier rendez-vous est fixé&nbsp;:</p>
              <p className="text-xl font-bold text-primary">{resultat.rdv}</p>
            </>
          ) : (
            <p className="text-lg">
              {majuscule(mots.leTiers)} vous contactera prochainement
              {choix === "information" ? " pour organiser la réunion d'information." : "."}
            </p>
          )}
        </div>

        <Card>
          <CardContent className="flex flex-col gap-4 text-base">
            <h2 className="text-lg font-bold">Récapitulatif</h2>
            <Ligne titre="Dossier">n° {numeroRg}</Ligne>
            <Ligne titre="Votre choix">{choix ? choixPossibles[choix].recap : "—"}</Ligne>
            <Ligne titre={telephones.length > 1 ? "Téléphones" : "Téléphone"}>
              {telephones.length > 0 ? telephones.join(" · ") : "Non renseigné"}
            </Ligne>
            <Ligne titre={emails.length > 1 ? "E-mails" : "E-mail"}>
              {emails.length > 0 ? emails.join(" · ") : "Non renseigné"}
            </Ligne>
            {coordonnees.adresse.trim() && <Ligne titre="Adresse postale">{coordonnees.adresse.trim()}</Ligne>}
            <Ligne titre="Premier rendez-vous">
              {prefFormat && TEXTES_FORMAT[prefFormat]} · {prefLieu && TEXTES_LIEU[prefLieu]}
            </Ligne>
            <Ligne titre="Vos disponibilités">
              {libellesCreneaux.length > 0 ? (
                <ul className="flex flex-col gap-1">
                  {libellesCreneaux.map((libelle) => (
                    <li key={libelle}>{libelle}</li>
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

  // ---------------------------------------------------------------------------
  // Étapes
  // ---------------------------------------------------------------------------
  return (
    <section className="flex flex-col gap-6">
      <BarreProgression etape={etape} />

      {etape === 1 && (
        <form onSubmit={validerNom} noValidate className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">Dossier n° {numeroRg}</h1>
            <p className="text-lg">
              Le juge vous propose une {mots.procedure}. Pour commencer, écrivez votre nom de
              famille.
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
          <GrandBouton disabled={enCours}>{enCours ? "Vérification…" : "Continuer"}</GrandBouton>
          <Link
            href={`/p/${token}/avocat`}
            className="rounded-sm border-2 border-primary p-4 text-center text-lg font-medium text-primary underline-offset-4 hover:underline"
          >
            Vous êtes l&apos;avocat de cette partie&nbsp;? Cliquez ici
          </Link>
        </form>
      )}

      {etape === 2 && !confirmationRefus && (
        <form onSubmit={validerChoix} noValidate className="flex flex-col gap-6">
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-4 flex flex-col gap-2">
              <span className="text-2xl font-bold">Que souhaitez-vous&nbsp;?</span>
              <span className="text-lg">
                {majuscule(mots.laProcedure)} est une démarche amiable : {mots.leTiers}{" "}
                aide les parties à trouver une solution ensemble.
              </span>
            </legend>
            {(Object.keys(choixPossibles) as Choix[]).map((valeur) => (
              <GrandChoix
                key={valeur}
                name="choix"
                checked={choix === valeur}
                onChange={() => {
                  setChoix(valeur)
                  setErreur(null)
                }}
                titre={choixPossibles[valeur].titre}
                aide={choixPossibles[valeur].aide}
              />
            ))}
          </fieldset>
          <MessageErreur erreur={erreur} />
          <GrandBouton>Continuer</GrandBouton>
          <BoutonRetour onClick={() => allerA(1)} />
        </form>
      )}

      {etape === 2 && confirmationRefus && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">Confirmez-vous votre refus&nbsp;?</h1>
            <p className="text-lg">
              Vous refusez {mots.laProcedure} proposée par le juge dans le dossier n°{" "}
              {numeroRg}. Le juge sera informé de votre choix.
            </p>
          </div>
          <MessageErreur erreur={erreur} />
          <Button size="lg" className="h-14 w-full text-lg" onClick={confirmerRefus} disabled={enCours}>
            {enCours ? "Enregistrement…" : `Oui, je refuse ${mots.laProcedure}`}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-14 w-full text-lg"
            onClick={() => {
              setConfirmationRefus(false)
              setErreur(null)
            }}
            disabled={enCours}
          >
            Non, revenir au choix
          </Button>
        </div>
      )}

      {etape === 3 && (
        <form onSubmit={validerCoordonnees} noValidate className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">Comment vous joindre&nbsp;?</h1>
            <p className="text-lg">
              Indiquez au moins un numéro de téléphone ou une adresse e-mail. Seul{" "}
              {mots.leTiers} les recevra.
            </p>
          </div>
          <ChampTexte id="telephone" label="Votre téléphone" type="tel" placeholder="0692 12 34 56"
            autoComplete="tel" valeur={coordonnees.telephone} erreur={erreursCoordonnees.telephone}
            onChange={(v) => changerCoordonnee("telephone", v)} />
          <ChampTexte id="email" label="Votre e-mail" type="email" placeholder="nom@exemple.fr"
            autoComplete="email" valeur={coordonnees.email} erreur={erreursCoordonnees.email}
            onChange={(v) => changerCoordonnee("email", v)} />
          <MessageErreur erreur={erreursCoordonnees.general} />

          <Button
            type="button"
            variant="link"
            className="h-auto self-start px-0 text-lg"
            aria-expanded={autreContact}
            aria-controls="autre-contact"
            onClick={() => setAutreContact((ouvert) => !ouvert)}
          >
            {!autreContact && <PlusIcon aria-hidden />}
            {autreContact ? "Masquer les autres moyens de contact" : "Ajouter un autre moyen de contact"}
          </Button>
          {autreContact && (
            <div id="autre-contact" className="flex flex-col gap-6 border-l-4 border-primary pl-4">
              <ChampTexte id="telephone_2" label="Autre téléphone" type="tel"
                valeur={coordonnees.telephone_2} erreur={erreursCoordonnees.telephone_2}
                onChange={(v) => changerCoordonnee("telephone_2", v)} />
              <ChampTexte id="email_2" label="Autre e-mail" type="email"
                valeur={coordonnees.email_2} erreur={erreursCoordonnees.email_2}
                onChange={(v) => changerCoordonnee("email_2", v)} />
              <ChampTexte id="adresse" label="Adresse postale" autoComplete="street-address"
                valeur={coordonnees.adresse} erreur={erreursCoordonnees.adresse}
                onChange={(v) => changerCoordonnee("adresse", v)} />
            </div>
          )}

          <GrandBouton>Continuer</GrandBouton>
          <BoutonRetour onClick={() => allerA(2)} />
        </form>
      )}

      {etape === 4 && (
        <form onSubmit={validerConsentement} noValidate className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">Votre accord</h1>
            <p className="text-lg">
              Vos coordonnées seront transmises <strong>uniquement</strong> {mots.auTiers}{" "}
              désigné par le juge. Il s&apos;en servira seulement pour organiser{" "}
              {mots.laProcedure}.
            </p>
          </div>
          <label
            className={cn(
              "flex cursor-pointer items-start gap-4 rounded-sm border-2 p-4 text-lg",
              consentement ? "border-primary bg-secondary" : "border-input",
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
            J&apos;accepte que mes coordonnées soient transmises {mots.auTiers}.
          </label>
          <MessageErreur erreur={erreur} />
          <GrandBouton>Continuer</GrandBouton>
          <BoutonRetour onClick={() => allerA(3)} />
        </form>
      )}

      {etape === 5 && (
        <form onSubmit={validerPreferences} noValidate className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">Votre premier rendez-vous</h1>
            <p className="text-lg">
              Dites-nous ce qui vous convient. {majuscule(mots.leTiers)} en tiendra compte.
            </p>
          </div>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-lg font-bold">
              Souhaitez-vous rencontrer {mots.leTiers}&nbsp;:
            </legend>
            {(Object.keys(TEXTES_FORMAT) as Enums<"preference_format">[]).map((valeur) => (
              <GrandChoix key={valeur} name="pref_format" titre={TEXTES_FORMAT[valeur]}
                checked={prefFormat === valeur}
                onChange={() => {
                  setPrefFormat(valeur)
                  setErreur(null)
                }} />
            ))}
          </fieldset>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-lg font-bold">Comment&nbsp;?</legend>
            {(Object.keys(TEXTES_LIEU) as Enums<"preference_lieu">[]).map((valeur) => (
              <GrandChoix key={valeur} name="pref_lieu" titre={TEXTES_LIEU[valeur]}
                checked={prefLieu === valeur}
                onChange={() => {
                  setPrefLieu(valeur)
                  setErreur(null)
                }} />
            ))}
          </fieldset>
          <MessageErreur erreur={erreur} />
          <GrandBouton>Continuer</GrandBouton>
          <BoutonRetour onClick={() => allerA(4)} />
        </form>
      )}

      {etape === 6 && (
        <form onSubmit={envoyer} noValidate className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">Quand êtes-vous disponible&nbsp;?</h1>
            <p className="text-lg">
              {jours.length > 0
                ? "Cochez toutes les dates qui vous conviennent pour le premier rendez-vous."
                : `${majuscule(mots.leTiers)} n'a pas encore proposé de dates. Envoyez vos réponses : il vous contactera.`}
            </p>
          </div>

          {jours.map((jour) => (
            <fieldset key={jour.jour} className="flex flex-col gap-3">
              <legend className="mb-3 text-lg font-bold">{jour.jour}</legend>
              {jour.creneaux.map((creneau) => {
                const coche = creneauxChoisis.includes(creneau.id)
                return (
                  <label
                    key={creneau.id}
                    className={cn(
                      "flex min-h-14 cursor-pointer items-center gap-4 rounded-sm border-2 px-4 py-3 text-lg",
                      coche ? "border-primary bg-secondary" : "border-input"
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

          {jours.length > 0 && creneauxChoisis.length === 0 && (
            <p className="text-base text-muted-foreground">
              Aucune date ne vous convient&nbsp;? Envoyez quand même&nbsp;: {mots.leTiers} vous
              proposera une autre date.
            </p>
          )}

          <MessageErreur erreur={erreur} />
          <GrandBouton disabled={enCours}>{enCours ? "Envoi en cours…" : "Envoyer mes réponses"}</GrandBouton>
          <BoutonRetour onClick={() => allerA(5)} disabled={enCours} />
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
        aria-valuetext={`Étape ${etape} sur ${TITRES_ETAPES.length} : ${TITRES_ETAPES[etape - 1]}`}
        aria-label="Progression"
        className="flex gap-1.5"
      >
        {TITRES_ETAPES.map((titre, index) => (
          <div key={titre} className={cn("h-2 flex-1 rounded-sm", index < etape ? "bg-primary" : "bg-muted")} />
        ))}
      </div>
      {etape < TITRES_ETAPES.length && (
        <p className="text-sm text-muted-foreground">Étape suivante : {TITRES_ETAPES[etape]}</p>
      )}
    </div>
  )
}

/** Grande option à choix unique (bouton radio), facile à toucher sur téléphone. */
function GrandChoix({
  name,
  titre,
  aide,
  checked,
  onChange,
}: {
  name: string
  titre: string
  aide?: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <label
      className={cn(
        "flex min-h-14 cursor-pointer items-start gap-4 rounded-sm border-2 p-4",
        checked ? "border-primary bg-secondary" : "border-input"
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-1 size-5 shrink-0 accent-primary"
      />
      <span className="flex flex-col gap-1">
        <span className="text-lg font-medium">{titre}</span>
        {aide && <span className="text-base text-muted-foreground">{aide}</span>}
      </span>
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

function ChampTexte({
  id,
  label,
  valeur,
  onChange,
  erreur,
  type = "text",
  placeholder,
  autoComplete,
}: {
  id: string
  label: string
  valeur: string
  onChange: (valeur: string) => void
  erreur?: string
  type?: "text" | "tel" | "email"
  placeholder?: string
  autoComplete?: string
}) {
  return (
    <Champ id={id} label={label} erreur={erreur}>
      <Input
        id={id}
        type={type}
        inputMode={type === "text" ? undefined : type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={valeur}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(erreur)}
        className="h-14 text-lg md:text-lg"
      />
    </Champ>
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
    <Button type="button" variant="ghost" onClick={onClick} disabled={disabled} className="h-12 w-full text-lg">
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
