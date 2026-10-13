# Médiation — QR code des parties

Hackathon Justice Tech — Cour d'appel de Saint-Denis.

Quand un juge désigne un médiateur, la juridiction crée un dossier et imprime un QR
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
| `NEXT_PUBLIC_SITE_URL`          | `http://localhost:3000` (adresse des QR codes)    |

Avec un projet Supabase hébergé (sans Docker), sauter l'étape 2 et prendre
l'URL et les clés dans Project Settings → API.

```bash
# 4. Lancer l'application
npm run dev
```

Ouvrir http://localhost:3000.

## Données de démonstration

`npm run db:start` applique automatiquement les migrations, puis
`supabase/seed.sql` (données) et `supabase/comptes-demo.sql` (comptes, en local
uniquement). Pour repartir de zéro : `npm run db:reset`.

Comptes de connexion (mot de passe : `motdepasse`) :

- `greffe@exemple.fr` → espace juridiction, `/juridiction`
- `mediateur@exemple.fr` → espace médiateur, `/mediateur`

Le seed (modèle V2) crée un médiateur, un co-médiateur et un conciliateur,
10 créneaux sur les 7 prochains jours ouvrés, 7 dossiers fictifs et leur
timeline. Il ne touche jamais aux comptes utilisateurs.

| N° RG    | Cas                                   | Statut / issue                  | Jetons des parties |
| -------- | ------------------------------------- | ------------------------------- | ------------------ |
| 26/00123 | Médiation, personne n'a répondu       | En attente                      | `demo-1-demandeur`, `demo-1-defendeur` |
| 26/00145 | Médiation, une réponse                | Partiellement joignable         | `demo-2-demandeur`, `demo-2-defendeur` |
| 26/00167 | Médiation, réponse via avocate        | RDV fixé                        | `demo-3-demandeur`, `demo-3-defendeur` |
| 26/00180 | Conciliation                          | Partiellement joignable         | `demo-4-demandeur`, `demo-4-defendeur` |
| 26/00192 | 3 parties, co-médiation, un refus     | Partiellement joignable         | `demo-5-demandeur-1`, `demo-5-demandeur-2`, `demo-5-defendeur` |
| 26/00098 | Dossier clos                          | Accord total                    | `demo-6-…` |
| 26/00105 | Dossier clos                          | Carence                         | `demo-7-…` |

Sur un projet Supabase hébergé : coller dans l'éditeur SQL le contenu de
`supabase/vider-donnees.sql` suivi de celui de `supabase/seed.sql`, et exécuter
le tout en une fois.

### Remettre la démo à zéro (base hébergée comprise)

```bash
npm run reset-demo -- --essai   # simulation : affiche ce qui serait fait
npm run reset-demo              # vide et recrée les données de démo
```

Le script utilise la clé service_role de `.env.local`. Il supprime tous les
dossiers, parties, disponibilités et créneaux, recrée 10 créneaux sur les
prochains jours ouvrés, les 3 dossiers ci-dessus et le dossier **26/00300**
(en attente, à scanner en direct), puis affiche ses liens `/p/...`. Il ne
touche ni aux comptes utilisateurs ni aux médiateurs.

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

Ne pas exécuter `comptes-demo.sql` en production. Créer les comptes de la juridiction et des
médiateurs depuis le Studio (Authentication → Users), puis leur attribuer un
rôle dans l'éditeur SQL :

```sql
-- Compte juridiction (le rôle technique reste "greffe")
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role": "greffe"}'
where email = 'greffe@exemple.fr';

-- Compte médiateur, relié à sa ligne dans la table mediateurs
update auth.users
set raw_app_meta_data = raw_app_meta_data || jsonb_build_object(
  'role', 'mediateur',
  'mediateur_id', (select id from public.mediateurs where email = 'mediateur@exemple.fr')
)
where email = 'mediateur@exemple.fr';
```

Le rôle est lu dans le jeton de connexion : l'utilisateur doit se reconnecter
pour qu'un changement soit pris en compte.
