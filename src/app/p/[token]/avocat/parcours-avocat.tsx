"use client"

import { CircleCheckIcon, PlusIcon, PrinterIcon } from "lucide-react"
import Link from "next/link"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import type { Enums } from "@/lib/supabase/database.types"
import { cn } from "@/lib/utils"

import { focaliser, premierEnErreur, useFocusTitre } from "../accessibilite"
import type { JourCreneaux } from "../dates"
import { normaliserTelephone } from "../validation"
import { vocabulaire, type Vocabulaire } from "../vocabulaire"
import { envoyerRefusAvocat, envoyerReponseAvocat, verifierDossier, type ResultatEnvoi } from "./actions"
import {
  BARREAUX,
  verifierAvocat,
  verifierClient,
  type ErreursAvocat,
  type ErreursClient,
  type SaisieClient,
} from "./validation"

const TITRES_ETAPES = [
  "Vérification",
  "Vos coordonnées",
  "Position de votre client",
  "Votre client",
  "Accord",
  "Premier rendez-vous",
  "Disponibilités",
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

const majuscule = (texte: string) => texte.charAt(0).toUpperCase() + texte.slice(1)

function textesChoix(mots: Vocabulaire): Record<Choix, { titre: string; aide: string; recap: string }> {
  return {
    information: {
      titre: "Mon client souhaite d'abord une réunion d'information gratuite",
      aide: `${majuscule(mots.leTiers)} lui expliquera la démarche. Cela ne l'engage à rien.`,
      recap: "Réunion d'information gratuite d'abord",
    },
    accepte: {
      titre: `Mon client accepte directement ${mots.laProcedure}`,
      aide: "Vous passez à l'organisation du premier rendez-vous.",
      recap: `Accepte ${mots.laProcedure}`,
    },
    refuse: {
      titre: `Mon client refuse ${mots.laProcedure}`,
      aide: "Le juge sera informé de ce choix.",
      recap: `Refuse ${mots.laProcedure}`,
    },
  }
}

const formatEnvoi = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Indian/Reunion",
})

type Props = {
  token: string
  mode: Enums<"mode_amiable">
  jours: JourCreneaux[]
}

// Parcours en 7 étapes (3 en cas de refus). Le numéro RG et le nom saisis à
// l'étape 1 sont renvoyés avec la réponse finale : le serveur les revérifie.
// Les coordonnées de l'avocat sont demandées avant la position du client, pour
// qu'un refus soit toujours enregistré avec l'identité de l'avocat.
export function ParcoursAvocat({ token, mode, jours }: Props) {
  const mots = vocabulaire(mode)
  const choixPossibles = textesChoix(mots)

  const [etape, setEtape] = useState(1)
  const [numeroRg, setNumeroRg] = useState("")
  const [nomClient, setNomClient] = useState("")
  const [avocat, setAvocat] = useState({ nom: "", email: "", telephone: "", barreau: BARREAUX[0] })
  const [choix, setChoix] = useState<Choix | null>(null)
  const [confirmationRefus, setConfirmationRefus] = useState(false)
  const [client, setClient] = useState<SaisieClient>({
    telephone: "",
    email: "",
    telephone_2: "",
    email_2: "",
    adresse: "",
    passerParAvocat: false,
  })
  const [autreContact, setAutreContact] = useState(false)
  const [consentement, setConsentement] = useState(false)
  const [prefFormat, setPrefFormat] = useState<Enums<"preference_format"> | null>(null)
  const [prefLieu, setPrefLieu] = useState<Enums<"preference_lieu"> | null>(null)
  const [creneauxChoisis, setCreneauxChoisis] = useState<string[]>([])

  const [erreur, setErreur] = useState<string | null>(null)
  const [erreursAvocat, setErreursAvocat] = useState<ErreursAvocat>({})
  const [erreursClient, setErreursClient] = useState<ErreursClient>({})
  const [enCours, startTransition] = useTransition()
  const [envoi, setEnvoi] = useState<{ rdv: string | null; le: string } | null>(null)
  const titreRef = useFocusTitre(envoi ? "fin" : `${etape}-${confirmationRefus}`)

  function allerA(nouvelleEtape: number) {
    setErreur(null)
    setEtape(nouvelleEtape)
    window.scrollTo(0, 0)
  }

  function terminer(reponse: ResultatEnvoi) {
    if (reponse.erreur !== null) {
      setErreur(reponse.erreur)
      // Erreur du serveur à l'envoi : focus sur le message pour qu'il soit lu
      return focaliser("#erreur-etape")
    }
    setEnvoi({ rdv: reponse.rdv, le: formatEnvoi.format(new Date()) })
    window.scrollTo(0, 0)
  }

  function validerDossier(event: React.FormEvent) {
    event.preventDefault()
    if (!numeroRg.trim() || !nomClient.trim()) {
      setErreur("Remplissez les deux champs.")
      return focaliser(!numeroRg.trim() ? "#numero-rg" : "#nom-client")
    }
    startTransition(async () => {
      const resultat = await verifierDossier(token, { numeroRg, nomClient })
      if (resultat.erreur !== null) {
        setErreur(resultat.erreur)
        return focaliser("#numero-rg")
      }
      setNumeroRg(resultat.numeroRg)
      setNomClient(resultat.nomClient)
      allerA(2)
    })
  }

  function validerAvocat(event: React.FormEvent) {
    event.preventDefault()
    const erreurs = verifierAvocat(avocat)
    setErreursAvocat(erreurs)
    if (Object.keys(erreurs).length === 0) return allerA(3)
    const champ = premierEnErreur(["nom", "email", "telephone", "barreau"], erreurs)
    if (champ) focaliser(`#avocat-${champ}`)
  }

  function validerChoix(event: React.FormEvent) {
    event.preventDefault()
    if (!choix) {
      setErreur("Choisissez une réponse pour continuer.")
      return focaliser("#choix-information")
    }
    if (choix === "refuse") {
      setErreur(null)
      setConfirmationRefus(true)
      window.scrollTo(0, 0)
      return
    }
    allerA(4)
  }

  function confirmerRefus() {
    startTransition(async () => terminer(await envoyerRefusAvocat(token, { numeroRg, nomClient, avocat })))
  }

  function changerClient(champ: keyof SaisieClient, valeur: string | boolean) {
    setClient((actuel) => ({ ...actuel, [champ]: valeur }))
    // L'erreur du champ disparaît dès qu'on le corrige
    setErreursClient((erreurs) => ({ ...erreurs, [champ]: undefined }))
  }

  function validerClient(event: React.FormEvent) {
    event.preventDefault()
    const erreurs = verifierClient(client)
    setErreursClient(erreurs)
    if (erreurs.telephone_2 || erreurs.email_2 || erreurs.adresse) setAutreContact(true)
    if (Object.keys(erreurs).length === 0) return allerA(5)
    const ids = { telephone: "client-telephone", email: "client-email", telephone_2: "client-telephone-2", email_2: "client-email-2", adresse: "client-adresse" }
    const champ = premierEnErreur(["telephone", "email", "telephone_2", "email_2", "adresse"], erreurs)
    if (champ) focaliser(`#${ids[champ]}`)
  }

  function validerConsentement(event: React.FormEvent) {
    event.preventDefault()
    if (!consentement) {
      setErreur("Cochez la case pour continuer.")
      return focaliser('#zone-consentement [role="checkbox"]')
    }
    allerA(6)
  }

  function validerPreferences(event: React.FormEvent) {
    event.preventDefault()
    if (!prefFormat || !prefLieu) {
      setErreur("Répondez aux deux questions pour continuer.")
      return focaliser(!prefFormat ? "#pref_format-ensemble" : "#pref_lieu-presentiel")
    }
    allerA(7)
  }

  function envoyer(event: React.FormEvent) {
    event.preventDefault()
    if (!choix || choix === "refuse" || !prefFormat || !prefLieu) return
    startTransition(async () =>
      terminer(
        await envoyerReponseAvocat(token, {
          numeroRg,
          nomClient,
          avocat,
          choix,
          client,
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
  // Écran final : récapitulatif imprimable pour le dossier du cabinet
  // ---------------------------------------------------------------------------
  if (envoi) {
    const refus = choix === "refuse"
    const libellesCreneaux = jours
      .flatMap((jour) => jour.creneaux)
      .filter((creneau) => creneauxChoisis.includes(creneau.id))
      .map((creneau) => creneau.libelle)
    const telephones = [client.telephone, client.telephone_2]
      .filter((t) => t.trim())
      .map((t) => normaliserTelephone(t))
    const emails = [client.email, client.email_2].map((e) => e.trim()).filter(Boolean)

    return (
      <section className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <CircleCheckIcon className="size-16 text-succes print:hidden" aria-hidden />
          <h1 ref={titreRef} tabIndex={-1} className="text-2xl font-bold">
            {refus ? "Refus enregistré" : `Réponse transmise ${mots.auTiers}`}
          </h1>
          {refus ? (
            <p className="text-lg">
              Votre client refuse {mots.laProcedure} : c&apos;est enregistré. Le juge en sera
              informé.
            </p>
          ) : envoi.rdv ? (
            <>
              <p className="text-lg">Le premier rendez-vous est fixé&nbsp;:</p>
              <p className="text-xl font-bold text-primary">{envoi.rdv}</p>
            </>
          ) : (
            <p className="text-lg">
              {majuscule(mots.leTiers)} prendra contact prochainement
              {choix === "information" ? " pour organiser la réunion d'information." : "."}
            </p>
          )}
        </div>

        <Card className="print:shadow-none print:ring-0">
          <CardContent className="flex flex-col gap-4 text-base">
            <h2 className="text-lg font-bold">Récapitulatif</h2>
            <Ligne titre="Dossier">
              n° {numeroRg} · {majuscule(mots.procedure)}
            </Ligne>
            <Ligne titre="Client">{nomClient}</Ligne>
            <Ligne titre="Transmis le">{envoi.le}</Ligne>
            <Ligne titre="Avocat">
              {avocat.nom.trim()}
              <br />
              Barreau : {avocat.barreau}
              <br />
              {normaliserTelephone(avocat.telephone)} · {avocat.email.trim()}
            </Ligne>
            <Ligne titre="Position du client">{choix ? choixPossibles[choix].recap : "—"}</Ligne>
            {!refus && (
              <>
                <Ligne titre="Coordonnées du client">
                  {telephones.length > 0 ? telephones.join(" · ") : "Téléphone non renseigné"}
                  <br />
                  {emails.length > 0 ? emails.join(" · ") : "E-mail non renseigné"}
                  {client.adresse.trim() && (
                    <>
                      <br />
                      {client.adresse.trim()}
                    </>
                  )}
                </Ligne>
                {client.passerParAvocat && (
                  <Ligne titre="Contact">{majuscule(mots.leTiers)} passe par l&apos;avocat.</Ligne>
                )}
                <Ligne titre="Premier rendez-vous">
                  {prefFormat && TEXTES_FORMAT[prefFormat]} · {prefLieu && TEXTES_LIEU[prefLieu]}
                </Ligne>
                <Ligne titre="Disponibilités">
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
                {envoi.rdv && <Ligne titre="Rendez-vous fixé">{envoi.rdv}</Ligne>}
              </>
            )}
          </CardContent>
        </Card>

        <Button type="button" onClick={() => window.print()} className="h-14 w-full text-lg print:hidden">
          <PrinterIcon aria-hidden />
          Imprimer le récapitulatif
        </Button>
      </section>
    )
  }

  // ---------------------------------------------------------------------------
  // Étapes
  // ---------------------------------------------------------------------------
  return (
    <section className="flex flex-col gap-6">
      <BarreProgression etape={etape} titreRef={titreRef} />

      {etape === 1 && (
        <form onSubmit={validerDossier} noValidate className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold">Répondre pour votre client</h2>
            <p className="text-lg">
              Le juge propose une {mots.procedure} à votre client. Indiquez le numéro du dossier
              et le nom de famille de votre client, tels qu&apos;ils figurent sur la notification.
            </p>
          </div>
          <ChampTexte id="numero-rg" label="Numéro RG du dossier (obligatoire)" valeur={numeroRg} onChange={setNumeroRg}
            placeholder="Ex. : 26/00123" autoComplete="off" decritPar={erreur ? "erreur-etape" : undefined} />
          <ChampTexte id="nom-client" label="Nom de famille du client (obligatoire)" valeur={nomClient} onChange={setNomClient}
            autoComplete="off" majuscules decritPar={erreur ? "erreur-etape" : undefined} />
          <MessageErreur id="erreur-etape" erreur={erreur} />
          <GrandBouton disabled={enCours}>{enCours ? "Vérification…" : "Continuer"}</GrandBouton>
          <Link href={`/p/${token}`} className="text-center text-lg font-medium text-primary underline underline-offset-4">
            Vous êtes la partie&nbsp;? Répondre vous-même
          </Link>
        </form>
      )}

      {etape === 2 && (
        <form onSubmit={validerAvocat} noValidate className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold">Vos coordonnées</h2>
            <p className="text-lg">Dossier n° {numeroRg} · client : {nomClient}</p>
          </div>
          <ChampTexte id="avocat-nom" label="Votre nom (obligatoire)" valeur={avocat.nom} erreur={erreursAvocat.nom}
            onChange={(nom) => setAvocat({ ...avocat, nom })} autoComplete="name" placeholder="Ex. : Me Sophie Lebon" />
          <ChampTexte id="avocat-email" label="Votre e-mail (obligatoire)" type="email" valeur={avocat.email} erreur={erreursAvocat.email}
            onChange={(email) => setAvocat({ ...avocat, email })} autoComplete="email" placeholder="Ex. : nom@cabinet.fr" />
          <ChampTexte id="avocat-telephone" label="Votre téléphone (obligatoire)" type="tel" valeur={avocat.telephone}
            erreur={erreursAvocat.telephone} onChange={(telephone) => setAvocat({ ...avocat, telephone })}
            autoComplete="tel" placeholder="Ex. : 0262 12 34 56" />
          <Champ id="avocat-barreau" label="Votre barreau (obligatoire)" erreur={erreursAvocat.barreau}>
            <NativeSelect
              id="avocat-barreau"
              value={avocat.barreau}
              onChange={(event) => setAvocat({ ...avocat, barreau: event.target.value })}
              aria-invalid={Boolean(erreursAvocat.barreau)}
              aria-describedby={erreursAvocat.barreau ? "avocat-barreau-erreur" : undefined}
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

      {etape === 3 && !confirmationRefus && (
        <form onSubmit={validerChoix} noValidate className="flex flex-col gap-6">
          <fieldset className="flex flex-col gap-4" aria-describedby={erreur ? "erreur-etape" : undefined}>
            <legend className="mb-4 flex flex-col gap-2">
              <span className="text-2xl font-bold">
                Position de votre client <span className="text-lg font-normal">(obligatoire)</span>
              </span>
              <span className="text-lg">
                {majuscule(mots.laProcedure)} est une démarche amiable : {mots.leTiers} aide les
                parties à trouver une solution ensemble.
              </span>
            </legend>
            {(Object.keys(choixPossibles) as Choix[]).map((valeur) => (
              <GrandChoix key={valeur} id={`choix-${valeur}`} name="choix" checked={choix === valeur}
                titre={choixPossibles[valeur].titre} aide={choixPossibles[valeur].aide}
                onChange={() => {
                  setChoix(valeur)
                  setErreur(null)
                }} />
            ))}
          </fieldset>
          <MessageErreur id="erreur-etape" erreur={erreur} />
          <GrandBouton>Continuer</GrandBouton>
          <BoutonRetour onClick={() => allerA(2)} />
        </form>
      )}

      {etape === 3 && confirmationRefus && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold">Confirmez-vous le refus de votre client&nbsp;?</h2>
            <p className="text-lg">
              Vous indiquez que votre client, {nomClient}, refuse {mots.laProcedure} proposée par
              le juge dans le dossier n° {numeroRg}. Le juge sera informé de ce choix.
            </p>
          </div>
          <MessageErreur id="erreur-etape" erreur={erreur} />
          <Button size="lg" className="h-14 w-full text-lg" onClick={confirmerRefus} disabled={enCours}>
            {enCours ? "Enregistrement…" : `Oui, mon client refuse ${mots.laProcedure}`}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-14 w-full text-lg"
            disabled={enCours}
            onClick={() => {
              setConfirmationRefus(false)
              setErreur(null)
            }}
          >
            Non, revenir au choix
          </Button>
        </div>
      )}

      {etape === 4 && (
        <form onSubmit={validerClient} noValidate className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold">Votre client</h2>
            <p className="text-lg">Coordonnées de votre client, si vous les avez.</p>
          </div>
          <CaseACocher
            coche={client.passerParAvocat}
            onChange={(coche) => {
              changerClient("passerParAvocat", coche)
              setErreursClient({})
            }}
          >
            Mon client souhaite que {mots.leTiers} passe par moi.
          </CaseACocher>
          <ChampTexte id="client-telephone" type="tel" placeholder="Ex. : 0692 12 34 56" autoComplete="off"
            label={client.passerParAvocat ? "Téléphone du client (facultatif)" : "Téléphone du client (obligatoire)"}
            valeur={client.telephone} erreur={erreursClient.telephone}
            onChange={(v) => changerClient("telephone", v)} />
          <ChampTexte id="client-email" type="email" placeholder="Ex. : nom@exemple.fr" autoComplete="off"
            label="E-mail du client (facultatif)" valeur={client.email} erreur={erreursClient.email}
            onChange={(v) => changerClient("email", v)} />

          <Button
            type="button"
            variant="link"
            className="h-auto self-start px-0 text-lg"
            aria-expanded={autreContact}
            aria-controls="autre-contact"
            onClick={() => setAutreContact((ouvert) => !ouvert)}
          >
            {!autreContact && <PlusIcon aria-hidden />}
            {autreContact ? "Masquer les autres moyens de contact" : "Ajouter un autre moyen de contact du client"}
          </Button>
          {autreContact && (
            <div id="autre-contact" className="flex flex-col gap-6 border-l-4 border-primary pl-4">
              <ChampTexte id="client-telephone-2" type="tel" label="Autre téléphone (facultatif)" autoComplete="off"
                valeur={client.telephone_2} erreur={erreursClient.telephone_2}
                onChange={(v) => changerClient("telephone_2", v)} />
              <ChampTexte id="client-email-2" type="email" label="Autre e-mail (facultatif)" autoComplete="off"
                valeur={client.email_2} erreur={erreursClient.email_2}
                onChange={(v) => changerClient("email_2", v)} />
              <ChampTexte id="client-adresse" label="Adresse postale (facultatif)" autoComplete="off"
                valeur={client.adresse} erreur={erreursClient.adresse}
                onChange={(v) => changerClient("adresse", v)} />
            </div>
          )}

          <GrandBouton>Continuer</GrandBouton>
          <BoutonRetour onClick={() => allerA(3)} />
        </form>
      )}

      {etape === 5 && (
        <form onSubmit={validerConsentement} noValidate className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold">Accord</h2>
            <p className="text-lg">
              Ces informations seront transmises <strong>uniquement</strong> {mots.auTiers} désigné
              par le juge, pour organiser {mots.laProcedure}.
            </p>
          </div>
          <CaseACocher
            id="zone-consentement"
            coche={consentement}
            invalide={Boolean(erreur)}
            decritPar={erreur ? "erreur-etape" : undefined}
            onChange={(coche) => {
              setConsentement(coche)
              setErreur(null)
            }}
          >
            J&apos;agis pour le compte de mon client et j&apos;accepte que ces informations soient
            transmises {mots.auTiers} désigné (obligatoire).
          </CaseACocher>
          <MessageErreur id="erreur-etape" erreur={erreur} />
          <GrandBouton>Continuer</GrandBouton>
          <BoutonRetour onClick={() => allerA(4)} />
        </form>
      )}

      {etape === 6 && (
        <form onSubmit={validerPreferences} noValidate className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold">Premier rendez-vous</h2>
            <p className="text-lg">
              Indiquez ce qui convient à votre client. {majuscule(mots.leTiers)} en tiendra compte.
            </p>
          </div>
          <fieldset className="flex flex-col gap-3" aria-describedby={erreur && !prefFormat ? "erreur-etape" : undefined}>
            <legend className="mb-3 text-lg font-bold">
              Votre client souhaite être reçu&nbsp;: <span className="font-normal">(obligatoire)</span>
            </legend>
            {(Object.keys(TEXTES_FORMAT) as Enums<"preference_format">[]).map((valeur) => (
              <GrandChoix key={valeur} id={`pref_format-${valeur}`} name="pref_format" titre={TEXTES_FORMAT[valeur]} checked={prefFormat === valeur}
                onChange={() => {
                  setPrefFormat(valeur)
                  setErreur(null)
                }} />
            ))}
          </fieldset>
          <fieldset className="flex flex-col gap-3" aria-describedby={erreur && !prefLieu ? "erreur-etape" : undefined}>
            <legend className="mb-3 text-lg font-bold">
              Comment&nbsp;? <span className="font-normal">(obligatoire)</span>
            </legend>
            {(Object.keys(TEXTES_LIEU) as Enums<"preference_lieu">[]).map((valeur) => (
              <GrandChoix key={valeur} id={`pref_lieu-${valeur}`} name="pref_lieu" titre={TEXTES_LIEU[valeur]} checked={prefLieu === valeur}
                onChange={() => {
                  setPrefLieu(valeur)
                  setErreur(null)
                }} />
            ))}
          </fieldset>
          <MessageErreur id="erreur-etape" erreur={erreur} />
          <GrandBouton>Continuer</GrandBouton>
          <BoutonRetour onClick={() => allerA(5)} />
        </form>
      )}

      {etape === 7 && (
        <form onSubmit={envoyer} noValidate className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold">Disponibilités</h2>
            <p className="text-lg">
              {jours.length > 0
                ? "Cochez toutes les dates qui conviennent pour le premier rendez-vous."
                : `${majuscule(mots.leTiers)} n'a pas encore proposé de dates. Envoyez la réponse : il prendra contact.`}
            </p>
          </div>

          {jours.map((jour) => (
            <fieldset key={jour.jour} className="flex flex-col gap-3">
              <legend className="mb-3 text-lg font-bold">{jour.jour}</legend>
              {jour.creneaux.map((creneau) => (
                <CaseACocher
                  key={creneau.id}
                  coche={creneauxChoisis.includes(creneau.id)}
                  onChange={(coche) => basculerCreneau(creneau.id, coche)}
                >
                  {creneau.heures}
                </CaseACocher>
              ))}
            </fieldset>
          ))}

          {jours.length > 0 && creneauxChoisis.length === 0 && (
            <p className="text-base text-muted-foreground">
              Aucune date ne convient&nbsp;? Envoyez quand même&nbsp;: {mots.leTiers} proposera une
              autre date.
            </p>
          )}

          <MessageErreur id="erreur-etape" erreur={erreur} />
          <GrandBouton disabled={enCours}>{enCours ? "Envoi en cours…" : "Envoyer la réponse"}</GrandBouton>
          <BoutonRetour onClick={() => allerA(6)} disabled={enCours} />
        </form>
      )}
    </section>
  )
}

/**
 * Titre de la page (h1) « Étape 2 sur 7 : Vos coordonnées », qui reçoit le
 * focus à chaque changement d'étape, puis la barre de progression.
 */
function BarreProgression({ etape, titreRef }: { etape: number; titreRef: React.Ref<HTMLHeadingElement> }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 ref={titreRef} tabIndex={-1} className="text-base font-medium">
        Étape {etape} sur {TITRES_ETAPES.length} : {TITRES_ETAPES[etape - 1]}
      </h1>
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={TITRES_ETAPES.length}
        aria-valuenow={etape}
        aria-valuetext={`Étape ${etape} sur ${TITRES_ETAPES.length} : ${TITRES_ETAPES[etape - 1]}`}
        aria-label="Progression du formulaire"
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
  id,
  name,
  titre,
  aide,
  checked,
  onChange,
}: {
  id: string
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
      <input type="radio" id={id} name={name} checked={checked} onChange={onChange} className="mt-1 size-5 shrink-0 accent-primary" />
      <span className="flex flex-col gap-1">
        <span className="text-lg font-medium">{titre}</span>
        {aide && <span className="text-base text-muted-foreground">{aide}</span>}
      </span>
    </label>
  )
}

function CaseACocher({
  id,
  coche,
  invalide,
  decritPar,
  onChange,
  children,
}: {
  id?: string
  coche: boolean
  invalide?: boolean
  decritPar?: string
  onChange: (coche: boolean) => void
  children: React.ReactNode
}) {
  return (
    <label
      id={id}
      className={cn(
        "flex min-h-14 cursor-pointer items-start gap-4 rounded-sm border-2 px-4 py-3 text-lg",
        coche ? "border-primary bg-secondary" : "border-input",
        invalide && "border-destructive"
      )}
    >
      <Checkbox checked={coche} onCheckedChange={onChange} aria-invalid={invalide} aria-describedby={decritPar} className="mt-1 size-6 [&_svg]:size-5" />
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
      <MessageErreur id={`${id}-erreur`} erreur={erreur} />
    </div>
  )
}

function ChampTexte({
  id,
  label,
  valeur,
  onChange,
  erreur,
  decritPar,
  type = "text",
  placeholder,
  autoComplete,
  majuscules,
}: {
  id: string
  label: string
  valeur: string
  onChange: (valeur: string) => void
  erreur?: string
  /** id d'un message d'erreur commun à plusieurs champs */
  decritPar?: string
  type?: "text" | "tel" | "email"
  placeholder?: string
  autoComplete?: string
  majuscules?: boolean
}) {
  return (
    <Champ id={id} label={label} erreur={erreur}>
      <Input
        id={id}
        type={type}
        inputMode={type === "text" ? undefined : type}
        autoComplete={autoComplete}
        autoCapitalize={majuscules ? "characters" : undefined}
        placeholder={placeholder}
        value={valeur}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(erreur || decritPar)}
        aria-describedby={[erreur && `${id}-erreur`, decritPar].filter(Boolean).join(" ") || undefined}
        className="h-14 text-lg md:text-lg"
      />
    </Champ>
  )
}

/** Message d'erreur annoncé (role="alert"), relié au champ par son id. */
function MessageErreur({ id, erreur }: { id: string; erreur?: string | null }) {
  if (!erreur) return null
  return (
    <p id={id} role="alert" tabIndex={-1} className="text-base font-medium text-destructive">
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
