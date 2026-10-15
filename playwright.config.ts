import { defineConfig, devices } from "@playwright/test"

// Tests d'accessibilité (npm run test:a11y), en mode démo.
//
// Par défaut : construit l'application et la lance sur le port 3100 avec
// .env.local (même base Supabase que `npm run dev`). Les tests ne font que
// lire : ils visitent les pages et entrent avec les boutons de démo, sans
// rien enregistrer.
// Pour tester un site déjà en ligne :
//   PLAYWRIGHT_BASE_URL=https://<projet>.vercel.app npm run test:a11y
const adresseExterne = process.env.PLAYWRIGHT_BASE_URL
const PORT = 3100

export default defineConfig({
  testDir: "tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 60_000,
  use: {
    baseURL: adresseExterne ?? `http://localhost:${PORT}`,
    locale: "fr-FR",
    ...devices["Desktop Chrome"],
  },
  webServer: adresseExterne
    ? undefined
    : {
        command: `npm run build && npx next start -p ${PORT}`,
        url: `http://localhost:${PORT}`,
        env: { NEXT_PUBLIC_DEMO_MODE: "true" },
        reuseExistingServer: false,
        timeout: 300_000,
      },
})
