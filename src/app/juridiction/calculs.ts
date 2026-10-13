import {
  aRepondu,
  LIBELLES_CHOIX,
  LIBELLES_ISSUE,
  LIBELLES_MODE,
  LIBELLES_STATUT,
  trierParties,
} from "@/lib/statuts"
import type { Enums } from "@/lib/supabase/database.types"

// Calculs du tableau de suivi de l'espace juridiction (sans requête).

export type PartieSuivi = {
  id: string
  role: Enums<"role_partie">
  nom: string
  prenom: string
  choix: Enums<"choix_partie"> | null
  confirme_le: string | null
  consentement_rgpd: boolean
}

export type DossierSuivi = {
  id: string
  numero_rg: string
  mode: Enums<"mode_amiable">
  date_ordonnance: string
  statut: Enums<"statut_dossier">
  issue: Enums<"issue_dossier">
  mediateur: { nom: string } | null
  co_mediateur: { nom: string } | null
  rdv: { debut: string } | null
  parties: PartieSuivi[]
}

const JOUR_MS = 24 * 60 * 60 * 1000

export function joursEcoules(dossier: Pick<DossierSuivi, "date_ordonnance">, maintenant: number) {
  return Math.max(0, Math.floor((maintenant - Date.parse(dossier.date_ordonnance)) / JOUR_MS))
}

export function nombreReponses(dossier: DossierSuivi) {
  return dossier.parties.filter(aRepondu).length
}

/** Dossier en cours dont au moins une partie n'a pas répondu, plus de 7 jours après l'ordonnance. */
export function sansReponseDepuis7Jours(dossier: DossierSuivi, maintenant: number) {
  return (
    dossier.issue === "en_cours" &&
    dossier.parties.some((partie) => !aRepondu(partie)) &&
    joursEcoules(dossier, maintenant) > 7
  )
}

/** « Accepte la médiation » devient « Accepte la conciliation » en conciliation. */
export function libelleChoix(partie: PartieSuivi, mode: Enums<"mode_amiable">) {
  if (!aRepondu(partie)) return "Sans réponse"
  if (!partie.choix) return "A répondu"
  if (partie.choix === "accepte" && mode === "conciliation") return "Accepte la conciliation"
  return LIBELLES_CHOIX[partie.choix]
}

export function intervenants(dossier: DossierSuivi) {
  return [dossier.mediateur?.nom, dossier.co_mediateur?.nom].filter(Boolean).join(" et ") || "—"
}

export function indicateurs(dossiers: DossierSuivi[]) {
  const parties = dossiers.flatMap((dossier) => dossier.parties)
  const repondu = parties.filter(aRepondu).length
  const delais = dossiers
    .filter((dossier) => dossier.rdv)
    .map((dossier) => (Date.parse(dossier.rdv!.debut) - Date.parse(dossier.date_ordonnance)) / JOUR_MS)

  return {
    enCours: dossiers.filter((dossier) => dossier.issue === "en_cours").length,
    partiesRepondu: repondu,
    partiesTotal: parties.length,
    tauxReponse: parties.length > 0 ? repondu / parties.length : null,
    // Dossiers où une partie a refusé, ou clos sur un refus
    refus: dossiers.filter(
      (dossier) => dossier.issue === "refus" || dossier.parties.some((partie) => partie.choix === "refuse")
    ).length,
    carences: dossiers.filter((dossier) => dossier.issue === "carence").length,
    accords: dossiers.filter((dossier) => dossier.issue === "accord_total" || dossier.issue === "accord_partiel").length,
    accordsPartiels: dossiers.filter((dossier) => dossier.issue === "accord_partiel").length,
    delaiMoyenRdv: delais.length > 0 ? delais.reduce((a, b) => a + b, 0) / delais.length : null,
  }
}

const formatNombre = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 })
export const formaterNombre = (valeur: number) => formatNombre.format(valeur)

/** Export CSV (séparateur « ; » et BOM UTF-8 pour Excel en français). */
export function exporterCsv(dossiers: DossierSuivi[], maintenant: number) {
  const entetes = [
    "N° RG",
    "Mode",
    "Intervenant(s)",
    "Date de l'ordonnance",
    "Parties ayant répondu",
    "Choix des parties",
    "Statut",
    "Issue",
    "Jours écoulés",
  ]
  const lignes = dossiers.map((dossier) => [
    dossier.numero_rg,
    LIBELLES_MODE[dossier.mode],
    intervenants(dossier),
    dossier.date_ordonnance.split("-").reverse().join("/"),
    `${nombreReponses(dossier)}/${dossier.parties.length}`,
    trierParties(dossier.parties)
      .map((partie) => `${partie.prenom} ${partie.nom} : ${libelleChoix(partie, dossier.mode)}`)
      .join(" | "),
    LIBELLES_STATUT[dossier.statut],
    LIBELLES_ISSUE[dossier.issue],
    String(joursEcoules(dossier, maintenant)),
  ])
  const cellule = (valeur: string) => `"${valeur.replaceAll('"', '""')}"`
  return "﻿" + [entetes, ...lignes].map((ligne) => ligne.map(cellule).join(";")).join("\r\n")
}
