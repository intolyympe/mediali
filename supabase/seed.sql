-- =============================================================================
-- Données de démonstration (développement local uniquement)
-- Toutes les personnes ci-dessous sont fictives.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Comptes de connexion : greffe@exemple.fr et mediateur@exemple.fr
-- Mot de passe : motdepasse
-- -----------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('motdepasse', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}', jsonb_build_object('fonction', u.fonction),
  now(), now(), '', '', '', ''
from (values
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'greffe@exemple.fr', 'greffe'),
  ('aaaaaaaa-0000-0000-0000-000000000002'::uuid, 'mediateur@exemple.fr', 'mediateur')
) as u (id, email, fonction);

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), id, id::text,
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users
where email in ('greffe@exemple.fr', 'mediateur@exemple.fr');

-- -----------------------------------------------------------------------------
-- Médiateur
-- -----------------------------------------------------------------------------

insert into public.mediateurs (id, nom, email, telephone) values
  ('11111111-0000-0000-0000-000000000001', 'Marie-Claude Fontaine', 'mediateur@exemple.fr', '0262 00 00 01');

-- -----------------------------------------------------------------------------
-- 10 créneaux sur les 7 prochains jours ouvrés (heure de La Réunion)
-- Matin 9h-12h chaque jour, après-midi 14h-17h les 1er, 3e et 5e jours.
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

-- -----------------------------------------------------------------------------
-- Dossiers
-- -----------------------------------------------------------------------------

insert into public.dossiers (id, numero_rg, juridiction, date_ordonnance, mediateur_id, provision_consignee) values
  ('22222222-0000-0000-0000-000000000001', '26/00123', 'Cour d''appel de Saint-Denis', current_date - 3,  '11111111-0000-0000-0000-000000000001', false),
  ('22222222-0000-0000-0000-000000000002', '26/00145', 'Cour d''appel de Saint-Denis', current_date - 8,  '11111111-0000-0000-0000-000000000001', true),
  ('22222222-0000-0000-0000-000000000003', '26/00167', 'Cour d''appel de Saint-Denis', current_date - 15, '11111111-0000-0000-0000-000000000001', true);

-- -----------------------------------------------------------------------------
-- Parties (jetons lisibles pour la démo : /p/demo-1-demandeur, etc.)
-- Le statut des dossiers est recalculé automatiquement par les déclencheurs.
-- -----------------------------------------------------------------------------

insert into public.parties (dossier_id, role, nom, prenom, avocat_nom, token, telephone, email, consentement_rgpd, confirme_le) values
  -- Dossier 1 : personne n'a encore scanné → en_attente
  ('22222222-0000-0000-0000-000000000001', 'demandeur', 'Hoarau',  'Jean-Marc', 'Me Sophie Lebon', 'demo-1-demandeur', null, null, false, null),
  ('22222222-0000-0000-0000-000000000001', 'defendeur', 'Grondin', 'Nadia',     null,              'demo-1-defendeur', null, null, false, null),
  -- Dossier 2 : seul le demandeur a répondu → partiellement_joignable
  ('22222222-0000-0000-0000-000000000002', 'demandeur', 'Payet',   'Christophe', null,             'demo-2-demandeur', '0692 00 00 02', 'c.payet@exemple.fr', true, now() - interval '2 days'),
  ('22222222-0000-0000-0000-000000000002', 'defendeur', 'Rivière', 'Lucie',     'Me Paul Técher', 'demo-2-defendeur', null, null, false, null),
  -- Dossier 3 : les deux ont répondu avec un créneau commun → rdv_fixe
  ('22222222-0000-0000-0000-000000000003', 'demandeur', 'Fontaine', 'Gérald',   null,              'demo-3-demandeur', '0693 00 00 03', 'g.fontaine@exemple.fr', true, now() - interval '5 days'),
  ('22222222-0000-0000-0000-000000000003', 'defendeur', 'Maillot',  'Sandrine', 'Me Anne Boyer',   'demo-3-defendeur', '0692 00 00 04', 's.maillot@exemple.fr',  true, now() - interval '1 day');

-- -----------------------------------------------------------------------------
-- Disponibilités (créneaux numérotés par ordre chronologique)
-- -----------------------------------------------------------------------------

with creneaux_numerotes as (
  select id, row_number() over (order by debut) as n
  from public.creneaux
),
choix (token, n) as (values
  ('demo-2-demandeur', 1), ('demo-2-demandeur', 3), ('demo-2-demandeur', 6),
  ('demo-3-demandeur', 2), ('demo-3-demandeur', 5), ('demo-3-demandeur', 8),
  ('demo-3-defendeur', 5), ('demo-3-defendeur', 9)
)
insert into public.disponibilites (partie_id, creneau_id)
select p.id, c.id
from choix
join public.parties p on p.token = choix.token
join creneaux_numerotes c on c.n = choix.n;
