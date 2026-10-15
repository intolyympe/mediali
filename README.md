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
| `NEXT_PUBLIC_DEMO_MODE`, `DEMO_*`, `CRON_SECRET` | démo publique uniquement, voir [Démo publique](#démo-publique) |

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

Le script utilise la clé service_role de `.env.local`. Il vide les
événements, disponibilités, parties, dossiers et créneaux, recrée exactement
les 7 dossiers de démo ci-dessus (avec leur timeline) et ajoute le dossier
**26/00300** en attente, à scanner en direct (Marie Payet / Jean Hoarau), puis
affiche ses deux liens `/p/...`. Si les variables `DEMO_*` sont renseignées,
il restaure aussi les deux comptes de démo (voir
[Remise à zéro chaque nuit](#remise-à-zéro-chaque-nuit)). Il ne touche à aucun
autre compte ni à la table des médiateurs. Lancez-le juste avant la démo, avec l'adresse de production :
`NEXT_PUBLIC_SITE_URL=https://<projet>.vercel.app npm run reset-demo`.

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

## Démo publique

Avec `NEXT_PUBLIC_DEMO_MODE=true`, n'importe qui peut visiter les espaces
juridiction et médiateur sans mot de passe :

- l'accueil et `/connexion` affichent **Entrer comme juridiction** et **Entrer
  comme médiateur**. Chaque bouton appelle une server action qui se connecte
  avec le compte de démonstration correspondant puis redirige vers
  `/juridiction` ou `/mediateur`. Le navigateur n'envoie que le nom de
  l'espace : les identifiants restent sur le serveur ;
- chaque espace a un bouton **Changer d'espace** ;
- un bandeau sur toutes les pages rappelle que les données sont fictives et
  remises à zéro chaque nuit ;
- sur la page d'un dossier de la juridiction, **Ouvrir le parcours de cette
  partie** (à côté de chaque QR code) ouvre `/p/<token>` dans un nouvel
  onglet, pour tester sans téléphone ;
- **Se déconnecter** ne ferme que la session du visiteur (les comptes sont
  partagés).

Sans la variable (ou avec `false`), rien de tout cela n'apparaît et
`/api/reset-demo` répond 404.

### Variables

| Variable                    | Où          | Rôle |
| --------------------------- | ----------- | ---- |
| `NEXT_PUBLIC_DEMO_MODE`     | navigateur et serveur | `true` pour activer la démo. Fixée au build : redéployer après modification |
| `DEMO_JURIDICTION_EMAIL`    | serveur     | compte de démo de la juridiction (rôle `greffe`) |
| `DEMO_JURIDICTION_PASSWORD` | serveur     | son mot de passe |
| `DEMO_MEDIATEUR_EMAIL`      | serveur     | compte de démo du médiateur (rôle `mediateur`, relié à Marie-Claude Fontaine du seed) |
| `DEMO_MEDIATEUR_PASSWORD`   | serveur     | son mot de passe |
| `CRON_SECRET`               | serveur     | secret de la remise à zéro nocturne (`openssl rand -hex 32`) |

Plus les variables habituelles : `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`NEXT_PUBLIC_SITE_URL`. Les variables « serveur » ne doivent jamais avoir le
préfixe `NEXT_PUBLIC_`.

### Remise à zéro chaque nuit

`vercel.json` programme un appel quotidien à `/api/reset-demo` à 23h00 UTC,
soit **3h00 à La Réunion** (Vercel Cron compte en UTC). Vercel ajoute
l'en-tête `Authorization: Bearer <CRON_SECRET>` : la route refuse tout appel
sans ce secret (401). Elle exécute la même logique que `npm run reset-demo`
(`src/lib/demo/reinitialiser.mjs`) puis restaure les deux comptes de démo :
retrouvés par leur e-mail (`DEMO_JURIDICTION_EMAIL`, `DEMO_MEDIATEUR_EMAIL`),
ils reprennent le mot de passe des variables `DEMO_*_PASSWORD` et leur rôle
(`app_metadata` : `greffe` pour la juridiction ; `mediateur` et le
`mediateur_id` de la ligne de `mediateurs` qui a le même e-mail pour le
médiateur). Aucun autre compte n'est modifié, et la table `mediateurs` est
seulement lue. Les journaux de la fonction, dans Vercel, indiquent les comptes
restaurés (jamais les mots de passe). Sur l'offre Hobby de Vercel, l'appel peut avoir lieu à n'importe
quel moment entre 3h00 et 3h59.

Lancer la remise à zéro à la main :

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<projet>.vercel.app/api/reset-demo
```

### Mise en place

1. Créer les deux comptes de démo et leur rôle (voir
   [Déployer sur un projet Supabase hébergé](#déployer-sur-un-projet-supabase-hébergé)).
   Utiliser des comptes dédiés à la démo, jamais des comptes réels.
2. Dans Supabase, Authentication → Sign In / Providers : désactiver les
   inscriptions (« Allow new users to sign up ») et activer « Secure email
   change ».
3. Dans Vercel (Settings → Environment Variables), renseigner les variables
   ci-dessus, puis redéployer.
4. Vérifier dans Vercel, onglet Cron Jobs, que `/api/reset-demo` apparaît.

### Risques connus

Les comptes de démo sont partagés et leur session est dans le navigateur. Un
visiteur malveillant peut, avec l'API Supabase :

- **modifier ou supprimer les données** : elles sont remises en place à la
  prochaine remise à zéro ;
- **changer le mot de passe d'un compte de démo** : les boutons de démo ne
  marchent plus jusqu'à la prochaine remise à zéro, qui remet le mot de passe
  des variables `DEMO_*_PASSWORD`. Pour réparer tout de suite, lancer la
  remise à zéro à la main (`curl` ci-dessus) ;
- **changer l'e-mail d'un compte de démo**, si « Secure email change » n'est
  pas activé dans Supabase : la remise à zéro ne retrouve plus le compte, le
  signale en erreur (après avoir remis les données) et un humain doit
  corriger l'e-mail dans Supabase. D'où l'étape 2 de la mise en place.

Le rôle (`app_metadata`) n'est pas modifiable par un visiteur : il est
réappliqué par précaution.
