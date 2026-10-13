-- =============================================================================
-- Comptes de démo (développement local UNIQUEMENT, chargé après seed.sql par
-- `supabase db reset`, voir config.toml). Ne jamais exécuter en production.
-- Le rôle technique du compte « juridiction » reste "greffe".
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Comptes de connexion : greffe@exemple.fr et mediateur@exemple.fr
-- Mot de passe : motdepasse
-- Le rôle (et pour le médiateur, son id dans la table mediateurs) est stocké
-- dans raw_app_meta_data : voir src/lib/roles.ts.
-- -----------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('motdepasse', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb || u.app_metadata, '{}',
  now(), now(), '', '', '', ''
from (values
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'greffe@exemple.fr',
   '{"role": "greffe"}'::jsonb),
  ('aaaaaaaa-0000-0000-0000-000000000002'::uuid, 'mediateur@exemple.fr',
   '{"role": "mediateur", "mediateur_id": "11111111-0000-0000-0000-000000000001"}'::jsonb)
) as u (id, email, app_metadata);

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), id, id::text,
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users
where email in ('greffe@exemple.fr', 'mediateur@exemple.fr');
