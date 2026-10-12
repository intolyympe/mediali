@AGENTS.md

# Médiation judiciaire — QR code des parties

Projet du hackathon Justice Tech de la Cour d'appel de Saint-Denis (La Réunion).
Équipe de 6 personnes travaillant en parallèle avec Claude Code : lire
d'abord **Répartition de l'équipe** et **Règles** ci-dessous.

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
   créneaux du médiateur. Son **avocat** peut répondre à sa place avec le même
   QR code (`/p/<token>/avocat`).
4. Le **médiateur** suit l'avancement en temps réel sur son tableau de bord.

## Stack

- Next.js 16.4 (App Router, TypeScript, `cacheComponents` activé), code sous `src/`
- Tailwind CSS v4 et shadcn/ui (style `base-nova`, basé sur **Base UI**)
- Supabase : Postgres, Auth (e-mail / mot de passe), Realtime
- Resend pour les e-mails (clé `RESEND_API_KEY`)

## Pièges à connaître (Next 16.4 et shadcn base-nova)

- **Next 16 : `proxy.ts` remplace `middleware.ts`** (`src/proxy.ts`). Ne pas
  créer de `middleware.ts`.
- **`cacheComponents` est activé** : toute lecture de session (`cookies()`,
  `supabase.auth.getClaims()`) ou de la base dans une page ou un layout doit se
  faire dans un composant `async` **enveloppé par `<Suspense>`**. Sinon
  `npm run build` échoue avec « uncached or runtime data during prerendering ».
  Modèle : `src/app/mediateur/page.tsx` (page synchrone + composant async dans
  `<Suspense>`).
- **Erreur « encountered the unstable value `Date.now()` while prerendering »**
  (aussi `new Date()`, `Math.random()`, `crypto.randomUUID()`). `<Suspense>` ne
  suffit pas, et `await cookies()` non plus : le préchargement partiel
  (`partialPrefetching`) fournit les cookies pendant le prérendu. Il faut appeler
  **`await connection()`** (import depuis `next/server`) **avant** la valeur
  instable. C'est déjà fait dans `createClient()` de
  `src/lib/supabase/server.ts` (la lecture de session Supabase appelle
  `Date.now()`) et dans les fonctions de lecture de `src/lib/dossiers.ts`.
  Règle : utiliser ces fonctions partagées ; si vous appelez vous-même
  `new Date()`, `Date.now()` ou `createAdminClient()` pendant le rendu d'une page,
  mettre `await connection()` juste avant, dans un composant sous `<Suspense>`.
  Pas de `"use client"` ni de `"use cache"` pour contourner : les données de
  session et des dossiers doivent être lues à chaque requête.
- `cookies()`, `headers()`, `params` et `searchParams` sont **asynchrones** :
  toujours `await`.
- **shadcn base-nova utilise Base UI, pas Radix** : il n'y a pas de prop
  `asChild`. Utiliser la prop **`render`**, avec `nativeButton={false}` quand
  l'élément rendu n'est pas un `<button>` (lien, div) :
  `<Button render={<Link href="/greffe" />} nativeButton={false}>Retour</Button>`.
- `cn` vient du paquet `cn` (réexporté par `src/lib/utils.ts`).
- Avant de coder avec une API Next.js, consulter `node_modules/next/dist/docs/`.

## Schéma de la base

Migrations dans `supabase/migrations/` (voir aussi
`src/lib/supabase/database.types.ts`). Toutes les dates sont en `timestamptz`,
affichées en `fr-FR` avec le fuseau `Indian/Reunion`.

### `mediateurs`
| Colonne     | Type        | Remarque |
| ----------- | ----------- | -------- |
| `id`        | uuid        | clé primaire |
| `nom`       | text        | |
| `email`     | text        | unique |
| `telephone` | text, null  | |

### `dossiers`
| Colonne               | Type                  | Remarque |
| --------------------- | --------------------- | -------- |
| `id`                  | uuid                  | clé primaire |
| `numero_rg`           | text                  | unique, ex. `26/00123` |
| `juridiction`         | text                  | |
| `date_ordonnance`     | date                  | |
| `mediateur_id`        | uuid, null            | → `mediateurs.id` |
| `provision_consignee` | bool                  | défaut `false` |
| `statut`              | enum `statut_dossier` | **calculé par la base, ne jamais l'écrire** |
| `rdv_creneau_id`      | uuid, null            | → `creneaux.id`, unique (un créneau = un seul dossier) |
| `created_at`          | timestamptz           | défaut `now()` |

Statuts (`statut_dossier`) :
- `en_attente` : aucune partie n'a confirmé.
- `partiellement_joignable` : une partie sur deux a confirmé.
- `joignable` : les deux parties ont confirmé, pas encore de créneau commun.
- `rdv_fixe` : un rendez-vous est fixé (`rdv_creneau_id` renseigné).

Une partie est **confirmée** quand `consentement_rgpd = true` **et**
`confirme_le` est renseigné.

### `parties`
| Colonne             | Type               | Remarque |
| ------------------- | ------------------ | -------- |
| `id`                | uuid               | clé primaire |
| `dossier_id`        | uuid               | → `dossiers.id` (suppression en cascade) |
| `role`              | enum `role_partie` | `demandeur` ou `defendeur`, un seul de chaque par dossier |
| `nom`, `prenom`     | text               | |
| `token`             | text               | unique ; généré automatiquement par la base (32 caractères hexadécimaux) si on ne le fournit pas à l'insertion |
| `telephone`, `email`| text, null         | coordonnées de la partie |
| `consentement_rgpd` | bool               | défaut `false` |
| `confirme_le`       | timestamptz, null  | date de la réponse |
| `rempli_par`        | enum `rempli_par`, null | `partie` ou `avocat` : qui a répondu |
| `passer_par_avocat` | bool               | défaut `false` : le médiateur doit contacter l'avocat |
| `avocat_nom`        | text, null         | |
| `avocat_email`, `avocat_telephone`, `avocat_barreau` | text, null | |

### `creneaux`
| Colonne        | Type        | Remarque |
| -------------- | ----------- | -------- |
| `id`           | uuid        | clé primaire |
| `mediateur_id` | uuid        | → `mediateurs.id` |
| `debut`, `fin` | timestamptz | `fin > debut` |

### `disponibilites`
Créneaux choisis par une partie. Clé primaire (`partie_id`, `creneau_id`).

### Comptes et rôles
Les comptes greffe et médiateur sont des utilisateurs Supabase Auth. Le rôle
est stocké dans **`app_metadata`** (lisible dans le JWT, non modifiable par
l'utilisateur) :
- `{ "role": "greffe" }` → espace `/greffe`
- `{ "role": "mediateur", "mediateur_id": "<uuid>" }` → espace `/mediateur`

Le proxy redirige chaque compte vers son espace après connexion et l'empêche
d'entrer dans l'autre. Les politiques RLS, elles, ne distinguent pas les rôles :
tout utilisateur connecté peut lire et écrire toutes les tables.

### Sécurité
- RLS activée partout : lecture et écriture réservées aux utilisateurs connectés.
- Realtime activé sur `dossiers` et `parties`.

## Recalcul du statut : automatique

Le statut d'un dossier et la réservation du premier créneau commun sont gérés
**uniquement par la base** : fonction SQL `recalculer_statut_dossier` et ses
déclencheurs (`supabase/migrations/20261012000000_schema_initial.sql`). Ils se
déclenchent à chaque insertion, modification ou suppression d'une partie ou
d'une disponibilité.

Quand toutes les parties sont confirmées, la base réserve le premier créneau à
venir du médiateur choisi par toutes les parties et pas déjà pris. Un rendez-vous
fixé n'est plus jamais modifié automatiquement.

**Les parcours partie et avocat doivent seulement enregistrer les données puis
relire le dossier. Ils n'appellent AUCUNE fonction de recalcul** et n'écrivent
jamais `statut` ni `rdv_creneau_id`. Utiliser `enregistrerReponse` (ci-dessous),
qui fait exactement cela.

## Fonctions partagées

Ne jamais dupliquer cette logique : importer ces fonctions. Pour les modifier,
passer par la personne 1.

### Clients Supabase (`src/lib/supabase/`)
| Fichier     | Signature | Usage |
| ----------- | --------- | ----- |
| `client.ts` | `createClient()` | Composants `"use client"` (Realtime). Soumis à la RLS. |
| `server.ts` | `async createClient()` | Server Components et server actions des espaces connectés. Soumis à la RLS. |
| `admin.ts`  | `createAdminClient()` | Clé `service_role`, **contourne la RLS**. Uniquement pour les pages publiques `/p/...`, côté serveur (`server-only`). |
| `proxy.ts`  | `updateSession(request)` | Utilisé par `src/proxy.ts`. |
| `database.types.ts` | `Database`, `Tables<"…">`, `TablesUpdate<"…">`, `Enums<"…">` | Types de la base. |

### Parcours publics (`src/lib/dossiers.ts`, `server-only`)
```ts
trouverPartieParToken(token: string)
  // → partie + dossier { id, numero_rg, juridiction, mediateur_id, statut }, ou null
memeNom(saisi: string, attendu: string): boolean
  // comparaison sans majuscules, accents, espaces, tirets ni apostrophes
creneauxLibres(mediateurId: string)
  // → [{ id, debut, fin }] : créneaux à venir non réservés, triés
enregistrerReponse(partieId: string, reponse: ReponsePartie, creneauIds: string[])
  // → DossierRelu. Enregistre disponibilités puis coordonnées + consentement +
  //   confirme_le, puis relit le dossier. Lève une erreur si déjà confirmé.
  //   ReponsePartie : { rempli_par: "partie" | "avocat", consentement_rgpd: true,
  //   telephone?, email?, passer_par_avocat?, avocat_nom?, avocat_email?,
  //   avocat_telephone?, avocat_barreau? }
relireDossier(dossierId: string)
  // → DossierRelu { id, numero_rg, statut, rdv: { debut, fin } | null }
```

### Autres
- `src/lib/roles.ts` : `Role`, `ACCUEIL_PAR_ROLE`, `lireRole(claims)`,
  `lireMediateurId(claims)`.
- `src/lib/statuts.ts` : `LIBELLES_STATUT`, `LIBELLES_ROLE` (libellés français).
- `src/components/bouton-deconnexion.tsx` : `<BoutonDeconnexion />`.
- `src/app/connexion/actions.ts` : `seConnecter`, `seDeconnecter`.

## Répartition de l'équipe

| Personne | Rôle | Dossiers autorisés | Branche |
| -------- | ---- | ------------------ | ------- |
| 1 | Socle, migrations, bibliothèques partagées, déploiement. **Seule à modifier `supabase/`.** | `supabase/`, `src/lib/` (sauf `src/lib/emails/`), `src/proxy.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/connexion/`, `src/components/bouton-deconnexion.tsx`, fichiers de configuration, `CLAUDE.md`, `PROMPTS.md`, `README.md` | `main` |
| 2 | Espace greffe | `src/app/greffe/` | `greffe` |
| 3 | Parcours partie | `src/app/p/[token]/` **sauf** `src/app/p/[token]/avocat/` | `partie` |
| 4 | Tableau de bord médiateur | `src/app/mediateur/` | `mediateur` |
| 5 | E-mails | `src/lib/emails/`, server actions d'envoi, `src/components/relance-button.tsx` | `emails` |
| 6 | Parcours avocat | `src/app/p/[token]/avocat/` | `avocat` |

Routes : `/greffe` (P2), `/p/[token]` (P3), `/mediateur` (P4),
`/p/[token]/avocat` (P6). `/connexion` redirige vers `/greffe` ou `/mediateur`
selon le rôle.

Points de contact :
- P4 crée `src/components/relance-button.tsx` (composant vide), P5 le remplit.
- P5 branche l'e-mail de confirmation de rendez-vous dans
  `enregistrerReponse` (`src/lib/dossiers.ts`, emplacement marqué en
  commentaire) : prévenir la personne 1.

## Règles

1. **Rester dans ses dossiers** (tableau ci-dessus). Besoin de toucher un autre
   dossier : demander à la personne concernée.
2. **Ne pas modifier la base sans passer par la personne 1** : pas de nouvelle
   migration, pas de modification de `supabase/`. Demander la colonne ou la
   fonction manquante à la personne 1, qui met aussi à jour
   `database.types.ts` et ce fichier.
3. **Composants partagés dans `src/components/ui/` uniquement via shadcn**
   (`npx shadcn@latest add <composant>`), jamais écrits ou modifiés à la main.
   Les composants propres à une fonctionnalité restent dans son dossier.
4. **Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` côté client** : jamais de
   préfixe `NEXT_PUBLIC_`, jamais d'import de `admin.ts` ou `dossiers.ts` dans
   un fichier `"use client"`. Les pages publiques passent par des server
   actions et filtrent toujours par `token`. Ne jamais renvoyer au navigateur
   d'une partie les données de l'autre partie.
5. **Tout le texte visible en français** : libellés, boutons, messages
   d'erreur, e-mails, URL. Noms de tables, colonnes et fonctions aussi en
   français.
6. Ne jamais écrire `statut` ni `rdv_creneau_id` depuis les parcours partie et
   avocat : la base s'en charge.
7. Avant chaque push : `npm run lint`, `npm run typecheck` et `npm run build`.

## Conventions

- **Mobile-first** pour les pages publiques (`/p/...`) : les parties scannent
  depuis leur téléphone. Grandes zones tactiles, une colonne, peu de texte.
  Tester à 375 px de large.
- Utiliser les **composants shadcn** plutôt que du HTML stylé à la main.
- **Code simple et lisible** : Server Components par défaut, `"use client"`
  seulement si nécessaire, server actions plutôt que routes API, pas
  d'abstraction prématurée.

## Commandes

- `npm run dev` : serveur de développement
- `npm run db:start` / `npm run db:stop` : Supabase local (Docker)
- `npm run db:reset` : rejoue migrations et seed
- `npm run db:types` : régénère les types TypeScript (personne 1)
- `npm run lint`, `npm run typecheck`, `npm run build`

Comptes de démo (mot de passe `motdepasse`) : `greffe@exemple.fr`,
`mediateur@exemple.fr`. Jetons de démo : `demo-1-demandeur`,
`demo-2-defendeur`, etc. (voir `README.md`).
