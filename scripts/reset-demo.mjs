// Remet la base de démo à zéro, avec la clé service_role (aucun accès SQL).
//
//   npm run reset-demo            → vide et recrée les données de démo V2
//   npm run reset-demo -- --essai → affiche ce qui serait fait, sans rien écrire
//
// La logique est dans src/lib/demo/reinitialiser.mjs, partagée avec la route
// planifiée /api/reset-demo (remise à zéro chaque nuit de la démo publique).
// Restaure aussi les deux comptes de démo (variables DEMO_*, facultatives) ;
// ne touche à aucun autre compte ni à la table mediateurs.

import { createClient } from "@supabase/supabase-js"

import { DOSSIER_DIRECT, reinitialiserDemo } from "../src/lib/demo/reinitialiser.mjs"

const ESSAI = process.argv.includes("--essai")

function arreter(message) {
  console.error(`\n✗ ${message}`)
  process.exit(1)
}

for (const nom of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SITE_URL"]) {
  if (!process.env[nom]) arreter(`Variable ${nom} manquante dans .env.local.`)
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const urlSite = process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "")

console.log(`Projet Supabase : ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
if (ESSAI) console.log("Mode essai : aucune écriture.")

let dossiers
try {
  dossiers = await reinitialiserDemo(supabase, { essai: ESSAI })
} catch (erreur) {
  arreter(erreur.message)
}
if (ESSAI) process.exit(0)

console.log("✓ Dossiers :")
for (const d of dossiers) {
  console.log(`    ${d.numero_rg}  ${d.mode.padEnd(12)} ${d.statut.padEnd(24)} ${d.issue.padEnd(13)} ${d.evenements} événement(s)`)
}

console.log("\nDossier 26/00300, prêt à être scanné en direct :")
console.log(`  Demandeur (Marie Payet) : ${urlSite}/p/demo-300-demandeur`)
console.log(`  Défendeur (Jean Hoarau) : ${urlSite}/p/demo-300-defendeur`)
console.log(`  QR codes imprimables    : ${urlSite}/juridiction/dossiers/${DOSSIER_DIRECT}`)
