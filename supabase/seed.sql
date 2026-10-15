-- =============================================================================
-- Données de démonstration (modèle V2). Toutes les personnes sont fictives.
-- Ne touche pas aux comptes utilisateurs (voir comptes-demo.sql en local).
-- Les médiateurs sont insérés seulement s'ils n'existent pas déjà.
-- Le statut des dossiers et une partie des événements de la timeline sont
-- créés automatiquement par les déclencheurs.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Médiateurs et conciliateur
-- 11111111-…-0001 est relié au compte mediateur@exemple.fr (app_metadata).
-- -----------------------------------------------------------------------------

insert into public.mediateurs (id, nom, email, telephone, fonction) values
  ('11111111-0000-0000-0000-000000000001', 'Marie-Claude Fontaine', 'mediateur@exemple.fr',    '0262 00 00 01', 'mediateur'),
  ('11111111-0000-0000-0000-000000000002', 'Thierry Lauret',        'co.mediateur@exemple.fr', '0262 00 00 06', 'mediateur'),
  ('11111111-0000-0000-0000-000000000003', 'Josiane Hoarau',        'conciliateur@exemple.fr', '0262 00 00 07', 'conciliateur')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Créneaux (heure de La Réunion)
-- 10 créneaux à venir sur les 7 prochains jours ouvrés : 9h-12h chaque jour,
-- 14h-17h les 1er, 3e et 5e jours.
-- -----------------------------------------------------------------------------

with jours as (
  select jour::date, row_number() over (order by jour) as n
  from generate_series(current_date + 1, current_date + 14, interval '1 day') as jour
  where extract(isodow from jour) < 6
  order by jour
  limit 7
)
insert into public.creneaux (mediateur_id, debut, fin)
select
  '11111111-0000-0000-0000-000000000001',
  (jours.jour + plage.debut) at time zone 'Indian/Reunion',
  (jours.jour + plage.fin) at time zone 'Indian/Reunion'
from jours
cross join (values
  (time '09:00', time '12:00', 'matin'),
  (time '14:00', time '17:00', 'apres-midi')
) as plage (debut, fin, moment)
where plage.moment = 'matin' or jours.n in (1, 3, 5);

-- 2 créneaux passés, pour les dossiers déjà clos (4e et 8e jours ouvrés passés)
with jours_passes as (
  select jour::date, row_number() over (order by jour desc) as n
  from generate_series(current_date - 30, current_date - 1, interval '1 day') as jour
  where extract(isodow from jour) < 6
)
insert into public.creneaux (id, mediateur_id, debut, fin)
select
  passe.id,
  '11111111-0000-0000-0000-000000000001',
  (jours_passes.jour + time '09:00') at time zone 'Indian/Reunion',
  (jours_passes.jour + time '12:00') at time zone 'Indian/Reunion'
from (values
  ('33333333-0000-0000-0000-000000000001'::uuid, 8),
  ('33333333-0000-0000-0000-000000000002'::uuid, 4)
) as passe (id, n)
join jours_passes using (n);

-- -----------------------------------------------------------------------------
-- Dossiers (l'événement « Ordonnance enregistrée » est créé automatiquement)
-- -----------------------------------------------------------------------------

insert into public.dossiers (
  id, numero_rg, juridiction, date_ordonnance, mode, mediateur_id, co_mediateur_id,
  provision_consignee, rdv_creneau_id, issue, compte_rendu, cloture_le, created_at
) values
  -- 1. Médiation, personne n'a répondu → en attente
  ('22222222-0000-0000-0000-000000000001', '26/00123', 'Cour d''appel de démonstration', current_date - 3, 'mediation',
   '11111111-0000-0000-0000-000000000001', null, false, null, 'en_cours', null, null, now() - interval '3 days'),
  -- 2. Médiation, une partie sur deux a répondu → partiellement joignable
  ('22222222-0000-0000-0000-000000000002', '26/00145', 'Cour d''appel de démonstration', current_date - 8, 'mediation',
   '11111111-0000-0000-0000-000000000001', null, true, null, 'en_cours', null, null, now() - interval '8 days'),
  -- 3. Médiation, créneau commun → RDV fixé automatiquement
  ('22222222-0000-0000-0000-000000000003', '26/00167', 'Cour d''appel de démonstration', current_date - 15, 'mediation',
   '11111111-0000-0000-0000-000000000001', null, true, null, 'en_cours', null, null, now() - interval '15 days'),
  -- 4. Conciliation
  ('22222222-0000-0000-0000-000000000004', '26/00180', 'Tribunal judiciaire de démonstration', current_date - 6, 'conciliation',
   '11111111-0000-0000-0000-000000000003', null, false, null, 'en_cours', null, null, now() - interval '6 days'),
  -- 5. Trois parties, co-médiation, un refus
  ('22222222-0000-0000-0000-000000000005', '26/00192', 'Cour d''appel de démonstration', current_date - 10, 'mediation',
   '11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', true, null, 'en_cours', null, null, now() - interval '10 days'),
  -- 6. Clos avec accord total
  ('22222222-0000-0000-0000-000000000006', '26/00098', 'Cour d''appel de démonstration', current_date - 45, 'mediation',
   '11111111-0000-0000-0000-000000000001', null, true, '33333333-0000-0000-0000-000000000001', 'accord_total',
   'Les parties ont trouvé un accord sur l''échéancier de remboursement. Protocole d''accord signé, transmis au juge pour homologation.',
   now() - interval '2 days', now() - interval '45 days'),
  -- 7. Carence : le défendeur ne s'est pas présenté
  ('22222222-0000-0000-0000-000000000007', '26/00105', 'Cour d''appel de démonstration', current_date - 40, 'mediation',
   '11111111-0000-0000-0000-000000000001', null, true, '33333333-0000-0000-0000-000000000002', 'carence',
   'Le défendeur, régulièrement convoqué, ne s''est pas présenté au premier rendez-vous. Procès-verbal de carence dressé.',
   now() - interval '3 days', now() - interval '40 days');

-- -----------------------------------------------------------------------------
-- Parties (jetons lisibles pour la démo : /p/demo-1-demandeur, etc.)
-- Les événements « a transmis ses coordonnées » et « refuse la médiation »
-- sont créés automatiquement, datés de confirme_le.
-- -----------------------------------------------------------------------------

insert into public.parties (
  dossier_id, role, nom, prenom, token, telephone, telephone_2, email, email_2, adresse,
  consentement_rgpd, confirme_le, rempli_par, choix, pref_format, pref_lieu,
  passer_par_avocat, avocat_nom, avocat_email, avocat_telephone, avocat_barreau
) values
  -- 1. En attente
  ('22222222-0000-0000-0000-000000000001', 'demandeur', 'Hoarau', 'Jean-Marc', 'demo-1-demandeur', null, null, null, null, null,
   false, null, null, null, null, null, false, 'Me Sophie Lebon', null, null, null),
  ('22222222-0000-0000-0000-000000000001', 'defendeur', 'Grondin', 'Nadia', 'demo-1-defendeur', null, null, null, null, null,
   false, null, null, null, null, null, false, null, null, null, null),

  -- 2. Partiellement joignable
  ('22222222-0000-0000-0000-000000000002', 'demandeur', 'Payet', 'Christophe', 'demo-2-demandeur', '06 92 00 00 02', null, 'c.payet@exemple.fr', null, null,
   true, now() - interval '2 days', 'partie', 'accepte', 'ensemble', 'presentiel', false, null, null, null, null),
  ('22222222-0000-0000-0000-000000000002', 'defendeur', 'Rivière', 'Lucie', 'demo-2-defendeur', null, null, null, null, null,
   false, null, null, null, null, null, false, 'Me Paul Técher', null, null, null),

  -- 3. RDV fixé (le défendeur a répondu via son avocate)
  ('22222222-0000-0000-0000-000000000003', 'demandeur', 'Fontaine', 'Gérald', 'demo-3-demandeur', '06 93 00 00 03', null, 'g.fontaine@exemple.fr', null, null,
   true, now() - interval '5 days', 'partie', 'accepte', 'indifferent', 'presentiel', false, null, null, null, null),
  ('22222222-0000-0000-0000-000000000003', 'defendeur', 'Maillot', 'Sandrine', 'demo-3-defendeur', '06 92 00 00 04', null, 's.maillot@exemple.fr', null, null,
   true, now() - interval '1 day', 'avocat', 'accepte', 'separe', 'indifferent',
   true, 'Me Anne Boyer', 'a.boyer@avocats-exemple.fr', '02 62 00 00 05', 'Saint-Denis de La Réunion'),

  -- 4. Conciliation : le demandeur veut d'abord une réunion d'information
  ('22222222-0000-0000-0000-000000000004', 'demandeur', 'Turpin', 'Alain', 'demo-4-demandeur', '06 92 00 00 08', null, null, null, '12 rue de Paris, 97400 Saint-Denis',
   true, now() - interval '1 day', 'partie', 'information', 'separe', 'distanciel', false, null, null, null, null),
  ('22222222-0000-0000-0000-000000000004', 'defendeur', 'Dijoux', 'Murielle', 'demo-4-defendeur', null, null, null, null, null,
   false, null, null, null, null, null, false, null, null, null, null),

  -- 5. Trois parties : deux demandeurs (dont un refus), un défendeur sans réponse
  ('22222222-0000-0000-0000-000000000005', 'demandeur', 'Lebreton', 'Patrick', 'demo-5-demandeur-1', '06 93 00 00 09', '02 62 00 00 10', 'p.lebreton@exemple.fr', null, '4 chemin des Lilas, 97490 Sainte-Clotilde',
   true, now() - interval '4 days', 'partie', 'accepte', 'ensemble', 'presentiel', false, null, null, null, null),
  ('22222222-0000-0000-0000-000000000005', 'demandeur', 'Lebreton', 'Annie', 'demo-5-demandeur-2', null, null, null, null, null,
   false, now() - interval '2 days', 'partie', 'refuse', null, null, false, null, null, null, null),
  ('22222222-0000-0000-0000-000000000005', 'defendeur', 'Bègue', 'Olivier', 'demo-5-defendeur', null, null, null, null, null,
   false, null, null, null, null, null, false, 'Me Karine Payet', null, null, null),

  -- 6. Clos avec accord
  ('22222222-0000-0000-0000-000000000006', 'demandeur', 'Morel', 'Isabelle', 'demo-6-demandeur', '06 92 00 00 11', null, 'i.morel@exemple.fr', null, null,
   true, now() - interval '30 days', 'partie', 'accepte', 'ensemble', 'presentiel', false, null, null, null, null),
  ('22222222-0000-0000-0000-000000000006', 'defendeur', 'Cadet', 'Bruno', 'demo-6-defendeur', '06 93 00 00 12', null, null, null, null,
   true, now() - interval '25 days', 'avocat', 'accepte', 'indifferent', 'presentiel',
   false, 'Me Hélène Nativel', 'h.nativel@avocats-exemple.fr', '02 62 00 00 13', 'Saint-Denis de La Réunion'),

  -- 7. Carence
  ('22222222-0000-0000-0000-000000000007', 'demandeur', 'Clain', 'Sabine', 'demo-7-demandeur', '06 92 00 00 14', null, 's.clain@exemple.fr', null, null,
   true, now() - interval '20 days', 'partie', 'accepte', 'ensemble', 'distanciel', false, null, null, null, null),
  ('22222222-0000-0000-0000-000000000007', 'defendeur', 'Ethève', 'Rodolphe', 'demo-7-defendeur', '06 93 00 00 15', null, null, null, null,
   true, now() - interval '18 days', 'partie', 'information', 'separe', 'presentiel', false, null, null, null, null);

-- -----------------------------------------------------------------------------
-- Disponibilités (créneaux à venir numérotés par ordre chronologique)
-- -----------------------------------------------------------------------------

with creneaux_numerotes as (
  select id, row_number() over (order by debut) as n
  from public.creneaux
  where debut > now()
),
choix (token, n) as (values
  ('demo-2-demandeur', 1), ('demo-2-demandeur', 3), ('demo-2-demandeur', 6),
  ('demo-3-demandeur', 2), ('demo-3-demandeur', 5), ('demo-3-demandeur', 8),
  ('demo-3-defendeur', 5), ('demo-3-defendeur', 9),
  ('demo-5-demandeur-1', 3), ('demo-5-demandeur-1', 7)
)
insert into public.disponibilites (partie_id, creneau_id)
select p.id, c.id
from choix
join public.parties p on p.token = choix.token
join creneaux_numerotes c on c.n = choix.n;

-- Format du rendez-vous fixé pour le dossier 3 (choisi par le médiateur)
update public.dossiers
set rdv_format = 'ensemble', rdv_lieu = 'presentiel'
where id = '22222222-0000-0000-0000-000000000003';

-- -----------------------------------------------------------------------------
-- Événements passés des dossiers clos (insérés à la main pour les dater)
-- -----------------------------------------------------------------------------

insert into public.evenements (dossier_id, type, libelle, acteur, details, created_at)
select
  e.dossier_id, e.type,
  case when e.type = 'rdv_fixe'
    then 'Premier rendez-vous fixé le ' || to_char(c.debut at time zone 'Indian/Reunion', 'DD/MM/YYYY "à" HH24"h"MI')
    else e.libelle
  end,
  e.acteur, e.details, e.created_at
from (values
  ('22222222-0000-0000-0000-000000000006'::uuid, 'rdv_fixe', null, 'systeme', '{}'::jsonb, now() - interval '25 days'),
  ('22222222-0000-0000-0000-000000000006'::uuid, 'compte_rendu', 'Compte rendu ajouté', 'mediateur', '{}'::jsonb, now() - interval '2 days 1 hour'),
  ('22222222-0000-0000-0000-000000000006'::uuid, 'issue', 'Issue : accord total', 'mediateur', '{"avant": "en_cours", "apres": "accord_total"}'::jsonb, now() - interval '2 days'),
  ('22222222-0000-0000-0000-000000000007'::uuid, 'rdv_fixe', null, 'systeme', '{}'::jsonb, now() - interval '18 days'),
  ('22222222-0000-0000-0000-000000000007'::uuid, 'compte_rendu', 'Compte rendu ajouté', 'mediateur', '{}'::jsonb, now() - interval '3 days 1 hour'),
  ('22222222-0000-0000-0000-000000000007'::uuid, 'issue', 'Issue : carence', 'mediateur', '{"avant": "en_cours", "apres": "carence"}'::jsonb, now() - interval '3 days')
) as e (dossier_id, type, libelle, acteur, details, created_at)
join public.dossiers d on d.id = e.dossier_id
join public.creneaux c on c.id = d.rdv_creneau_id;
