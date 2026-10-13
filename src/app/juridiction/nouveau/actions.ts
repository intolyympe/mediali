"use server"

import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import type { Enums, TablesInsert } from "@/lib/supabase/database.types"

export type PartieSaisie = {
  cle: string
  role: Enums<"role_partie">
  nom: string
  prenom: string
  avocat_nom: string
  telephone: string
  telephone_2: string
  email: string
  adresse: string
}

export type DossierSaisi = {
  mode: Enums<"mode_amiable">
  numero_rg: string
  juridiction: string
  date_ordonnance: string
  mediateur_id: string
  co_mediateur_id: string
  parties: PartieSaisie[]
}

const FONCTION_PAR_MODE: Record<Enums<"mode_amiable">, Enums<"fonction_amiable">> = {
  mediation: "mediateur",
  conciliation: "conciliateur",
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const MAX_PARTIES = 20

/**
 * Crée le dossier et ses parties. Le jeton du QR code de chaque partie et
 * l'événement « Ordonnance enregistrée » sont créés par la base.
 * Renvoie un message d'erreur, ou redirige vers la page du dossier.
 */
export async function creerDossier(saisie: DossierSaisi): Promise<{ erreur: string }> {
  // Appelable par n'importe quel client : on revérifie tout
  const texte = (valeur: unknown) => (typeof valeur === "string" ? valeur.trim() : "")
  const mode = saisie?.mode
  if (mode !== "mediation" && mode !== "conciliation") return { erreur: "Choisissez médiation ou conciliation." }

  const dossier = {
    mode,
    numero_rg: texte(saisie.numero_rg),
    juridiction: texte(saisie.juridiction),
    date_ordonnance: texte(saisie.date_ordonnance),
    mediateur_id: texte(saisie.mediateur_id),
  }
  if (Object.values(dossier).some((valeur) => !valeur)) {
    return { erreur: "Veuillez remplir tous les champs obligatoires du dossier." }
  }
  if (!DATE.test(dossier.date_ordonnance)) return { erreur: "La date de l'ordonnance n'est pas valide." }

  const saisies = Array.isArray(saisie.parties) ? saisie.parties.slice(0, MAX_PARTIES) : []
  const parties = saisies.map((partie) => ({
    role: partie?.role === "defendeur" ? ("defendeur" as const) : ("demandeur" as const),
    nom: texte(partie?.nom),
    prenom: texte(partie?.prenom),
    avocat_nom: texte(partie?.avocat_nom) || null,
    telephone: texte(partie?.telephone) || null,
    telephone_2: texte(partie?.telephone_2) || null,
    email: texte(partie?.email) || null,
    adresse: texte(partie?.adresse) || null,
  }))

  if (!parties.some((p) => p.role === "demandeur") || !parties.some((p) => p.role === "defendeur")) {
    return { erreur: "Il faut au moins un demandeur et un défendeur." }
  }
  if (parties.some((p) => !p.nom || !p.prenom)) {
    return { erreur: "Indiquez le nom et le prénom de chaque partie." }
  }
  const emailInvalide = parties.find((p) => p.email && !EMAIL.test(p.email))
  if (emailInvalide) {
    return { erreur: `L'adresse e-mail de ${emailInvalide.prenom} ${emailInvalide.nom} n'est pas valide.` }
  }

  // Co-médiateur : seulement à partir de 3 parties
  const coMediateurId = parties.length > 2 ? texte(saisie.co_mediateur_id) || null : null
  if (coMediateurId && coMediateurId === dossier.mediateur_id) {
    return { erreur: "Le co-médiateur doit être différent de l'intervenant principal." }
  }

  const supabase = await createClient()

  // L'intervenant (et le co-médiateur) doivent avoir la fonction du mode choisi
  const ids = [dossier.mediateur_id, coMediateurId].filter((id): id is string => Boolean(id))
  const { data: intervenants, error: erreurIntervenants } = await supabase
    .from("mediateurs")
    .select("id, fonction")
    .in("id", ids)
  if (erreurIntervenants) return { erreur: "Impossible de vérifier l'intervenant choisi." }
  const fonction = FONCTION_PAR_MODE[mode]
  if (
    intervenants.length !== ids.length ||
    intervenants.some((intervenant) => intervenant.fonction !== fonction)
  ) {
    return {
      erreur:
        mode === "mediation"
          ? "Choisissez un médiateur pour une médiation."
          : "Choisissez un conciliateur pour une conciliation.",
    }
  }

  const insertion: TablesInsert<"dossiers"> = { ...dossier, co_mediateur_id: coMediateurId }
  const { data: cree, error } = await supabase.from("dossiers").insert(insertion).select("id").single()

  if (error) {
    return {
      erreur:
        error.code === "23505"
          ? `Le dossier n° ${dossier.numero_rg} existe déjà.`
          : `Impossible de créer le dossier : ${error.message}`,
    }
  }

  const { error: erreurParties } = await supabase
    .from("parties")
    .insert(parties.map((partie) => ({ ...partie, dossier_id: cree.id })))

  if (erreurParties) {
    // Pas de dossier sans ses parties : on annule la création
    await supabase.from("dossiers").delete().eq("id", cree.id)
    return { erreur: `Impossible d'enregistrer les parties : ${erreurParties.message}` }
  }

  redirect(`/juridiction/dossiers/${cree.id}`)
}
