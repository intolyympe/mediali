import type { Metadata } from "next"
import { Suspense } from "react"

import { BoutonDeconnexion } from "@/components/bouton-deconnexion"
import { BoutonChangerEspace } from "@/components/demo/entree-demo"
import { MODE_DEMO } from "@/lib/demo/mode"
import { lireMediateurId } from "@/lib/roles"
import { createClient } from "@/lib/supabase/server"

import { filtreIntervenant, SELECT_DOSSIERS } from "./donnees"
import { TableauDeBord } from "./tableau-de-bord"

export const metadata: Metadata = {
  title: "Mes dossiers – Espace médiateur",
}

export default function EspaceMediateur() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8">
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">Chargement…</p>}
      >
        <ContenuEspaceMediateur />
      </Suspense>
    </main>
  )
}

// Lit la session et la base : rendu à chaque requête, d'où le Suspense.
async function ContenuEspaceMediateur() {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const mediateurId = lireMediateurId(claims?.claims)

  if (!mediateurId) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p role="alert" className="text-sm text-destructive">
          Ce compte n&apos;est relié à aucun médiateur. Contactez l&apos;administrateur.
        </p>
        <BoutonDeconnexion />
      </div>
    )
  }

  // Dossiers où il est intervenant principal ou co-médiateur
  const [{ data: dossiers, error }, { data: intervenant }] = await Promise.all([
    supabase
      .from("dossiers")
      .select(SELECT_DOSSIERS)
      .or(filtreIntervenant(mediateurId))
      .order("created_at", { ascending: false }),
    supabase.from("mediateurs").select("nom, fonction").eq("id", mediateurId).maybeSingle(),
  ])
  const conciliateur = intervenant?.fonction === "conciliateur"

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Mes dossiers</h1>
          <p className="text-sm text-muted-foreground">
            Espace {conciliateur ? "conciliateur" : "médiateur"} · {intervenant?.nom ?? claims?.claims.email}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {MODE_DEMO && <BoutonChangerEspace vers="juridiction" />}
          <BoutonDeconnexion />
        </div>
      </header>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          Impossible de charger les dossiers : {error.message}
        </p>
      ) : (
        <TableauDeBord
          mediateurId={mediateurId}
          dossiersInitiaux={dossiers}
          maintenant={heureDeRequete()}
        />
      )}
    </>
  )
}

// Heure de la requête (après connection(), appelé par createClient) : sert au
// calcul des jours écoulés côté client sans Date.now() pendant le rendu.
function heureDeRequete() {
  return Date.now()
}
