"use server"

import { lireMediateurId } from "@/lib/roles"
import { createClient } from "@/lib/supabase/server"

export async function changerProvision(dossierId: string, consignee: boolean) {
  if (typeof dossierId !== "string" || typeof consignee !== "boolean") {
    return { erreur: "Requête invalide." }
  }

  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const mediateurId = lireMediateurId(claims?.claims)
  if (!mediateurId) return { erreur: "Accès réservé au médiateur." }

  // Uniquement sur un dossier confié à ce médiateur
  const { data, error } = await supabase
    .from("dossiers")
    .update({ provision_consignee: consignee })
    .eq("id", dossierId)
    .eq("mediateur_id", mediateurId)
    .select("id")

  if (error || data.length === 0) return { erreur: "Enregistrement impossible." }
  return { erreur: null }
}
