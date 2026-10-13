# Justice Tech 2026 — Prompts V2 (retours des professionnels)

Pitch à 17h30. Il reste environ 5 heures : on suit un planning strict.

## Planning

| Heure | Qui | Quoi |
|---|---|---|
| 12h45 → 13h15 | Personne 1 | Prompt A : nouveau modèle de données (tout le monde en dépend) |
| 12h45 → 13h15 | Personne 5 | Prompt B : charte de l'État (DSFR, Marianne), uniquement les fichiers globaux |
| 12h45 → 13h15 | Personnes 2, 3, 4, 6 | Pause déjeuner. Ne lancez rien, sinon conflits garantis. |
| 13h15 | Personnes 1 et 5 | Fusion sur main, migration appliquée sur Supabase, message à l'équipe |
| 13h15 → 15h15 | Personnes 2, 3, 4, 6 | `git pull`, nouvelle branche, prompt C, D, E ou F |
| 13h15 → 15h15 | Personne 1 | Aide, tests, et mise à jour des slides avec les nouveautés |
| 13h15 → 15h15 | Personne 5 | Emails (fin du prompt B), puis tests sur téléphone |
| 15h15 → 15h45 | Personne 1 | Fusion : juridiction → partie → avocat → mediateur |
| 15h45 → 16h30 | Personne 1 | Prompt G : déploiement Vercel |
| 16h30 → 17h15 | Toute l'équipe | Répétition du pitch et de la démo |

**Règle d'or : à 15h15, on fusionne ce qui marche et on abandonne le reste.** Une démo qui marche vaut mieux que dix fonctionnalités à moitié finies.

---

## Prompt A — Nouveau modèle de données (Personne 1, 12h45)

```
Lis CLAUDE.md et toutes les migrations. Les professionnels du droit nous ont fait des retours : on fait évoluer le modèle. Crée UNE nouvelle migration (ne modifie pas les existantes), puis mets à jour les types, la lib partagée, le seed et CLAUDE.md. Le reste de l'équipe attend cette migration : fais simple et rapide.

1. Médiation ou conciliation : enum mode_amiable (mediation, conciliation) → dossiers.mode (défaut mediation). Ajoute mediateurs.fonction (mediateur, conciliateur). Ajoute dossiers.co_mediateur_id (nullable, référence mediateurs) pour la co-médiation quand il y a plus de 2 parties.

2. Plusieurs parties : supprime la contrainte "une partie au maximum par rôle et par dossier". Un dossier peut avoir plusieurs demandeurs et plusieurs défendeurs. Ajoute à parties : telephone_2, email_2, adresse (texte, nullable).

3. Choix de la partie : enum choix_partie (information, accepte, refuse) → parties.choix (nullable). Libellés : "Réunion d'information d'abord", "Accepte la médiation", "Refuse". Préférences pour le premier rendez-vous : parties.pref_format (ensemble, separe, indifferent) et parties.pref_lieu (presentiel, distanciel, indifferent), nullable.

4. Rendez-vous fixé par le médiateur : dossiers.rdv_format (ensemble, separe) et dossiers.rdv_lieu (presentiel, distanciel), nullable.

5. Issue du dossier : enum issue_dossier (en_cours, accord_total, accord_partiel, echec, carence, refus) → dossiers.issue (défaut en_cours). Ajoute dossiers.compte_rendu (texte) et dossiers.cloture_le (timestamp).

6. Timeline : table evenements (id, dossier_id avec suppression en cascade, type texte, libelle texte, acteur texte parmi juridiction/partie/avocat/mediateur/systeme, details jsonb, created_at). Active Realtime dessus. Même RLS que les autres tables.
   Des triggers SQL créent automatiquement un événement : création du dossier ("Ordonnance enregistrée"), réponse d'une partie ("Marie Payet a transmis ses coordonnées", ou "... via son avocat"), refus ("Marie Payet refuse la médiation"), passage en rdv_fixe ("Premier rendez-vous fixé le ..."), changement d'issue, ajout d'un compte rendu.

7. Statut avec plusieurs parties : joignable quand TOUTES les parties ont répondu, partiellement_joignable dès qu'au moins une a répondu. Le créneau automatique est le premier créneau commun à toutes les parties qui n'ont pas refusé. Mets à jour la fonction et le trigger existants.

8. Renomme partout dans les textes visibles "greffe" en "juridiction" ("Espace juridiction"), et la route /greffe en /juridiction, avec une redirection depuis /greffe. Le rôle technique dans app_metadata peut rester "greffe" : documente-le dans CLAUDE.md.

9. Mets à jour les types TypeScript et le seed : un dossier en conciliation, un dossier à 3 parties avec co-médiateur, un dossier clos avec accord, un dossier en carence, et des événements de timeline variés. Le seed ne doit pas toucher aux comptes utilisateurs.

10. Ajoute dans CLAUDE.md une section "Modèle V2" qui décrit tout ça, avec le libellé français de chaque valeur d'enum.

11. npm run build doit passer. Donne-moi ensuite, séparément : le SQL de la migration à coller dans l'éditeur SQL de Supabase, et le SQL qui vide les données et réinsère le seed sans toucher aux comptes.
```

## Prompt B — Charte de l'État (Personne 5, 12h45)

```
Lis CLAUDE.md. Je suis la personne 5. On refait l'apparence de toute l'application selon la charte de l'État (Système de Design de l'État, DSFR) : police Marianne et bleu institutionnel. Je touche UNIQUEMENT aux fichiers globaux : src/app/layout.tsx, src/app/globals.css, le thème de src/components/ui, et de nouveaux composants dans src/components/dsfr/ et src/components/timeline.tsx. Ne modifie aucune page : d'autres personnes vont y travailler.

1. Installe le paquet npm officiel @gouvfr/dsfr et charge la police Marianne depuis ses fichiers. Ne charge pas tout le CSS du DSFR, pour ne pas casser les composants shadcn. Si ce n'est pas possible proprement, explique-moi pourquoi avant de faire autrement.

2. Thème : redéfinis les variables CSS de shadcn avec les couleurs du DSFR : bleu France #000091 (primaire), #1212FF (survol), rouge Marianne #E1000F (uniquement pour les erreurs), texte #161616, texte secondaire #3A3A3A, fond #FFFFFF, fond alterné #F6F6F6, bordures #DDDDDD, succès #18753C, avertissement #B34000, information #0063CB. Coins presque droits (4px maximum). Boutons principaux en bleu France plein, boutons secondaires en contour bleu.

3. En-tête (src/components/dsfr/header.tsx), sur le modèle des sites de l'État : bloc-marque "République Française" avec la devise "Liberté Égalité Fraternité" en texte (pas d'image de logo officiel), "Cour d'appel de Saint-Denis de La Réunion", nom du service "Médialien" et sous-titre "Médiation et conciliation judiciaires". Pied de page simple (src/components/dsfr/footer.tsx). Branche-les dans le layout pour toutes les pages.

4. Composants partagés pour les autres membres de l'équipe :
   - src/components/dsfr/statut-badge.tsx : badges de statut et d'issue aux couleurs du DSFR (information, avertissement, succès, neutre, erreur), toujours avec un texte.
   - src/components/timeline.tsx : liste verticale d'événements (date et heure, acteur, libellé, détail), style DSFR. Il reçoit un tableau d'événements en props et ne fait aucune requête lui-même.

5. Accessibilité : contrastes conformes au RGAA, focus clavier bien visible.

6. Ajoute dans CLAUDE.md une section "Charte DSFR" : couleurs, composants à utiliser, règles. npm run build doit passer.

7. Une fois que la personne 1 a poussé la nouvelle migration (git pull) : adapte les emails pour dire "médiateur" ou "conciliateur", "médiation" ou "conciliation", selon dossiers.mode.
```

---

## Prompt C — Espace juridiction (Personne 2, 13h15)

```
Lis CLAUDE.md (sections "Modèle V2" et "Charte DSFR") et toutes les migrations. Je suis la personne 2 : je travaille uniquement dans src/app/juridiction.

1. Formulaire "Nouveau dossier" :
   - choix "Médiation" ou "Conciliation" ; la liste des intervenants est filtrée selon ce choix (médiateurs ou conciliateurs) ;
   - parties dynamiques : boutons "Ajouter un demandeur" et "Ajouter un défendeur" ; pour chacune : nom, prénom, avocat, et un lien "Ajouter des coordonnées connues" (téléphone, téléphone 2, email, adresse), optionnel ;
   - dès qu'il y a plus de 2 parties, proposer un co-médiateur (optionnel).

2. Page d'un dossier : un encart QR imprimable par partie (demandeurs d'abord), puis la timeline complète du dossier avec le composant src/components/timeline.tsx, mise à jour en temps réel.

3. Tableau de suivi, page d'accueil de /juridiction :
   - en haut, des indicateurs : dossiers en cours, taux de réponse des parties, refus, carences, accords, délai moyen entre l'ordonnance et le premier rendez-vous ;
   - un tableau de tous les dossiers : numéro RG, mode, intervenant(s), parties ayant répondu sur le total, choix des parties (avec libellés), statut, issue, jours écoulés ;
   - des filtres : mode, statut, issue, "sans réponse depuis plus de 7 jours" ;
   - un bouton "Exporter en CSV".

4. Composants et couleurs DSFR de CLAUDE.md. npm run build doit passer.
```

## Prompt D — Parcours de la partie (Personne 3, 13h15)

```
Lis CLAUDE.md (sections "Modèle V2" et "Charte DSFR") et toutes les migrations. Je suis la personne 3 : je travaille uniquement dans src/app/p/[token], sauf le sous-dossier avocat.

Fais évoluer le parcours :
1. Adapte tout le vocabulaire au mode du dossier : médiation et médiateur, ou conciliation et conciliateur.

2. Nouvelle étape juste après la vérification, "Que souhaitez-vous ?", avec trois grands choix expliqués simplement :
   - "Je souhaite d'abord une réunion d'information gratuite pour comprendre la démarche"
   - "J'accepte directement la médiation"
   - "Je refuse la médiation", avec une phrase neutre indiquant que le juge en sera informé.
   En cas de refus : demander confirmation, enregistrer, puis aller directement à l'écran final.

3. Coordonnées : téléphone ou email (au moins un des deux), puis un lien "Ajouter un autre moyen de contact" : téléphone 2, email 2, adresse postale.

4. Nouvelle étape avant les disponibilités, "Votre premier rendez-vous" : "Avec l'autre partie / Séparément / Peu importe" et "En personne / À distance (visio ou téléphone) / Peu importe".

5. Mets à jour la barre de progression et l'écran final, avec le récapitulatif de tous les choix.

6. Style DSFR (CLAUDE.md). Teste sur 375 px de large, puis npm run build.
```

## Prompt E — Espace médiateur (Personne 4, 13h15)

```
Lis CLAUDE.md (sections "Modèle V2" et "Charte DSFR") et toutes les migrations. Je suis la personne 4 : je travaille uniquement dans src/app/mediateur.

Transforme l'espace en véritable outil de suivi pour le médiateur ou le conciliateur :

1. Tableau de bord : seulement les dossiers où je suis intervenant principal ou co-médiateur (badge "Co-médiation"). Sur chaque carte : le mode, les parties ayant répondu sur le total, et le choix de chaque partie. Garde le temps réel et le flash vert.

2. Page d'un dossier, en deux colonnes :
   - à gauche, les parties : toutes leurs coordonnées (celles de l'avocat en priorité si passer_par_avocat), leur choix et leurs préférences de rendez-vous ;
   - à droite, la timeline du dossier (composant src/components/timeline.tsx), en temps réel.

3. Les actions du médiateur, chacune ajoutant un événement à la timeline :
   - "Fixer le premier rendez-vous" : date (créneau proposé automatiquement ou autre date), format (ensemble ou séparément), lieu (en personne ou à distance), en affichant les préférences des parties à côté ;
   - "Réunion d'information tenue" et "Séance tenue" : date, parties présentes ;
   - "Partie absente" : choix de la partie ;
   - "Ajouter un compte rendu" : texte court, avec un rappel visible que le contenu des échanges en médiation reste confidentiel et ne doit pas figurer dans le compte rendu ;
   - "Clôturer le dossier" : issue (accord total, accord partiel, échec, carence, refus) et date. Le dossier passe ensuite en lecture seule.

4. Cette timeline est la même que celle de l'espace juridiction : tout ce que fait le médiateur y apparaît.

5. Style DSFR. Teste le temps réel avec deux fenêtres, puis npm run build.
```

## Prompt F — Parcours avocat (Personne 6, 13h15)

```
Lis CLAUDE.md (sections "Modèle V2" et "Charte DSFR") et toutes les migrations. Je suis la personne 6 : je travaille uniquement dans src/app/p/[token]/avocat.

Applique au parcours avocat les mêmes évolutions que le parcours partie, du point de vue de l'avocat :
1. Vocabulaire selon le mode du dossier (médiation ou conciliation).
2. Étape "Position de votre client" : réunion d'information d'abord, accepte la médiation, ou refuse (avec confirmation, puis fin du parcours).
3. Coordonnées supplémentaires du client, optionnelles : téléphone 2, email 2, adresse postale.
4. Préférences du premier rendez-vous : avec l'autre partie / séparément / peu importe, et en personne / à distance / peu importe.
5. Récapitulatif final complet et imprimable.

Style DSFR (CLAUDE.md). Teste sur 375 px de large, puis npm run build.
```

---

## Prompt G — Déploiement (Personne 1, 15h45)

```
Lis CLAUDE.md. Toutes les branches sont fusionnées sur main. Prépare la démo devant le jury à 17h30. La base est un projet Supabase hébergé (pas de Docker).

1. Les QR codes et les liens /p/[token] (juridiction, emails) doivent utiliser une variable NEXT_PUBLIC_SITE_URL (http://localhost:3000 en local, l'adresse Vercel en production), jamais une URL écrite en dur. Ajoute-la à .env.local.example.
2. Vérifie le parcours complet en lisant le code : création du dossier par la juridiction, réponse d'une partie, réponse d'un avocat, rendez-vous fixé, actions du médiateur, clôture, timeline visible des deux côtés. Liste-moi ce qui est cassé avant de corriger.
3. npm run lint, npm run typecheck et npm run build doivent passer.
4. Script npm "reset-demo" avec la clé service_role et le client Supabase JS (pas de supabase db reset ni de psql) : vide dossiers, parties, disponibilites, creneaux et evenements, recrée les créneaux et le seed de démo, plus un dossier "26/00300" en médiation, en attente, prêt à être scanné en direct. Il ne touche JAMAIS aux comptes utilisateurs ni aux médiateurs. Il affiche à la fin les liens /p/... du dossier 26/00300.
5. Page d'accueil : le projet en une phrase, liens vers l'espace juridiction et l'espace médiateur.
6. Explique-moi pas à pas, pour un débutant, le déploiement sur Vercel : import du repo GitHub, variables d'environnement (dont NEXT_PUBLIC_SITE_URL), et réglages Supabase (Authentication → URL Configuration) pour que la connexion marche en production.
```

## Fusion (15h15)

Ordre : `juridiction` → `partie` → `avocat` → `mediateur`. Après chaque fusion : `npm install`, `npm run build`, test rapide, `git push origin main`.