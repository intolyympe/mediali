// Remise à zéro de la base de démo, avec un client Supabase « service_role ».
//
// Partagé par le script `npm run reset-demo` (scripts/reset-demo.mjs) et la
// route planifiée /api/reset-demo (src/app/api/reset-demo/route.ts). Fichier
// JavaScript pour pouvoir être importé par Node sans compilation.
//
// Vide evenements, disponibilites, parties, dossiers et creneaux, puis recrée
// exactement le seed V2 (supabase/seed.sql : 7 dossiers, parties,
// disponibilités, créneaux, événements) et le dossier 26/00300 à scanner en
// direct. Enfin, restaure les deux comptes de démo (mot de passe et rôle, voir
// restaurerComptesDemo). Ne touche à AUCUN autre compte (auth.users) ni à la
// table mediateurs, qui est seulement lue.
//
// L'ordre d'insertion est celui du seed : les déclencheurs SQL calculent les
// statuts, le rendez-vous automatique et une partie de la timeline.

/** Lève l'erreur Supabase éventuelle, sinon renvoie les données. */
function verifier({ data, error }, etape) {
  if (error) throw new Error(`${etape} : ${error.message}`)
  return data
}

// ---------------------------------------------------------------------------
// Dates (La Réunion : UTC+4 toute l'année)
// ---------------------------------------------------------------------------

const REUNION = "+04:00"
const JOUR_MS = 24 * 60 * 60 * 1000

/** Date du jour à La Réunion, décalée de n jours : « 2026-10-14 ». */
function jour(decalage = 0) {
  const date = new Date(Date.now() + 4 * 60 * 60 * 1000)
  date.setUTCDate(date.getUTCDate() + decalage)
  return date.toISOString().slice(0, 10)
}
const estOuvre = (j) => ![0, 6].includes(new Date(`${j}T12:00:00Z`).getUTCDay())
const heure = (j, h) => `${j}T${h}:00${REUNION}`
/** Il y a n jours (et h heures), comme `now() - interval` dans le seed. */
const ilYA = (jours, heures = 0) => new Date(Date.now() - jours * JOUR_MS - heures * 3600 * 1000).toISOString()
/** « 16/10/2026 à 14h00 », comme to_char(... 'DD/MM/YYYY "à" HH24"h"MI') */
function dateHeureFr(iso) {
  const local = new Date(Date.parse(iso) + 4 * 3600 * 1000).toISOString()
  return `${local.slice(8, 10)}/${local.slice(5, 7)}/${local.slice(0, 4)} à ${local.slice(11, 13)}h${local.slice(14, 16)}`
}

// ---------------------------------------------------------------------------
// Données du seed V2 (personnes fictives)
// ---------------------------------------------------------------------------

const FONTAINE = "11111111-0000-0000-0000-000000000001"
const LAURET = "11111111-0000-0000-0000-000000000002"
const HOARAU_CONCILIATRICE = "11111111-0000-0000-0000-000000000003"
const CA = "Cour d'appel de démonstration"
const D = (n) => `22222222-0000-0000-0000-00000000000${n}`
const CRENEAU_PASSE_1 = "33333333-0000-0000-0000-000000000001"
const CRENEAU_PASSE_2 = "33333333-0000-0000-0000-000000000002"

/** Dossier 26/00300, à scanner en direct pendant la démo. */
export const DOSSIER_DIRECT = "22222222-0000-0000-0000-000000000300"

/** 10 créneaux à venir sur les 7 prochains jours ouvrés : 9h-12h, et 14h-17h les 1er, 3e et 5e jours. */
function creneauxAVenir() {
  const jours = []
  for (let decalage = 1; decalage <= 14 && jours.length < 7; decalage++) {
    if (estOuvre(jour(decalage))) jours.push(jour(decalage))
  }
  return jours.flatMap((j, index) => [
    { mediateur_id: FONTAINE, debut: heure(j, "09:00"), fin: heure(j, "12:00") },
    ...([0, 2, 4].includes(index) ? [{ mediateur_id: FONTAINE, debut: heure(j, "14:00"), fin: heure(j, "17:00") }] : []),
  ])
}

/** 2 créneaux passés (8e et 4e jours ouvrés avant aujourd'hui), pour les dossiers clos. */
function creneauxPasses() {
  const jours = []
  for (let decalage = -1; decalage >= -30; decalage--) if (estOuvre(jour(decalage))) jours.push(jour(decalage))
  return [
    { id: CRENEAU_PASSE_1, mediateur_id: FONTAINE, debut: heure(jours[7], "09:00"), fin: heure(jours[7], "12:00") },
    { id: CRENEAU_PASSE_2, mediateur_id: FONTAINE, debut: heure(jours[3], "09:00"), fin: heure(jours[3], "12:00") },
  ]
}

const dossier = (id, numero_rg, decalage, mode, mediateur_id, co_mediateur_id, provision, autres = {}) => ({
  id, numero_rg, juridiction: CA, date_ordonnance: jour(-decalage), mode, mediateur_id, co_mediateur_id,
  provision_consignee: provision, rdv_creneau_id: null, issue: "en_cours", compte_rendu: null, cloture_le: null,
  created_at: ilYA(decalage), ...autres,
})

// Fonctions et non constantes : les dates sont calculées à chaque remise à
// zéro (la route planifiée peut rester chargée en mémoire plusieurs jours).
const dossiers = () => [
  // 1. Médiation, personne n'a répondu → en attente
  dossier(D(1), "26/00123", 3, "mediation", FONTAINE, null, false),
  // 2. Médiation, une partie sur deux a répondu → partiellement joignable
  dossier(D(2), "26/00145", 8, "mediation", FONTAINE, null, true),
  // 3. Médiation, créneau commun → RDV fixé automatiquement
  dossier(D(3), "26/00167", 15, "mediation", FONTAINE, null, true),
  // 4. Conciliation
  dossier(D(4), "26/00180", 6, "conciliation", HOARAU_CONCILIATRICE, null, false, {
    juridiction: "Tribunal judiciaire de démonstration",
  }),
  // 5. Trois parties, co-médiation, un refus
  dossier(D(5), "26/00192", 10, "mediation", FONTAINE, LAURET, true),
  // 6. Clos avec accord total
  dossier(D(6), "26/00098", 45, "mediation", FONTAINE, null, true, {
    rdv_creneau_id: CRENEAU_PASSE_1,
    issue: "accord_total",
    compte_rendu:
      "Les parties ont trouvé un accord sur l'échéancier de remboursement. Protocole d'accord signé, transmis au juge pour homologation.",
    cloture_le: ilYA(2),
  }),
  // 7. Carence : le défendeur ne s'est pas présenté
  dossier(D(7), "26/00105", 40, "mediation", FONTAINE, null, true, {
    rdv_creneau_id: CRENEAU_PASSE_2,
    issue: "carence",
    compte_rendu:
      "Le défendeur, régulièrement convoqué, ne s'est pas présenté au premier rendez-vous. Procès-verbal de carence dressé.",
    cloture_le: ilYA(3),
  }),
  // Dossier à scanner en direct pendant la démo
  dossier(DOSSIER_DIRECT, "26/00300", 0, "mediation", FONTAINE, null, false, {
    created_at: new Date().toISOString(),
  }),
]

const repondu = (jours, rempli_par, choix, pref_format, pref_lieu) => ({
  consentement_rgpd: choix !== "refuse",
  confirme_le: ilYA(jours),
  rempli_par,
  choix,
  pref_format,
  pref_lieu,
})

const parties = () => [
  // 1. En attente
  { dossier_id: D(1), role: "demandeur", nom: "Hoarau", prenom: "Jean-Marc", token: "demo-1-demandeur", avocat_nom: "Me Sophie Lebon" },
  { dossier_id: D(1), role: "defendeur", nom: "Grondin", prenom: "Nadia", token: "demo-1-defendeur" },
  // 2. Partiellement joignable
  { dossier_id: D(2), role: "demandeur", nom: "Payet", prenom: "Christophe", token: "demo-2-demandeur",
    telephone: "06 92 00 00 02", email: "c.payet@exemple.fr", ...repondu(2, "partie", "accepte", "ensemble", "presentiel") },
  { dossier_id: D(2), role: "defendeur", nom: "Rivière", prenom: "Lucie", token: "demo-2-defendeur", avocat_nom: "Me Paul Técher" },
  // 3. RDV fixé (le défendeur a répondu via son avocate)
  { dossier_id: D(3), role: "demandeur", nom: "Fontaine", prenom: "Gérald", token: "demo-3-demandeur",
    telephone: "06 93 00 00 03", email: "g.fontaine@exemple.fr", ...repondu(5, "partie", "accepte", "indifferent", "presentiel") },
  { dossier_id: D(3), role: "defendeur", nom: "Maillot", prenom: "Sandrine", token: "demo-3-defendeur",
    telephone: "06 92 00 00 04", email: "s.maillot@exemple.fr", ...repondu(1, "avocat", "accepte", "separe", "indifferent"),
    passer_par_avocat: true, avocat_nom: "Me Anne Boyer", avocat_email: "a.boyer@avocats-exemple.fr",
    avocat_telephone: "02 62 00 00 05", avocat_barreau: "Saint-Denis de La Réunion" },
  // 4. Conciliation : le demandeur veut d'abord une réunion d'information
  { dossier_id: D(4), role: "demandeur", nom: "Turpin", prenom: "Alain", token: "demo-4-demandeur",
    telephone: "06 92 00 00 08", adresse: "12 rue de Paris, 97400 Saint-Denis",
    ...repondu(1, "partie", "information", "separe", "distanciel") },
  { dossier_id: D(4), role: "defendeur", nom: "Dijoux", prenom: "Murielle", token: "demo-4-defendeur" },
  // 5. Trois parties : deux demandeurs (dont un refus), un défendeur sans réponse
  { dossier_id: D(5), role: "demandeur", nom: "Lebreton", prenom: "Patrick", token: "demo-5-demandeur-1",
    telephone: "06 93 00 00 09", telephone_2: "02 62 00 00 10", email: "p.lebreton@exemple.fr",
    adresse: "4 chemin des Lilas, 97490 Sainte-Clotilde", ...repondu(4, "partie", "accepte", "ensemble", "presentiel") },
  { dossier_id: D(5), role: "demandeur", nom: "Lebreton", prenom: "Annie", token: "demo-5-demandeur-2",
    ...repondu(2, "partie", "refuse", null, null) },
  { dossier_id: D(5), role: "defendeur", nom: "Bègue", prenom: "Olivier", token: "demo-5-defendeur", avocat_nom: "Me Karine Payet" },
  // 6. Clos avec accord
  { dossier_id: D(6), role: "demandeur", nom: "Morel", prenom: "Isabelle", token: "demo-6-demandeur",
    telephone: "06 92 00 00 11", email: "i.morel@exemple.fr", ...repondu(30, "partie", "accepte", "ensemble", "presentiel") },
  { dossier_id: D(6), role: "defendeur", nom: "Cadet", prenom: "Bruno", token: "demo-6-defendeur",
    telephone: "06 93 00 00 12", ...repondu(25, "avocat", "accepte", "indifferent", "presentiel"),
    avocat_nom: "Me Hélène Nativel", avocat_email: "h.nativel@avocats-exemple.fr",
    avocat_telephone: "02 62 00 00 13", avocat_barreau: "Saint-Denis de La Réunion" },
  // 7. Carence
  { dossier_id: D(7), role: "demandeur", nom: "Clain", prenom: "Sabine", token: "demo-7-demandeur",
    telephone: "06 92 00 00 14", email: "s.clain@exemple.fr", ...repondu(20, "partie", "accepte", "ensemble", "distanciel") },
  { dossier_id: D(7), role: "defendeur", nom: "Ethève", prenom: "Rodolphe", token: "demo-7-defendeur",
    telephone: "06 93 00 00 15", ...repondu(18, "partie", "information", "separe", "presentiel") },
  // 26/00300 : à scanner en direct, sans avocat
  { dossier_id: DOSSIER_DIRECT, role: "demandeur", nom: "Payet", prenom: "Marie", token: "demo-300-demandeur" },
  { dossier_id: DOSSIER_DIRECT, role: "defendeur", nom: "Hoarau", prenom: "Jean", token: "demo-300-defendeur" },
]

// Créneaux à venir choisis (numéros par ordre chronologique, à partir de 1)
const DISPONIBILITES = {
  "demo-2-demandeur": [1, 3, 6],
  "demo-3-demandeur": [2, 5, 8],
  "demo-3-defendeur": [5, 9],
  "demo-5-demandeur-1": [3, 7],
}

const TABLES_VIDEES = [
  ["evenements", "id"],
  ["disponibilites", "partie_id"],
  ["parties", "id"],
  ["dossiers", "id"],
  ["creneaux", "id"],
]

// ---------------------------------------------------------------------------
// Comptes de démo
// ---------------------------------------------------------------------------

/** Comptes partagés de la démo publique (variables DEMO_*, côté serveur). */
function comptesDemo() {
  return [
    { nom: "juridiction", email: process.env.DEMO_JURIDICTION_EMAIL, motDePasse: process.env.DEMO_JURIDICTION_PASSWORD },
    { nom: "médiateur", email: process.env.DEMO_MEDIATEUR_EMAIL, motDePasse: process.env.DEMO_MEDIATEUR_PASSWORD },
  ]
}

/** Retrouve des comptes par leur e-mail (lecture seule, page par page). */
async function trouverComptes(supabase, emails) {
  const cherches = new Set(emails.map((email) => email.toLowerCase()))
  const trouves = new Map()
  const parPage = 1000
  for (let page = 1; ; page++) {
    const { users } = verifier(await supabase.auth.admin.listUsers({ page, perPage: parPage }), "Lecture des comptes")
    for (const compte of users) {
      const email = compte.email?.toLowerCase()
      if (email && cherches.has(email)) trouves.set(email, compte)
    }
    if (users.length < parPage || trouves.size === cherches.size) return trouves
  }
}

/**
 * Remet le mot de passe des deux comptes de démo à la valeur des variables
 * DEMO_*_PASSWORD et réapplique leur rôle (app_metadata), au cas où un
 * visiteur les aurait modifiés. Seuls ces deux comptes sont modifiés.
 * Sans aucune variable DEMO_* (base de démo sans démo publique) : rien à faire.
 */
async function restaurerComptesDemo(supabase, { essai, journal }) {
  const [juridiction, mediateur] = comptesDemo()
  const configures = [juridiction, mediateur].filter((compte) => compte.email || compte.motDePasse)
  if (configures.length === 0) {
    journal("Comptes de démo : variables DEMO_* absentes, comptes non modifiés.")
    return
  }
  for (const compte of [juridiction, mediateur]) {
    if (!compte.email || !compte.motDePasse) {
      throw new Error(`Compte de démo ${compte.nom} : e-mail ou mot de passe manquant (variables DEMO_*).`)
    }
  }
  if (juridiction.email.toLowerCase() === mediateur.email.toLowerCase()) {
    throw new Error("Les deux comptes de démo doivent avoir des e-mails différents.")
  }

  // Le compte médiateur est relié à la ligne de mediateurs qui a le même e-mail
  const ligne = verifier(
    await supabase.from("mediateurs").select("id, nom").eq("email", mediateur.email).maybeSingle(),
    "Lecture du médiateur de démo"
  )
  if (!ligne) throw new Error(`Aucun médiateur avec l'e-mail ${mediateur.email} dans la table mediateurs.`)
  juridiction.app_metadata = { role: "greffe" }
  mediateur.app_metadata = { role: "mediateur", mediateur_id: ligne.id }

  const trouves = await trouverComptes(supabase, [juridiction.email, mediateur.email])
  for (const compte of [juridiction, mediateur]) {
    const utilisateur = trouves.get(compte.email.toLowerCase())
    if (!utilisateur) throw new Error(`Compte de démo ${compte.nom} introuvable : ${compte.email}.`)
    const description = `${compte.email} (${JSON.stringify(compte.app_metadata)})`
    if (essai) {
      journal(`Compte de démo ${compte.nom} qui serait restauré : ${description}`)
      continue
    }
    verifier(
      await supabase.auth.admin.updateUserById(utilisateur.id, {
        password: compte.motDePasse,
        app_metadata: compte.app_metadata,
      }),
      `Restauration du compte de démo ${compte.nom}`
    )
    journal(`✓ Compte de démo ${compte.nom} restauré : ${description}`)
  }
}

// ---------------------------------------------------------------------------
// Exécution
// ---------------------------------------------------------------------------

/**
 * Vide puis recrée les données de démo, puis restaure les deux comptes de
 * démo. Lève une erreur à la première étape qui échoue.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase client « service_role »
 * @param {{ essai?: boolean, journal?: (message: string) => void }} [options]
 *   essai : affiche ce qui serait fait, sans rien écrire.
 * @returns {Promise<{ numero_rg: string, mode: string, statut: string, issue: string, evenements: number }[]>}
 *   les dossiers recréés (vide en mode essai)
 */
export async function reinitialiserDemo(supabase, { essai = false, journal = console.log } = {}) {
  // 1. Les intervenants du seed doivent exister (table lue seulement, jamais modifiée)
  const intervenants = verifier(
    await supabase.from("mediateurs").select("id, nom").in("id", [FONTAINE, LAURET, HOARAU_CONCILIATRICE]),
    "Lecture des médiateurs"
  )
  if (intervenants.length !== 3) {
    throw new Error(
      "Il manque des intervenants du seed dans la table mediateurs : exécutez d'abord la partie « Médiateurs » de supabase/seed.sql."
    )
  }
  journal(`Intervenants : ${intervenants.map((i) => i.nom).join(", ")}`)

  const aVenir = creneauxAVenir()
  const passes = creneauxPasses()
  const DOSSIERS = dossiers()

  if (essai) {
    const compter = async (table) => (await supabase.from(table).select("*", { count: "exact", head: true })).count
    journal("\nLignes qui seraient supprimées :")
    for (const [table] of TABLES_VIDEES) journal(`  ${table} : ${await compter(table)}`)
    journal(`\nCréneaux à venir : ${aVenir.map((c) => c.debut.slice(0, 16)).join(", ")}`)
    journal(`Créneaux passés : ${passes.map((c) => c.debut.slice(0, 16)).join(", ")}`)
    journal(`Dossiers : ${DOSSIERS.map((d) => d.numero_rg).join(", ")}`)
    await restaurerComptesDemo(supabase, { essai, journal })
    return []
  }

  // 2. Vidage (comptes et médiateurs non touchés)
  for (const [table, colonne] of TABLES_VIDEES) {
    verifier(await supabase.from(table).delete().not(colonne, "is", null), `Vidage de ${table}`)
  }
  journal("✓ Données vidées (evenements, disponibilites, parties, dossiers, creneaux)")

  // 3. Créneaux (à venir, puis passés pour les dossiers clos)
  const creneaux = verifier(
    await supabase.from("creneaux").insert(aVenir).select("id, debut").order("debut"),
    "Création des créneaux à venir"
  )
  verifier(await supabase.from("creneaux").insert(passes), "Création des créneaux passés")
  journal(`✓ ${creneaux.length + passes.length} créneaux`)

  // 4. Dossiers (« Ordonnance enregistrée » est créé par la base)
  verifier(await supabase.from("dossiers").insert(DOSSIERS), "Création des dossiers")
  // 5. Parties (« … a transmis ses coordonnées » / « … refuse » et statuts calculés par la base)
  const partiesCreees = verifier(
    await supabase.from("parties").insert(parties(), { defaultToNull: false }).select("id, token"),
    "Création des parties"
  )
  // 6. Disponibilités (le créneau commun du dossier 26/00167 est réservé par la base)
  verifier(
    await supabase.from("disponibilites").insert(
      partiesCreees.flatMap((partie) =>
        (DISPONIBILITES[partie.token] ?? []).map((n) => ({ partie_id: partie.id, creneau_id: creneaux[n - 1].id }))
      )
    ),
    "Création des disponibilités"
  )
  // 7. Format du rendez-vous du dossier 26/00167 (choisi par le médiateur)
  verifier(
    await supabase.from("dossiers").update({ rdv_format: "ensemble", rdv_lieu: "presentiel" }).eq("id", D(3)),
    "Format du rendez-vous"
  )
  // 8. Événements passés des dossiers clos (insérés à la main pour les dater)
  const debutPasse = Object.fromEntries(passes.map((c) => [c.id, c.debut]))
  const rdvFixe = (creneau) => `Premier rendez-vous fixé le ${dateHeureFr(debutPasse[creneau])}`
  verifier(
    await supabase.from("evenements").insert([
      { dossier_id: D(6), type: "rdv_fixe", libelle: rdvFixe(CRENEAU_PASSE_1), acteur: "systeme", details: {}, created_at: ilYA(25) },
      { dossier_id: D(6), type: "compte_rendu", libelle: "Compte rendu ajouté", acteur: "mediateur", details: {}, created_at: ilYA(2, 1) },
      { dossier_id: D(6), type: "issue", libelle: "Issue : accord total", acteur: "mediateur",
        details: { avant: "en_cours", apres: "accord_total" }, created_at: ilYA(2) },
      { dossier_id: D(7), type: "rdv_fixe", libelle: rdvFixe(CRENEAU_PASSE_2), acteur: "systeme", details: {}, created_at: ilYA(18) },
      { dossier_id: D(7), type: "compte_rendu", libelle: "Compte rendu ajouté", acteur: "mediateur", details: {}, created_at: ilYA(3, 1) },
      { dossier_id: D(7), type: "issue", libelle: "Issue : carence", acteur: "mediateur",
        details: { avant: "en_cours", apres: "carence" }, created_at: ilYA(3) },
    ]),
    "Événements des dossiers clos"
  )

  // 9. Vérification : statuts calculés par la base
  const resultat = verifier(
    await supabase.from("dossiers").select("numero_rg, mode, statut, issue, evenements(id)").order("numero_rg"),
    "Relecture des dossiers"
  )

  // 10. Comptes de démo (mot de passe et rôle), après les données : un compte
  // introuvable n'empêche pas la remise à zéro des dossiers
  await restaurerComptesDemo(supabase, { essai, journal })

  return resultat.map((d) => ({ ...d, evenements: d.evenements.length }))
}
