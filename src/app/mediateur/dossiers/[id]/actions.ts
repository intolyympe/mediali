"use server"

import { envoyerConfirmationsRdv } from "@/lib/emails/confirmation-rdv"
import { lireMediateurId } from "@/lib/roles"
import type { Enums, Json } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/server"

import { filtreIntervenant, mots } from "../../donnees"

// Actions du médiateur (ou conciliateur) sur un dossier. Chacune ajoute un
// événement à la timeline, visible aussi dans l'espace juridiction :
// - par les déclencheurs SQL : rendez-vous fixé, compte rendu, issue ;
// - à la main (insert dans `evenements`) pour les autres types.

export type Resultat = { erreur: string | null }

const DATE = /^\d{4}-\d{2}-\d{2}$/
const HEURE = /^\d{2}:\d{2}$/
const COMPTE_RENDU_MAX = 2000
// La Réunion : UTC+4 toute l'année
const DECALAGE = "+04:00"

const formatDateHeure = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Indian/Reunion",
})

/** « 2026-10-20 » → « 20/10/2026 » */
const dateFr = (date: string) => date.split("-").reverse().join("/")

/** Vérifie que le compte connecté intervient sur le dossier (et qu'il n'est pas clos). */
async function acceder(dossierId: unknown, ecriture = true) {
  if (typeof dossierId !== "string") return { erreur: "Requête invalide." } as const

  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const mediateurId = lireMediateurId(claims?.claims)
  if (!mediateurId) return { erreur: "Accès réservé au médiateur ou au conciliateur." } as const

  const { data: dossier } = await supabase
    .from("dossiers")
    .select("id, mode, mediateur_id, cloture_le, compte_rendu, rdv_creneau_id, parties(id, nom, prenom)")
    .eq("id", dossierId)
    .or(filtreIntervenant(mediateurId))
    .maybeSingle()

  if (!dossier) return { erreur: "Ce dossier ne vous est pas confié." } as const
  if (ecriture && dossier.cloture_le) {
    return { erreur: "Ce dossier est clôturé : il est en lecture seule." } as const
  }
  return { supabase, dossier, erreur: null } as const
}

type Acces = Exclude<Awaited<ReturnType<typeof acceder>>, { erreur: string }>

async function ajouterEvenement(
  { supabase, dossier }: Acces,
  type: string,
  libelle: string,
  details: Json = {}
): Promise<Resultat> {
  const { error } = await supabase
    .from("evenements")
    .insert({ dossier_id: dossier.id, type, libelle, acteur: "mediateur", details })
  return { erreur: error ? "L'action est faite, mais la timeline n'a pas pu être mise à jour." : null }
}

// ---------------------------------------------------------------------------

export async function changerProvision(dossierId: string, consignee: boolean): Promise<Resultat> {
  if (typeof consignee !== "boolean") return { erreur: "Requête invalide." }
  const acces = await acceder(dossierId)
  if (acces.erreur !== null) return { erreur: acces.erreur }

  const { error } = await acces.supabase
    .from("dossiers")
    .update({ provision_consignee: consignee })
    .eq("id", acces.dossier.id)
  return { erreur: error ? "Enregistrement impossible." : null }
}

export type SaisieRendezVous = {
  /** Créneau existant du médiateur, ou null pour une autre date */
  creneauId: string | null
  autre: { date: string; debut: string; fin: string } | null
  format: Enums<"format_rdv">
  lieu: Enums<"lieu_rdv">
}

export async function fixerRendezVous(dossierId: string, saisie: SaisieRendezVous): Promise<Resultat> {
  const acces = await acceder(dossierId)
  if (acces.erreur !== null) return { erreur: acces.erreur }
  const { supabase, dossier } = acces

  if (saisie?.format !== "ensemble" && saisie?.format !== "separe") return { erreur: "Choisissez le format." }
  if (saisie.lieu !== "presentiel" && saisie.lieu !== "distanciel") return { erreur: "Choisissez le lieu." }
  if (!dossier.mediateur_id) return { erreur: "Le dossier n'a pas d'intervenant principal." }

  let creneauId = typeof saisie.creneauId === "string" ? saisie.creneauId : null
  let creeIci = false

  if (!creneauId) {
    // Autre date : on crée un créneau pour l'intervenant principal
    const autre = saisie.autre
    if (!autre || !DATE.test(autre.date) || !HEURE.test(autre.debut) || !HEURE.test(autre.fin)) {
      return { erreur: "Indiquez la date et les heures du rendez-vous." }
    }
    const debut = `${autre.date}T${autre.debut}:00${DECALAGE}`
    const fin = `${autre.date}T${autre.fin}:00${DECALAGE}`
    if (Date.parse(fin) <= Date.parse(debut)) return { erreur: "L'heure de fin doit être après l'heure de début." }

    const { data: cree, error } = await supabase
      .from("creneaux")
      .insert({ mediateur_id: dossier.mediateur_id, debut, fin })
      .select("id")
      .single()
    if (error) return { erreur: "Impossible d'enregistrer cette date." }
    creneauId = cree.id
    creeIci = true
  } else {
    const { data: creneau } = await supabase
      .from("creneaux")
      .select("id")
      .eq("id", creneauId)
      .eq("mediateur_id", dossier.mediateur_id)
      .maybeSingle()
    if (!creneau) return { erreur: "Ce créneau n'existe pas." }
  }

  // Le déclencheur SQL ajoute « Premier rendez-vous fixé le … » si le créneau change
  const { error } = await supabase
    .from("dossiers")
    .update({ rdv_creneau_id: creneauId, rdv_format: saisie.format, rdv_lieu: saisie.lieu })
    .eq("id", dossier.id)

  if (error) {
    if (creeIci) await supabase.from("creneaux").delete().eq("id", creneauId)
    return {
      erreur: error.code === "23505" ? "Ce créneau est déjà réservé pour un autre dossier." : "Enregistrement impossible.",
    }
  }

  // Statut recalculé par la base (rdv_fixe)
  await supabase.rpc("recalculer_statut_dossier", { p_dossier_id: dossier.id })
  // E-mails de confirmation (date, format, lieu) aux parties et au médiateur. Ne lève jamais.
  await envoyerConfirmationsRdv(dossier.id)

  const tiers = mots(dossier.mode).tiers
  return ajouterEvenement(
    acces,
    "rdv_modalites",
    `Premier rendez-vous confirmé par le ${tiers} : parties reçues ${
      saisie.format === "ensemble" ? "ensemble" : "séparément"
    }, ${saisie.lieu === "presentiel" ? "en personne" : "à distance"}`,
    { creneau_id: creneauId, format: saisie.format, lieu: saisie.lieu }
  )
}

export type SaisieSeance = {
  type: "reunion_information" | "seance"
  date: string
  presents: string[]
}

export async function enregistrerSeance(dossierId: string, saisie: SaisieSeance): Promise<Resultat> {
  const acces = await acceder(dossierId)
  if (acces.erreur !== null) return { erreur: acces.erreur }
  const { dossier } = acces

  if (saisie?.type !== "reunion_information" && saisie?.type !== "seance") return { erreur: "Requête invalide." }
  if (!DATE.test(saisie.date)) return { erreur: "Indiquez la date." }
  const presents = dossier.parties.filter((p) => Array.isArray(saisie.presents) && saisie.presents.includes(p.id))
  const absents = dossier.parties.filter((p) => !presents.includes(p))

  const quoi =
    saisie.type === "reunion_information"
      ? "Réunion d'information tenue"
      : `Séance de ${mots(dossier.mode).procedure} tenue`
  return ajouterEvenement(
    acces,
    saisie.type,
    `${quoi} le ${dateFr(saisie.date)} (${presents.length} partie${presents.length > 1 ? "s" : ""} présente${
      presents.length > 1 ? "s" : ""
    } sur ${dossier.parties.length})`,
    {
      date: saisie.date,
      presents: presents.map((p) => `${p.prenom} ${p.nom}`),
      absents: absents.map((p) => `${p.prenom} ${p.nom}`),
    }
  )
}

export async function signalerAbsence(dossierId: string, partieId: string): Promise<Resultat> {
  const acces = await acceder(dossierId)
  if (acces.erreur !== null) return { erreur: acces.erreur }

  const partie = acces.dossier.parties.find((p) => p.id === partieId)
  if (!partie) return { erreur: "Choisissez la partie absente." }
  return ajouterEvenement(acces, "absence", `Partie absente : ${partie.prenom} ${partie.nom}`, {
    partie_id: partie.id,
  })
}

export async function ajouterCompteRendu(dossierId: string, texte: string): Promise<Resultat> {
  const acces = await acceder(dossierId)
  if (acces.erreur !== null) return { erreur: acces.erreur }
  const { supabase, dossier } = acces

  const nouveau = typeof texte === "string" ? texte.trim() : ""
  if (!nouveau) return { erreur: "Écrivez le compte rendu." }
  if (nouveau.length > COMPTE_RENDU_MAX) return { erreur: `${COMPTE_RENDU_MAX} caractères au maximum.` }

  // Les comptes rendus s'ajoutent les uns aux autres, datés
  const date = formatDateHeure.format(new Date())
  const compteRendu = [dossier.compte_rendu, `[${date}] ${nouveau}`].filter(Boolean).join("\n\n")

  // Le déclencheur SQL ajoute « Compte rendu ajouté / modifié » à la timeline
  const { error } = await supabase.from("dossiers").update({ compte_rendu: compteRendu }).eq("id", dossier.id)
  return { erreur: error ? "Enregistrement impossible." : null }
}

const ISSUES_CLOTURE: Enums<"issue_dossier">[] = ["accord_total", "accord_partiel", "echec", "carence", "refus"]

export async function cloturerDossier(
  dossierId: string,
  saisie: { issue: Enums<"issue_dossier">; date: string }
): Promise<Resultat> {
  const acces = await acceder(dossierId)
  if (acces.erreur !== null) return { erreur: acces.erreur }
  const { supabase, dossier } = acces

  if (!ISSUES_CLOTURE.includes(saisie?.issue)) return { erreur: "Choisissez l'issue du dossier." }
  if (!DATE.test(saisie.date)) return { erreur: "Indiquez la date de clôture." }

  // Le déclencheur SQL ajoute « Issue : … » à la timeline
  const { error } = await supabase
    .from("dossiers")
    .update({ issue: saisie.issue, cloture_le: `${saisie.date}T12:00:00${DECALAGE}` })
    .eq("id", dossier.id)
  if (error) return { erreur: "Clôture impossible." }

  return ajouterEvenement(acces, "cloture", `Dossier clôturé le ${dateFr(saisie.date)}`, { date: saisie.date })
}
