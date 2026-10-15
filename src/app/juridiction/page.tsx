import { PlusIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { BoutonDeconnexion } from "@/components/bouton-deconnexion"
import { BoutonChangerEspace } from "@/components/demo/entree-demo"
import { Button } from "@/components/ui/button"
import { MODE_DEMO } from "@/lib/demo/mode"
import { createClient } from "@/lib/supabase/server"

import { TableauSuivi } from "./tableau-suivi"

export const metadata: Metadata = {
  title: "Tableau de suivi — Espace juridiction",
}

// Requête du tableau de suivi (une seule, tous les dossiers)
const SELECT_SUIVI = `id, numero_rg, mode, date_ordonnance, statut, issue,
  mediateur:mediateurs!dossiers_mediateur_id_fkey (nom),
  co_mediateur:mediateurs!dossiers_co_mediateur_id_fkey (nom),
  rdv:creneaux!dossiers_rdv_creneau_id_fkey (debut),
  parties (id, role, nom, prenom, choix, confirme_le, consentement_rgpd)`

export default function EspaceJuridiction() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold">Tableau de suivi</h1>
          <Suspense fallback={<p className="text-sm text-muted-foreground">Espace juridiction</p>}>
            <CompteConnecte />
          </Suspense>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button render={<Link href="/juridiction/nouveau" />} nativeButton={false}>
            <PlusIcon aria-hidden />
            Nouveau dossier
          </Button>
          {MODE_DEMO && <BoutonChangerEspace vers="mediateur" />}
          <BoutonDeconnexion />
        </div>
      </header>

      <Suspense fallback={<p className="text-muted-foreground">Chargement des dossiers…</p>}>
        <Suivi />
      </Suspense>
    </main>
  )
}

// Lit la session : rendu à chaque requête, d'où le Suspense.
async function CompteConnecte() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  return (
    <p className="text-sm text-muted-foreground">
      Espace juridiction · connecté en tant que {data?.claims.email}
    </p>
  )
}

async function Suivi() {
  const supabase = await createClient()
  const { data: dossiers, error } = await supabase
    .from("dossiers")
    .select(SELECT_SUIVI)
    .order("date_ordonnance", { ascending: false })

  if (error) {
    return (
      <p role="alert" className="text-destructive">
        Impossible de charger les dossiers : {error.message}
      </p>
    )
  }

  if (dossiers.length === 0) {
    return <p className="text-muted-foreground">Aucun dossier pour l&apos;instant.</p>
  }

  return <TableauSuivi dossiers={dossiers} maintenant={heureDeRequete()} />
}

// Heure de la requête (après connection(), appelé par createClient) : sert au
// calcul des jours écoulés côté client sans Date.now() pendant le rendu.
function heureDeRequete() {
  return Date.now()
}
