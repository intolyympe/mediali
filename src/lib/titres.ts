import "server-only"

import type { Metadata } from "next"

import { createClient } from "@/lib/supabase/server"

// Titre de l'onglet d'une page de dossier : « Dossier 26/00300 – Espace
// médiateur – Médiali » (le suffixe « – Médiali » vient du layout). Lit le
// numéro RG à la requête, sous la RLS (utilisateur connecté).
export async function titreDossier(
  params: Promise<{ id: string }>,
  espace: "Espace juridiction" | "Espace médiateur"
): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from("dossiers").select("numero_rg").eq("id", id).maybeSingle()
  return { title: data ? `Dossier ${data.numero_rg} – ${espace}` : `Dossier introuvable – ${espace}` }
}
