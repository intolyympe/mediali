import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

// Accessibilité des pages principales, en mode démo (npm run test:a11y).
// Règles axe-core WCAG 2.0, 2.1 et 2.2, niveaux A et AA. Les tests ne font
// que lire : aucune réponse n'est envoyée, aucun dossier n'est modifié.

const REGLES = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]

// Partie du dossier 26/00300 (seed de démo), pour le parcours sans téléphone
const JETON = "demo-300-defendeur"
const NOM_PARTIE = "Hoarau"

/** Analyse la page avec axe-core et affiche les violations trouvées. */
async function verifierAxe(page: Page, nom: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(REGLES).analyze()
  const resume = violations.map(
    (v) => `${v.id} (${v.impact}) : ${v.help}\n    ${v.nodes.map((n) => n.target.join(" ")).join("\n    ")}`
  )
  expect(resume, `Violations axe sur ${nom}`).toEqual([])
}

/** Pas de défilement horizontal à 320 px de large (équivaut à un zoom de 400 % sur 1280 px). */
async function verifierLargeur320(page: Page, nom: string) {
  await page.setViewportSize({ width: 320, height: 700 })
  const debordement = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(debordement, `Défilement horizontal à 320 px sur ${nom}`).toBeLessThanOrEqual(0)
  await page.setViewportSize({ width: 1280, height: 800 })
}

// L'aide de l'accueil s'ouvre seule à la première visite : on la marque comme
// vue, sauf dans le test qui la vérifie.
test.beforeEach(async ({ context }, info) => {
  if (info.title.includes("aide")) return
  await context.addInitScript(() => localStorage.setItem("mediali-aide-vue", "1"))
})

test("pages publiques", async ({ page }) => {
  for (const chemin of ["/", "/connexion", "/accessibilite", `/p/${JETON}`, `/p/${JETON}/avocat`]) {
    await page.goto(chemin)
    await expect(page.locator("h1")).toHaveCount(1)
    await expect(page).toHaveTitle(/Médiali/)
    await expect(page.locator("html")).toHaveAttribute("lang", "fr")
    await verifierAxe(page, chemin)
    await verifierLargeur320(page, chemin)
  }
})

test("lien d'évitement en premier", async ({ page }) => {
  await page.goto("/")
  await page.keyboard.press("Tab")
  const lien = page.getByRole("link", { name: "Aller au contenu" })
  await expect(lien).toBeFocused()
  await expect(lien).toBeVisible()
})

test("fenêtre d'aide : ouverture, clavier, fermeture", async ({ page }) => {
  await page.goto("/")
  // Première visite : l'aide de l'accueil s'ouvre seule
  const aide = page.getByRole("dialog")
  await expect(aide).toBeVisible()
  await verifierAxe(page, "aide de l'accueil")
  await page.keyboard.press("Escape")
  await expect(aide).toBeHidden()
  // Réouverture au clavier, fermeture par le bouton
  const bouton = page.getByRole("button", { name: "Aide" })
  await expect(bouton).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(aide).toBeVisible()
  await aide.getByRole("button", { name: "Fermer" }).click()
  await expect(aide).toBeHidden()
})

test("parcours partie : erreurs et changement d'étape", async ({ page }) => {
  await page.goto(`/p/${JETON}`)
  const titre = page.locator("h1")
  await expect(titre).toHaveText(/Étape 1 sur 6/)

  // Erreur : focus sur le champ, message relié et annoncé
  await page.getByRole("button", { name: "Continuer" }).click()
  const nom = page.getByLabel(/Votre nom de famille/)
  await expect(nom).toBeFocused()
  await expect(nom).toHaveAttribute("aria-invalid", "true")
  await expect(nom).toHaveAttribute("aria-describedby", "nom-erreur")
  // (Next.js ajoute aussi son propre role="alert" : on cible le message par son id)
  const message = page.locator("#nom-erreur")
  await expect(message).toHaveAttribute("role", "alert")
  await expect(message).toHaveText("Écrivez votre nom de famille.")
  await verifierAxe(page, "parcours partie (erreur)")

  // Étape suivante : le titre annonce l'étape et reçoit le focus
  await nom.fill(NOM_PARTIE)
  await page.getByRole("button", { name: "Continuer" }).click()
  await expect(titre).toHaveText("Étape 2 sur 6 : Votre choix")
  await expect(titre).toBeFocused()
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2")
  await verifierAxe(page, "parcours partie (étape 2)")

  // Étapes 2 à 4 : tout reste dans le navigateur, rien n'est envoyé
  await page.getByRole("button", { name: "Continuer" }).click()
  await expect(page.getByRole("radio").first()).toBeFocused()
  await page.getByRole("radio", { name: /J'accepte directement/ }).check()
  await page.getByRole("button", { name: "Continuer" }).click()
  await expect(titre).toHaveText("Étape 3 sur 6 : Vos coordonnées")

  await page.getByRole("button", { name: "Continuer" }).click()
  const telephone = page.getByLabel("Votre téléphone")
  await expect(telephone).toBeFocused()
  await expect(telephone).toHaveAttribute("aria-describedby", "erreur-coordonnees")
  await verifierAxe(page, "parcours partie (étape 3, erreur)")
  await telephone.fill("0692 12 34 56")
  await page.getByRole("button", { name: "Continuer" }).click()
  await expect(titre).toHaveText("Étape 4 sur 6 : Votre accord")

  await page.getByRole("button", { name: "Continuer" }).click()
  const accord = page.getByRole("checkbox", { name: /J'accepte que mes coordonnées/ })
  await expect(accord).toBeFocused()
  await expect(accord).toHaveAttribute("aria-invalid", "true")
  await verifierAxe(page, "parcours partie (étape 4, erreur)")
})

test("espace juridiction", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Entrer comme juridiction" }).click()
  await page.waitForURL("**/juridiction")
  await expect(page).toHaveTitle("Tableau de suivi – Espace juridiction – Médiali")
  await expect(page.locator("table caption")).toHaveCount(1)
  await verifierAxe(page, "/juridiction")
  await verifierLargeur320(page, "/juridiction")

  await page.getByRole("link", { name: "26/00300" }).click()
  await page.waitForURL("**/juridiction/dossiers/**")
  await expect(page).toHaveTitle("Dossier 26/00300 – Espace juridiction – Médiali")
  await expect(page.getByRole("img", { name: /QR code vers le parcours de/ }).first()).toBeVisible()
  await verifierAxe(page, "dossier (juridiction)")
  await verifierLargeur320(page, "dossier (juridiction)")

  await page.goto("/juridiction/nouveau")
  await verifierAxe(page, "/juridiction/nouveau")
  await verifierLargeur320(page, "/juridiction/nouveau")

  // Placeholder : exemple préfixé et plus clair que le texte saisi
  const rg = page.getByLabel(/Numéro RG/)
  await expect(rg).toHaveAttribute("placeholder", /^Ex\. : /)
  const couleur = await rg.evaluate((champ) => getComputedStyle(champ, "::placeholder").color)
  expect(couleur).toBe("rgb(102, 102, 102)")

  // Envoi vide : erreurs reliées aux champs, focus sur le premier (rien n'est envoyé)
  await page.getByRole("button", { name: "Créer le dossier" }).click()
  await expect(rg).toBeFocused()
  await expect(rg).toHaveAttribute("aria-invalid", "true")
  await expect(rg).toHaveAttribute("aria-describedby", "numero_rg-erreur")
  await expect(page.locator("#numero_rg-erreur")).toHaveText("Indiquez le numéro RG.")
  await expect(page.locator("#p1-nom-erreur")).toHaveText("Indiquez le nom.")
  await verifierAxe(page, "/juridiction/nouveau (erreurs)")
})

test("espace médiateur", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Entrer comme médiateur" }).click()
  await page.waitForURL("**/mediateur")
  await expect(page).toHaveTitle("Mes dossiers – Espace médiateur – Médiali")
  await verifierAxe(page, "/mediateur")
  await verifierLargeur320(page, "/mediateur")

  await page.getByRole("link", { name: "Dossier n° 26/00300" }).click()
  await page.waitForURL("**/mediateur/dossiers/**")
  await expect(page).toHaveTitle("Dossier 26/00300 – Espace médiateur – Médiali")
  await expect(page.getByRole("list", { name: /Historique du dossier/ })).toBeVisible()
  await verifierAxe(page, "dossier (médiateur)")

  // Formulaire de rendez-vous ouvert
  await page.getByRole("button", { name: /premier rendez-vous/ }).click()
  await expect(page.locator("#panneau-action")).toBeVisible()
  // Attendre la fin de la transition de couleur du bouton (sinon axe mesure
  // une couleur intermédiaire)
  await page.mouse.move(0, 0)
  await page.waitForTimeout(500)
  await verifierAxe(page, "dossier (médiateur), formulaire de rendez-vous")

  // Clôture sans issue : bouton actif, erreur affichée et focus (rien n'est envoyé)
  await page.getByRole("button", { name: "Clôturer le dossier" }).click()
  const panneau = page.locator("#panneau-action")
  const envoi = panneau.getByRole("button", { name: "Clôturer le dossier" })
  await expect(envoi).toBeEnabled()
  await envoi.click()
  await expect(panneau.getByRole("radio").first()).toBeFocused()
  await expect(page.locator("#issue-erreur")).toHaveText("Choisissez l'issue du dossier.")
  await page.mouse.move(0, 0)
  await page.waitForTimeout(500)
  await verifierAxe(page, "dossier (médiateur), clôture (erreur)")
  await verifierLargeur320(page, "dossier (médiateur)")
})
