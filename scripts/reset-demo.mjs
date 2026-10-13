// Remet la base de démo à zéro, avec la clé service_role (aucun accès SQL).
//
//   npm run reset-demo            → vide et recrée les données de démo
//   npm run reset-demo -- --essai → affiche ce qui serait fait, sans rien écrire
//
// Efface toutes les lignes de disponibilites, parties, dossiers et creneaux,
// puis recrée 10 créneaux, les 3 dossiers de démo et le dossier 26/00300, prêt
// à être scanné en direct. Ne touche JAMAIS aux comptes (auth.users) ni à la
// table mediateurs, qui est seulement lue.

import { createClient } from "@supabase/supabase-js"

const ESSAI = process.argv.includes("--essai")
const EMAIL_MEDIATEUR = process.env.DEMO_MEDIATEUR_EMAIL || "mediateur@exemple.fr"
const JURIDICTION = "Cour d'appel de Saint-Denis"
// La Réunion : UTC+4 toute l'année (pas d'heure d'été)
const DECALAGE_REUNION = "+04:00"

for (const nom of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SITE_URL"]) {
  if (!process.env[nom]) arreter(`Variable ${nom} manquante dans .env.local.`)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)
const urlSite = process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "")

function arreter(message) {
  console.error(`\n✗ ${message}`)
  process.exit(1)
}

/** Lève l'erreur Supabase éventuelle, sinon renvoie les données. */
function verifier({ data, error }, etape) {
  if (error) arreter(`${etape} : ${error.message}`)
  return data
}

// ---------------------------------------------------------------------------
// Dates (heure de La Réunion)
// ---------------------------------------------------------------------------

/** Date du jour à La Réunion, décalée de n jours : « 2026-10-14 ». */
function jourReunion(decalage = 0) {
  const maintenant = new Date(Date.now() + 4 * 60 * 60 * 1000)
  maintenant.setUTCDate(maintenant.getUTCDate() + decalage)
  return maintenant.toISOString().slice(0, 10)
}

function estOuvre(jour) {
  const jourSemaine = new Date(`${jour}T12:00:00Z`).getUTCDay()
  return jourSemaine !== 0 && jourSemaine !== 6
}

/** 10 créneaux sur les 7 prochains jours ouvrés : 9h-12h chaque jour, 14h-17h les 1er, 3e et 5e. */
function creneauxDeDemo(mediateurId) {
  const jours = []
  for (let decalage = 1; jours.length < 7; decalage++) {
    const jour = jourReunion(decalage)
    if (estOuvre(jour)) jours.push(jour)
  }

  const creneaux = []
  jours.forEach((jour, index) => {
    const plages = [["09:00", "12:00"]]
    if ([0, 2, 4].includes(index)) plages.push(["14:00", "17:00"])
    for (const [debut, fin] of plages) {
      creneaux.push({
        mediateur_id: mediateurId,
        debut: `${jour}T${debut}:00${DECALAGE_REUNION}`,
        fin: `${jour}T${fin}:00${DECALAGE_REUNION}`,
      })
    }
  })
  return creneaux.sort((a, b) => a.debut.localeCompare(b.debut))
}

// ---------------------------------------------------------------------------
// Données de démo (personnes fictives)
// ---------------------------------------------------------------------------

const ilYA = (jours) => new Date(Date.now() - jours * 24 * 60 * 60 * 1000).toISOString()

const DOSSIERS = [
  { numero_rg: "26/00123", date_ordonnance: jourReunion(-3), provision_consignee: false },
  { numero_rg: "26/00145", date_ordonnance: jourReunion(-8), provision_consignee: true },
  { numero_rg: "26/00167", date_ordonnance: jourReunion(-15), provision_consignee: true },
  // Dossier à scanner en direct pendant la démo
  { numero_rg: "26/00300", date_ordonnance: jourReunion(0), provision_consignee: false },
]

// Le token est généré par la base quand il n'est pas fourni (dossier 26/00300).
const PARTIES = {
  // Personne n'a encore répondu → en attente
  "26/00123": [
    { role: "demandeur", nom: "Hoarau", prenom: "Jean-Marc", avocat_nom: "Me Sophie Lebon", token: "demo-1-demandeur" },
    { role: "defendeur", nom: "Grondin", prenom: "Nadia", token: "demo-1-defendeur" },
  ],
  // Seul le demandeur a répondu → partiellement joignable
  "26/00145": [
    {
      role: "demandeur", nom: "Payet", prenom: "Christophe", token: "demo-2-demandeur",
      telephone: "06 92 00 00 02", email: "c.payet@exemple.fr",
      consentement_rgpd: true, confirme_le: ilYA(2), rempli_par: "partie",
    },
    { role: "defendeur", nom: "Rivière", prenom: "Lucie", avocat_nom: "Me Paul Técher", token: "demo-2-defendeur" },
  ],
  // Le demandeur et l'avocate du défendeur ont répondu avec un créneau commun → RDV fixé
  "26/00167": [
    {
      role: "demandeur", nom: "Fontaine", prenom: "Gérald", token: "demo-3-demandeur",
      telephone: "06 93 00 00 03", email: "g.fontaine@exemple.fr",
      consentement_rgpd: true, confirme_le: ilYA(5), rempli_par: "partie",
    },
    {
      role: "defendeur", nom: "Maillot", prenom: "Sandrine", token: "demo-3-defendeur",
      telephone: "06 92 00 00 04", email: "s.maillot@exemple.fr",
      consentement_rgpd: true, confirme_le: ilYA(1), rempli_par: "avocat", passer_par_avocat: true,
      avocat_nom: "Me Anne Boyer", avocat_email: "a.boyer@avocats-exemple.fr",
      avocat_telephone: "02 62 00 00 05", avocat_barreau: "Saint-Denis de La Réunion",
    },
  ],
  // À scanner en direct : personne n'a répondu
  "26/00300": [
    { role: "demandeur", nom: "Lauret", prenom: "Jessica" },
    { role: "defendeur", nom: "Robert", prenom: "Fabrice", avocat_nom: "Me Julie Nativel" },
  ],
}

// Créneaux choisis (numéros des créneaux par ordre chronologique, à partir de 1)
const DISPONIBILITES = {
  "demo-2-demandeur": [1, 3, 6],
  "demo-3-demandeur": [2, 5, 8],
  "demo-3-defendeur": [5, 9],
}

// ---------------------------------------------------------------------------
// Exécution
// ---------------------------------------------------------------------------

console.log(`Projet Supabase : ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
console.log(ESSAI ? "Mode essai : aucune écriture.\n" : "")

// 1. Médiateur de démo (lu uniquement, jamais modifié)
const mediateur = verifier(
  await supabase.from("mediateurs").select("id, nom").eq("email", EMAIL_MEDIATEUR).maybeSingle(),
  "Lecture du médiateur"
)
if (!mediateur) {
  arreter(`Aucun médiateur avec l'e-mail ${EMAIL_MEDIATEUR}. Créez-le d'abord (ou définissez DEMO_MEDIATEUR_EMAIL).`)
}
console.log(`Médiateur : ${mediateur.nom}`)

const nouveauxCreneaux = creneauxDeDemo(mediateur.id)

if (ESSAI) {
  const compter = async (table) =>
    (await supabase.from(table).select("*", { count: "exact", head: true })).count
  console.log("\nLignes qui seraient supprimées :")
  for (const table of ["disponibilites", "parties", "dossiers", "creneaux"]) {
    console.log(`  ${table} : ${await compter(table)}`)
  }
  console.log("\nCréneaux qui seraient créés (heure de La Réunion) :")
  nouveauxCreneaux.forEach((c, i) => console.log(`  ${i + 1}. ${c.debut.slice(0, 16)} → ${c.fin.slice(11, 16)}`))
  console.log(`\nDossiers qui seraient créés : ${DOSSIERS.map((d) => d.numero_rg).join(", ")}`)
  process.exit(0)
}

// 2. Suppression (les disponibilités et parties partent aussi en cascade)
verifier(await supabase.from("disponibilites").delete().not("partie_id", "is", null), "Suppression des disponibilités")
verifier(await supabase.from("parties").delete().not("id", "is", null), "Suppression des parties")
verifier(await supabase.from("dossiers").delete().not("id", "is", null), "Suppression des dossiers")
verifier(await supabase.from("creneaux").delete().not("id", "is", null), "Suppression des créneaux")
console.log("✓ Anciennes données supprimées")

// 3. Créneaux
const creneaux = verifier(
  await supabase.from("creneaux").insert(nouveauxCreneaux).select("id, debut").order("debut"),
  "Création des créneaux"
)
console.log(`✓ ${creneaux.length} créneaux créés`)

// 4. Dossiers, parties, disponibilités (le statut est recalculé par la base)
const dossiers = verifier(
  await supabase
    .from("dossiers")
    .insert(DOSSIERS.map((d) => ({ ...d, juridiction: JURIDICTION, mediateur_id: mediateur.id })))
    .select("id, numero_rg"),
  "Création des dossiers"
)

const parties = verifier(
  await supabase
    .from("parties")
    .insert(
      dossiers.flatMap((dossier) =>
        PARTIES[dossier.numero_rg].map((partie) => ({ ...partie, dossier_id: dossier.id }))
      )
    )
    .select("id, role, token, dossier_id"),
  "Création des parties"
)

const disponibilites = parties.flatMap((partie) =>
  (DISPONIBILITES[partie.token] ?? []).map((n) => ({ partie_id: partie.id, creneau_id: creneaux[n - 1].id }))
)
verifier(await supabase.from("disponibilites").insert(disponibilites), "Création des disponibilités")

// 5. Vérification : statuts calculés par la base
const resultat = verifier(
  await supabase.from("dossiers").select("numero_rg, statut").order("numero_rg"),
  "Relecture des dossiers"
)
console.log("✓ Dossiers créés :")
for (const dossier of resultat) console.log(`    ${dossier.numero_rg}  ${dossier.statut}`)

// 6. Liens du dossier à scanner en direct
const direct = dossiers.find((d) => d.numero_rg === "26/00300")

console.log("\nDossier 26/00300, prêt à être scanné :")
for (const [role, libelle] of [["demandeur", "Demandeur"], ["defendeur", "Défendeur"]]) {
  const partie = parties.find((p) => p.dossier_id === direct.id && p.role === role)
  const fiche = PARTIES["26/00300"].find((p) => p.role === role)
  console.log(`  ${libelle} (${fiche.prenom} ${fiche.nom}) : ${urlSite}/p/${partie.token}`)
  console.log(`    son avocat : ${urlSite}/p/${partie.token}/avocat`)
}
console.log(`\nQR codes imprimables : ${urlSite}/juridiction/dossiers/${direct.id}`)
