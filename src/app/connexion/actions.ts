"use server"

import { redirect } from "next/navigation"

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
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: motDePasse,
  })

  if (error) {
    return { erreur: "Adresse e-mail ou mot de passe incorrect.", email }
  }

  redirect("/tableau-de-bord")
}

export async function seDeconnecter() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/connexion")
}
