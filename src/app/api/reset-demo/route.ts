import { timingSafeEqual } from "node:crypto"

import { connection } from "next/server"

import { reinitialiserDemo } from "@/lib/demo/reinitialiser.mjs"
import { MODE_DEMO } from "@/lib/demo/mode"
import { createAdminClient } from "@/lib/supabase/admin"

// Remise à zéro nocturne de la démo publique, appelée par Vercel Cron
// (vercel.json). Vercel envoie « Authorization: Bearer <CRON_SECRET> ».
// Même logique que `npm run reset-demo` : restaure aussi les deux comptes de
// démo (mot de passe, rôle), sans toucher à aucun autre compte.
// Inactive hors mode démo, pour ne jamais vider une base réelle.

export const maxDuration = 60

function autorise(entete: string | null) {
  const secret = process.env.CRON_SECRET
  if (!secret || !entete) return false
  const attendu = Buffer.from(`Bearer ${secret}`)
  const recu = Buffer.from(entete)
  return recu.length === attendu.length && timingSafeEqual(recu, attendu)
}

export async function GET(request: Request) {
  // Toujours exécutée à la requête, jamais prérendue au build
  await connection()

  if (!MODE_DEMO) {
    return Response.json({ erreur: "Mode démonstration désactivé." }, { status: 404 })
  }
  if (!autorise(request.headers.get("authorization"))) {
    return Response.json({ erreur: "Non autorisé." }, { status: 401 })
  }

  try {
    const dossiers = await reinitialiserDemo(createAdminClient(), { journal: console.log })
    return Response.json({ ok: true, dossiers })
  } catch (erreur) {
    console.error("Remise à zéro de la démo :", erreur)
    return Response.json({ erreur: "Échec de la remise à zéro." }, { status: 500 })
  }
}
