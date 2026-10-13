"use server"

import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

// En cas d'erreur, on renvoie les valeurs saisies pour remplir à nouveau le
// formulaire (React 19 vide les formulaires après une action serveur).
export type EtatNouveauDossier = {
  erreur?: string
  valeurs?: Record<string, string>
  essai: number
}

const ROLES = ["demandeur", "defendeur"] as const

export async function creerDossier(
  etatPrecedent: EtatNouveauDossier,
  formData: FormData
): Promise<EtatNouveauDossier> {
  const champ = (nom: string) => String(formData.get(nom) ?? "").trim()
  const echec = (erreur: string): EtatNouveauDossier => ({
    erreur,
    valeurs: Object.fromEntries(
      [...formData.entries()].map(([nom, valeur]) => [nom, String(valeur)])
    ),
    essai: etatPrecedent.essai + 1,
  })

  const dossier = {
    numero_rg: champ("numero_rg"),
    juridiction: champ("juridiction"),
    date_ordonnance: champ("date_ordonnance"),
    mediateur_id: champ("mediateur_id"),
  }
  const parties = ROLES.map((role) => ({
    role,
    nom: champ(`${role}_nom`),
    prenom: champ(`${role}_prenom`),
    avocat_nom: champ(`${role}_avocat_nom`) || null,
  }))

  if (
    Object.values(dossier).some((valeur) => !valeur) ||
    parties.some((partie) => !partie.nom || !partie.prenom)
  ) {
    return echec("Veuillez remplir tous les champs obligatoires.")
  }

  const supabase = await createClient()

  const { data: cree, error } = await supabase
    .from("dossiers")
    .insert(dossier)
    .select("id")
    .single()

  if (error) {
    return echec(
      error.code === "23505"
        ? `Le dossier n° ${dossier.numero_rg} existe déjà.`
        : `Impossible de créer le dossier : ${error.message}`
    )
  }

  // Le jeton de chaque partie (QR code) est généré par la base :
  // 128 bits aléatoires (gen_random_bytes), voir la migration initiale.
  const { error: erreurParties } = await supabase
    .from("parties")
    .insert(parties.map((partie) => ({ ...partie, dossier_id: cree.id })))

  if (erreurParties) {
    // Pas de dossier sans ses parties : on annule la création.
    await supabase.from("dossiers").delete().eq("id", cree.id)
    return echec(`Impossible d'enregistrer les parties : ${erreurParties.message}`)
  }

  redirect(`/greffe/dossiers/${cree.id}`)
}
