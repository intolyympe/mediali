@AGENTS.md

# Médiation judiciaire — QR code des parties

Projet du hackathon Justice Tech de la Cour d'appel de Saint-Denis (La Réunion).

## Problème

Quand un juge désigne un médiateur par ordonnance, le médiateur n'a souvent pas
les coordonnées des parties. Le premier rendez-vous de médiation prend du retard.

## Solution

1. Le **greffe** crée un dossier (n° RG, juridiction, date d'ordonnance,
   médiateur) et ses deux parties (demandeur, défendeur).
2. L'application génère un **QR code unique par partie** (lien `/p/<token>`),
   imprimé sur la notification envoyée à la partie.
3. La **partie** scanne le QR code sur son téléphone, renseigne ses coordonnées,
   donne son **consentement RGPD** et coche ses **disponibilités** parmi les
   créneaux du médiateur.
4. Le **médiateur** suit l'avancement en temps réel sur un tableau de bord.

Statut d'un dossier (recalculé automatiquement en base) :
`en_attente` → `partiellement_joignable` → `joignable` → `rdv_fixe`.

## Stack

- Next.js 16 (App Router, TypeScript, `cacheComponents` activé), dossier `src/`
- Tailwind CSS v4 et shadcn/ui (style `base-nova`, basé sur **Base UI**, pas
  Radix : on utilise la prop `render` au lieu de `asChild`)
- Supabase : Postgres, Auth (e-mail / mot de passe), Realtime
- Resend pour les e-mails (clé `RESEND_API_KEY`)

## Organisation

- `supabase/migrations/` : schéma SQL, RLS, Realtime, fonction
  `recalculer_statut_dossier` et ses déclencheurs
- `supabase/seed.sql` : données fictives et comptes de démo
- `src/lib/supabase/client.ts` : client navigateur (Realtime, RLS)
- `src/lib/supabase/server.ts` : client serveur lié à la session (RLS)
- `src/lib/supabase/admin.ts` : client `service_role` (`server-only`)
- `src/lib/supabase/proxy.ts` + `src/proxy.ts` : rafraîchissement de session et
  protection des routes (Next 16 : `proxy.ts` remplace `middleware.ts`)
- `src/lib/supabase/database.types.ts` : types de la base (`npm run db:types`)
- `src/app/connexion/` : connexion greffe / médiateur
- `src/app/tableau-de-bord/` : espace connecté
- `src/app/p/[token]/` : pages publiques des parties (à créer)

## Sécurité

- RLS activée sur toutes les tables : lecture et écriture réservées aux
  utilisateurs authentifiés (greffe, médiateur).
- Les pages publiques (`/p/...`) n'utilisent **jamais** le client navigateur.
  Elles passent par des **server actions** avec `createAdminClient()` et filtrent
  toujours par `token`.
- `SUPABASE_SERVICE_ROLE_KEY` ne doit jamais être préfixée par `NEXT_PUBLIC_` ni
  importée dans un fichier `"use client"`.
- Ne jamais renvoyer au navigateur d'une partie les données de l'autre partie.

## Conventions

- **Interface 100 % en français** : textes, messages d'erreur, libellés, URL
  (`/connexion`, `/tableau-de-bord`). Les noms de tables et colonnes sont aussi
  en français. Libellés des statuts et rôles : `src/lib/statuts.ts`.
- **Mobile-first** pour les pages publiques : les parties scannent depuis leur
  téléphone. Grandes zones tactiles, une colonne, peu de texte.
- Utiliser les **composants shadcn** (`npx shadcn@latest add <composant>`)
  plutôt que du HTML stylé à la main.
- **Code simple et lisible** : Server Components par défaut, `"use client"`
  seulement si nécessaire, server actions plutôt que routes API, pas
  d'abstraction prématurée.
- Avec `cacheComponents`, tout accès à `cookies()` ou à la base dans une page
  doit être dans un composant enveloppé par `<Suspense>`.
- Dates affichées en `fr-FR`, fuseau `Indian/Reunion`.
- Toute modification du schéma passe par une nouvelle migration dans
  `supabase/migrations/`, puis `npm run db:types`.

## Commandes

- `npm run dev` : serveur de développement
- `npm run db:start` / `npm run db:stop` : Supabase local (Docker)
- `npm run db:reset` : rejoue migrations et seed
- `npm run db:types` : régénère les types TypeScript
- `npm run lint` et `npm run typecheck` avant chaque commit
