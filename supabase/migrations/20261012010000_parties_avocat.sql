-- =============================================================================
-- Parcours avocat : l'avocat d'une partie peut répondre à sa place avec le
-- même QR code.
-- =============================================================================

create type public.rempli_par as enum (
  'partie',
  'avocat'
);

alter table public.parties
  add column avocat_email text,
  add column avocat_telephone text,
  add column avocat_barreau text,
  -- Le client souhaite que le médiateur le contacte via son avocat
  add column passer_par_avocat boolean not null default false,
  -- Qui a rempli le formulaire (null tant que personne n'a répondu)
  add column rempli_par public.rempli_par;
