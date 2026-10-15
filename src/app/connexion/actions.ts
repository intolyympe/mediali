"use server"

import { redirect } from "next/navigation"

import { MODE_DEMO, type EspaceDemo } from "@/lib/demo/mode"
import { ACCUEIL_PAR_ROLE, lireRole, type Role } from "@/lib/roles"
import { createClient } from "@/lib/supabase/server"

export type EtatConnexion = {
  erreur?: string
  email?: string
}

export async function seConnecter(
  _etatPrecedent: EtatConnexion,
  formData: FormData
): Promise<EtatConnexion> {
  const email = String(formData.get("email") ?? "").trim()
  const motDePasse = String(formData.get("mot_de_passe") ?? "")

  if (!email || !motDePasse) {
    return {
      erreur: "Veuillez renseigner votre adresse e-mail et votre mot de passe.",
      email,
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: motDePasse,
  })

  if (error) {
    return { erreur: "Adresse e-mail ou mot de passe incorrect.", email }
  }

  const role = lireRole(data.user)
  if (!role) {
    await supabase.auth.signOut()
    return {
      erreur: "Ce compte n'a pas encore de rôle (juridiction ou médiateur). Contactez l'administrateur.",
      email,
    }
  }

  redirect(ACCUEIL_PAR_ROLE[role])
}

export async function seDeconnecter() {
  const supabase = await createClient()
  // Démo : les comptes sont partagés par tous les visiteurs. La déconnexion
  // globale (par défaut) fermerait la session de tout le monde.
  await supabase.auth.signOut(MODE_DEMO ? { scope: "local" } : undefined)
  redirect("/connexion")
}

export type EtatDemo = { erreur?: string }

// Comptes de démonstration : identifiants lus côté serveur uniquement.
const COMPTES_DEMO: Record<EspaceDemo, { role: Role; email?: string; motDePasse?: string }> = {
  juridiction: {
    role: "greffe",
    email: process.env.DEMO_JURIDICTION_EMAIL,
    motDePasse: process.env.DEMO_JURIDICTION_PASSWORD,
  },
  mediateur: {
    role: "mediateur",
    email: process.env.DEMO_MEDIATEUR_EMAIL,
    motDePasse: process.env.DEMO_MEDIATEUR_PASSWORD,
  },
}

/**
 * Démo publique : connecte le visiteur au compte de démonstration de l'espace
 * choisi (champ `espace` du formulaire), puis l'y redirige. Sert aussi à
 * changer d'espace : la nouvelle session remplace l'ancienne.
 */
export async function entrerEnDemo(
  _etatPrecedent: EtatDemo,
  formData: FormData
): Promise<EtatDemo> {
  if (!MODE_DEMO) return { erreur: "La démonstration n'est pas activée." }

  const espace = formData.get("espace")
  if (espace !== "juridiction" && espace !== "mediateur") {
    return { erreur: "Espace inconnu." }
  }

  const compte = COMPTES_DEMO[espace]
  if (!compte.email || !compte.motDePasse) {
    return { erreur: "Le compte de démonstration n'est pas configuré." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: compte.email,
    password: compte.motDePasse,
  })
  if (error) {
    return { erreur: "Connexion au compte de démonstration impossible. Réessayez dans un instant." }
  }

  if (lireRole(data.user) !== compte.role) {
    await supabase.auth.signOut({ scope: "local" })
    return { erreur: "Le compte de démonstration n'a pas le bon rôle." }
  }

  redirect(ACCUEIL_PAR_ROLE[compte.role])
}
