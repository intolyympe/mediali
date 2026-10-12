# Justice Tech 2026 — Prompts Claude Code

Équipe de 6 · Problématique 1 : fluidifier le lien médiateur ↔ parties.

## Comment garantir que tout le monde a le contexte

1. **CLAUDE.md est la mémoire du projet.** Claude Code le lit automatiquement au début de chaque session. Il contient le contexte, la stack, le schéma de la base et qui travaille sur quoi.
2. **Tout passe par Git.** La personne 1 pousse le socle, CLAUDE.md et ce fichier PROMPTS.md sur `main`. Personne ne commence avant d'avoir fait `git pull`.
3. **Même configuration pour tous.** Chacun copie le même `.env.local` (envoyé en privé, jamais commité).
4. **Vérification avant de coder.** Chacun lance d'abord le « prompt de vérification » ci-dessous. Si le résumé de Claude est faux ou incomplet, on corrige CLAUDE.md avant d'aller plus loin.
5. **Une seule personne touche la base.** Seule la personne 1 crée ou modifie des migrations SQL. Si quelqu'un a besoin d'un changement, il le demande à la personne 1.
6. **Chacun reste dans ses fichiers.** Chaque prompt précise les dossiers autorisés.

## Ordre de lancement

| Quand | Qui | Quoi |
|---|---|---|
| Maintenant | Personne 1 | Prompt 1 (déjà lancé), puis prompt 1 bis |
| Après le push de la personne 1 | Tout le monde | `git pull`, `.env.local`, prompt de vérification |
| Ensuite, en parallèle | Personnes 2 à 6 | Leur prompt, chacun sur sa branche |
| Fin d'après-midi | Personne 1 | Prompt 7 (finitions et démo) |

Branches : `greffe` (P2), `partie` (P3), `mediateur` (P4), `emails` (P5), `avocat` (P6).

---

## Prompt 1 — Socle (Personne 1, déjà lancé)

```
Crée une application Next.js (dernière version stable, App Router, TypeScript) avec Tailwind et shadcn/ui, connectée à Supabase.

Contexte : hackathon Justice Tech (Cour d'appel de Saint-Denis). Problème : quand un juge désigne un médiateur par ordonnance, le médiateur n'a souvent pas les coordonnées des parties, ce qui retarde le premier rendez-vous. Notre solution : le greffe crée un dossier et génère un QR code unique par partie, imprimé sur la notification. La partie scanne, renseigne ses coordonnées, donne son consentement RGPD et indique ses disponibilités. Le médiateur suit tout en temps réel sur un tableau de bord.

Tâches :
1. Crée un fichier CLAUDE.md qui résume ce contexte, la stack et les conventions : interface 100 % en français, mobile-first pour les pages publiques, composants shadcn, code simple et lisible.
2. Crée un .env.local.example avec NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.
3. Écris une migration SQL dans supabase/migrations avec ces tables :
   - mediateurs : id, nom, email, telephone
   - dossiers : id, numero_rg (texte unique), juridiction, date_ordonnance, mediateur_id, provision_consignee (bool, défaut false), statut (enum : en_attente, partiellement_joignable, joignable, rdv_fixe), rdv_creneau_id, created_at
   - parties : id, dossier_id, role (enum : demandeur, defendeur), nom, prenom, avocat_nom (nullable), token (texte unique aléatoire, pour le QR code), telephone, email, consentement_rgpd (bool), confirme_le (timestamp nullable)
   - creneaux : id, mediateur_id, debut, fin
   - disponibilites : partie_id, creneau_id (clé primaire composée)
   Active Supabase Realtime sur dossiers et parties. Active la RLS : lecture et écriture réservées aux utilisateurs authentifiés. Les pages publiques passeront par des server actions avec la clé service_role, jamais exposée côté client.
4. Écris une fonction qui recalcule le statut d'un dossier : en_attente si aucune partie confirmée, partiellement_joignable si une seule, joignable si les deux, rdv_fixe si un créneau commun a été trouvé.
5. Crée un fichier seed.sql avec 1 médiateur, 10 créneaux sur les 7 prochains jours ouvrés (9h-12h et 14h-17h), et 3 dossiers d'exemple à des statuts différents avec des noms fictifs.
6. Crée les clients Supabase (navigateur et serveur) et une page de connexion email/mot de passe pour le greffe et le médiateur.
7. Ajoute un README qui explique comment lancer le projet en local.
```

## Prompt 1 bis — Préparer le travail d'équipe (Personne 1, juste après)

```
Le socle est en place. Prépare maintenant le projet pour une équipe de 6 personnes qui vont travailler en parallèle avec Claude Code.

1. Crée une nouvelle migration SQL (ne modifie pas l'existante) qui ajoute à la table parties : avocat_email, avocat_telephone, avocat_barreau (texte, nullable), passer_par_avocat (bool, défaut false) et rempli_par (enum : partie, avocat, nullable). Mets à jour les types TypeScript.

2. Vérifie que la fonction de recalcul du statut et de réservation du premier créneau commun existe bien dans un seul fichier réutilisable (par exemple lib/dossiers.ts), exportée et documentée. Si elle est en SQL, crée un wrapper TypeScript appelable depuis une server action.

3. Complète CLAUDE.md avec ces sections :
   - "Schéma de la base" : chaque table, ses colonnes et le rôle de chaque statut.
   - "Fonctions partagées" : chemin et signature de la fonction de recalcul du statut et des clients Supabase. Règle : ne jamais dupliquer cette logique.
   - "Répartition de l'équipe" :
     - Personne 1 : socle, migrations, lib/, déploiement. SEULE à modifier supabase/migrations.
     - Personne 2 : espace greffe, dossier app/greffe.
     - Personne 3 : parcours partie, dossier app/p/[token] (sauf le sous-dossier avocat).
     - Personne 4 : tableau de bord médiateur, dossier app/mediateur.
     - Personne 5 : emails, dossier lib/emails et les server actions d'envoi.
     - Personne 6 : parcours avocat, dossier app/p/[token]/avocat.
   - "Règles" : rester dans ses dossiers ; ne pas modifier la base sans passer par la personne 1 ; composants partagés dans components/ui uniquement via shadcn ; ne jamais exposer SUPABASE_SERVICE_ROLE_KEY côté client ; tout le texte visible en français.

4. Lance npm run build et corrige les erreurs éventuelles.

5. Donne-moi les commandes git pour commiter et pousser sur main.
```

---

## Prompt de vérification (tout le monde, avant son prompt)

```
Avant de coder quoi que ce soit, lis CLAUDE.md, PROMPTS.md et tous les fichiers de supabase/migrations. Puis résume-moi en quelques lignes :
- le problème qu'on résout et notre solution,
- les tables et les statuts d'un dossier,
- où se trouve la fonction de recalcul du statut,
- quels dossiers j'ai le droit de modifier si je suis la personne [NUMÉRO].
Ne modifie aucun fichier.
```

---

## Prompt 2 — Espace greffe (Personne 2)

```
Lis CLAUDE.md et les migrations. Je suis la personne 2 : je travaille uniquement dans src/app/greffe (et je peux ajouter des composants shadcn).

Crée l'espace greffe, accessible après connexion, sur /greffe :
- Une liste des dossiers (numéro RG, juridiction, médiateur, statut affiché avec un badge coloré : gris en_attente, orange partiellement_joignable, bleu joignable, vert rdv_fixe).
- Un formulaire "Nouveau dossier" : numéro RG, juridiction, date de l'ordonnance, médiateur (liste déroulante), puis pour chaque partie (demandeur et défendeur) : nom, prénom, nom de l'avocat (optionnel).
- À la création, génère un token aléatoire sécurisé pour chaque partie.
- Une page /greffe/dossiers/[id] qui affiche, pour chaque partie, un encart imprimable "À joindre à la notification" contenant : le QR code (bibliothèque qrcode.react) pointant vers /p/[token], l'URL en texte, et la phrase : "Scannez ce code pour transmettre vos coordonnées au médiateur et choisir une date de rendez-vous. Vous êtes avocat ? Le même code vous permet de répondre pour votre client."
- Un bouton "Imprimer" avec une feuille de style d'impression (seul l'encart est imprimé, un encart par page).

Teste le parcours complet puis lance npm run build.
```

## Prompt 3 — Parcours de la partie (Personne 3)

```
Lis CLAUDE.md et les migrations. Je suis la personne 3 : je travaille uniquement dans src/app/p/[token], SAUF le sous-dossier src/app/p/[token]/avocat qui appartient à la personne 6.

Crée la page publique /p/[token], sans connexion, mobile-first, en français très simple, avec de grands boutons. Public visé : des personnes pas forcément à l'aise avec le numérique.

Parcours en 4 étapes avec une barre de progression :
1. Vérification : afficher "Dossier n° [numero_rg]" et demander le nom de famille. Comparer sans tenir compte des majuscules ni des accents. En cas d'erreur, message clair. Sous le formulaire, un lien bien visible : "Vous êtes l'avocat de cette partie ? Cliquez ici" qui mène à /p/[token]/avocat.
2. Coordonnées : téléphone (format français et réunionnais, ex. 0692...) et email, avec validation.
3. Consentement : texte court expliquant que les coordonnées seront transmises uniquement au médiateur désigné pour organiser la médiation. Case à cocher obligatoire.
4. Disponibilités : afficher les créneaux du médiateur groupés par jour, sélection multiple.

À la validation (server action avec la clé service_role) : enregistrer les données, rempli_par = partie, confirme_le = maintenant, enregistrer les disponibilités, puis relire le dossier avec la fonction partagée décrite dans CLAUDE.md (le statut est recalculé automatiquement par la base : n'appelle aucune fonction de recalcul). Ne duplique pas cette logique.

Écran final : confirmation avec récapitulatif. Si le rendez-vous est fixé, afficher la date. Sinon : "Le médiateur vous contactera prochainement."
Si le token est invalide ou si la partie a déjà confirmé (par elle-même ou par son avocat), afficher un message adapté.
En bas de chaque écran : "Besoin d'aide ? Contactez votre avocat ou le greffe."

Teste sur une largeur de 375 px puis lance npm run build.
```

## Prompt 4 — Tableau de bord du médiateur (Personne 4)

```
Lis CLAUDE.md et les migrations. Je suis la personne 4 : je travaille uniquement dans src/app/mediateur.

Crée le tableau de bord du médiateur sur /mediateur, accessible après connexion :
- En haut, 4 indicateurs : dossiers en attente, partiellement joignables, joignables, rendez-vous fixés. Plus un indicateur "délai moyen entre l'ordonnance et la confirmation des deux parties".
- Une liste de cartes par dossier : numéro RG, date de l'ordonnance, nombre de jours écoulés, statut avec un badge coloré (gris, orange, bleu, vert), et pour chaque partie une pastille "confirmé" ou "en attente", plus un badge "via avocat" si rempli_par = avocat.
- Mise à jour en temps réel avec Supabase Realtime (abonnement aux tables dossiers et parties). Quand un dossier change de statut, anime la carte (léger flash vert) : c'est le moment fort de la démo.
- Page de détail /mediateur/dossiers/[id] : coordonnées des parties confirmées (téléphone et email cliquables) ; si passer_par_avocat est vrai, afficher en priorité les coordonnées de l'avocat avec la mention "Le client souhaite être contacté via son avocat" ; créneau du rendez-vous si fixé ; interrupteur "Provision consignée".
- Signale en rouge les dossiers sans confirmation complète depuis plus de 7 jours.
- Laisse un emplacement pour un bouton "Relancer" sur la page de détail : la personne 5 y branchera l'envoi d'email. Exporte un composant vide src/components/relance-button.tsx qu'elle remplira.

Teste le temps réel avec deux onglets ouverts puis lance npm run build.
```

## Prompt 5 — Emails (Personne 5)

```
Lis CLAUDE.md et les migrations. Je suis la personne 5 : je travaille dans src/lib/emails, dans les server actions d'envoi et dans src/components/relance-button.tsx (créé par la personne 4 ; s'il n'existe pas encore, crée-le).

Ajoute l'envoi d'emails avec Resend :
- Quand un dossier passe en rdv_fixe, envoyer un email de confirmation à chaque partie (ou à son avocat si passer_par_avocat est vrai) et au médiateur : date, heure, numéro de dossier. Branche cet envoi dans la fonction partagée enregistrerReponse (src/lib/dossiers.ts), à l'emplacement prévu juste après la relecture du dossier, sans modifier sa logique ; si tu dois toucher src/lib/, explique-moi le changement pour que je le valide avec la personne 1.
- Le bouton "Relancer" envoie le lien /p/[token] aux parties non confirmées dont un email est connu (partie ou avocat).
- Emails en français, courts, sobres, en texte simple, avec l'en-tête "Médiation – Cour d'appel de Saint-Denis".
- Si RESEND_API_KEY est absente, afficher l'email dans la console au lieu de planter.

Ensuite, teste toute l'application sur un vrai téléphone et liste-moi les bugs trouvés, classés par gravité.
```

## Prompt 6 — Parcours avocat (Personne 6)

```
Lis CLAUDE.md et les migrations. Je suis la personne 6 : je travaille uniquement dans src/app/p/[token]/avocat. Les colonnes avocat_email, avocat_telephone, avocat_barreau, passer_par_avocat et rempli_par existent déjà : ne crée aucune migration.

Contexte : la notification de l'ordonnance arrive souvent chez l'avocat, qui doit pouvoir répondre à la place de son client avec le même QR code.

Crée la route /p/[token]/avocat, mobile-first, en français, avec une barre de progression :
1. Vérification : numéro RG du dossier et nom de famille du client (comparaison sans majuscules ni accents).
2. L'avocat : nom, email, téléphone, barreau (liste avec "Saint-Denis de La Réunion" en premier).
3. Le client : téléphone et email du client, optionnels. Une case "Mon client souhaite que le médiateur passe par moi" (passer_par_avocat). Si elle est cochée, les coordonnées du client ne sont pas obligatoires.
4. Consentement : case obligatoire indiquant que l'avocat agit pour le compte de son client et que les données ne sont transmises qu'au médiateur désigné.
5. Disponibilités : mêmes créneaux que le parcours partie, groupés par jour, sélection multiple.

À la validation (server action avec la clé service_role) : enregistrer, rempli_par = avocat, confirme_le = maintenant, puis relire le dossier avec la fonction partagée décrite dans CLAUDE.md (le statut est recalculé automatiquement par la base : n'appelle aucune fonction de recalcul). Ne duplique pas cette logique.

Écran final : récapitulatif avec un bouton "Imprimer le récapitulatif" pour le dossier du cabinet.
Si la partie a déjà confirmé, afficher un message adapté.

Teste sur une largeur de 375 px puis lance npm run build.
```

---

## Prompt 7 — Finitions et démo (Personne 1, fin d'après-midi, après fusion des branches)

```
Lis CLAUDE.md. Toutes les branches ont été fusionnées sur main. Prépare l'application pour une démo devant un jury à 17h30 :
1. Vérifie le parcours de bout en bout : création de dossier par le greffe, scan par la partie A, réponse de l'avocat de la partie B, rendez-vous fixé, mise à jour en temps réel chez le médiateur, email envoyé.
2. Corrige les erreurs TypeScript et de build (npm run build doit passer).
3. Vérifie le rendu de /p/[token] et /p/[token]/avocat sur 375 px de large.
4. Crée un script npm "reset-demo" qui vide la base et relance le seed, avec un dossier de démo prêt à être scanné en direct.
5. Ajoute une page d'accueil qui présente le projet en une phrase, avec des liens vers les espaces greffe et médiateur.
6. Donne-moi les étapes pour déployer sur Vercel avec les variables d'environnement.
```

---

## Fusion des branches

- Fusionnez sur `main` dès qu'une partie marche, pas tout à la fin.
- Ordre conseillé : socle → greffe → partie → médiateur → avocat → emails.
- Après chaque fusion : `git pull` pour tout le monde et `npm run build`.
- En cas de conflit, collez-le à Claude Code : « Résous ce conflit en gardant les deux fonctionnalités. »