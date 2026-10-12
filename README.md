# Médiation — QR code des parties

Hackathon Justice Tech — Cour d'appel de Saint-Denis.

Quand un juge désigne un médiateur, le greffe crée un dossier et imprime un QR
code unique pour chaque partie sur la notification. La partie scanne le code,
renseigne ses coordonnées, donne son consentement RGPD et indique ses
disponibilités. Le médiateur suit tout en temps réel sur son tableau de bord.

Stack : Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Supabase.

## Prérequis

- Node.js 20 ou plus récent
- Docker (pour Supabase en local)

La CLI Supabase est installée avec les dépendances du projet (`npx supabase`).

## Lancer le projet en local

```bash
# 1. Installer les dépendances
npm install

# 2. Démarrer Supabase (le premier lancement télécharge les images Docker)
npm run db:start

# 3. Créer le fichier d'environnement
cp .env.local.example .env.local
```

Renseigner `.env.local` avec les valeurs affichées par `npx supabase status` :

| Variable                        | Valeur dans `supabase status`                     |
| ------------------------------- | ------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | `API URL` (en général `http://127.0.0.1:54321`)   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon key` (ou `Publishable key`)                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | `service_role key` (ou `Secret key`)              |
| `RESEND_API_KEY`                | à créer sur resend.com (facultatif pour démarrer) |

```bash
# 4. Lancer l'application
npm run dev
```

Ouvrir http://localhost:3000.

## Données de démonstration

`npm run db:start` applique automatiquement la migration et le fichier
`supabase/seed.sql`. Pour repartir de zéro : `npm run db:reset`.

Comptes de connexion (mot de passe : `motdepasse`) :

- `greffe@exemple.fr`
- `mediateur@exemple.fr`

Le seed crée un médiateur, 10 créneaux sur les 7 prochains jours ouvrés et
3 dossiers fictifs :

| N° RG    | Statut                  | Jetons des parties                       |
| -------- | ----------------------- | ---------------------------------------- |
| 26/00123 | En attente              | `demo-1-demandeur`, `demo-1-defendeur`   |
| 26/00145 | Partiellement joignable | `demo-2-demandeur`, `demo-2-defendeur`   |
| 26/00167 | RDV fixé                | `demo-3-demandeur`, `demo-3-defendeur`   |

Supabase Studio (interface d'administration de la base) : http://127.0.0.1:54323.
Les e-mails envoyés en local sont visibles sur http://127.0.0.1:54324.

## Statut d'un dossier

Le statut est recalculé automatiquement en base (fonction
`recalculer_statut_dossier`, déclenchée à chaque modification d'une partie ou de
ses disponibilités) :

- **En attente** : aucune partie n'a confirmé ses coordonnées
- **Partiellement joignable** : une partie sur deux a confirmé
- **Joignable** : les deux parties ont confirmé
- **RDV fixé** : les deux parties ont choisi un même créneau libre du médiateur ;
  le premier créneau commun est réservé automatiquement

## Commandes utiles

| Commande            | Rôle                                               |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Serveur de développement                           |
| `npm run build`     | Build de production                                |
| `npm run lint`      | ESLint                                             |
| `npm run typecheck` | Vérification TypeScript                            |
| `npm run db:start`  | Démarre Supabase en local                          |
| `npm run db:stop`   | Arrête Supabase                                    |
| `npm run db:reset`  | Rejoue la migration et le seed                     |
| `npm run db:types`  | Régénère `src/lib/supabase/database.types.ts`      |

## Déployer sur un projet Supabase hébergé

```bash
npx supabase login
npx supabase link --project-ref <ref-du-projet>
npx supabase db push
```

Ne pas exécuter `seed.sql` en production. Créer les comptes du greffe et des
médiateurs depuis le Studio (Authentication → Users).
