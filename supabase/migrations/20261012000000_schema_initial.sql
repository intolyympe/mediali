-- =============================================================================
-- Schéma initial : médiateurs, dossiers, parties, créneaux, disponibilités
-- =============================================================================

-- gen_random_bytes() pour les jetons des QR codes
create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Types énumérés
-- -----------------------------------------------------------------------------

create type public.statut_dossier as enum (
  'en_attente',
  'partiellement_joignable',
  'joignable',
  'rdv_fixe'
);

create type public.role_partie as enum (
  'demandeur',
  'defendeur'
);

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table public.mediateurs (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  email text not null unique,
  telephone text
);

create table public.creneaux (
  id uuid primary key default gen_random_uuid(),
  mediateur_id uuid not null references public.mediateurs (id) on delete cascade,
  debut timestamptz not null,
  fin timestamptz not null,
  constraint creneaux_fin_apres_debut check (fin > debut)
);

create table public.dossiers (
  id uuid primary key default gen_random_uuid(),
  numero_rg text not null unique,
  juridiction text not null,
  date_ordonnance date not null,
  mediateur_id uuid references public.mediateurs (id) on delete set null,
  provision_consignee boolean not null default false,
  statut public.statut_dossier not null default 'en_attente',
  -- Un créneau ne peut être réservé que par un seul dossier
  rdv_creneau_id uuid unique references public.creneaux (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.parties (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossiers (id) on delete cascade,
  role public.role_partie not null,
  nom text not null,
  prenom text not null,
  avocat_nom text,
  -- Jeton imprimé dans le QR code : 128 bits aléatoires en hexadécimal
  token text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  telephone text,
  email text,
  consentement_rgpd boolean not null default false,
  confirme_le timestamptz,
  constraint parties_un_role_par_dossier unique (dossier_id, role)
);

create table public.disponibilites (
  partie_id uuid not null references public.parties (id) on delete cascade,
  creneau_id uuid not null references public.creneaux (id) on delete cascade,
  primary key (partie_id, creneau_id)
);

create index creneaux_mediateur_debut_idx on public.creneaux (mediateur_id, debut);
create index dossiers_mediateur_idx on public.dossiers (mediateur_id);
create index parties_dossier_idx on public.parties (dossier_id);
create index disponibilites_creneau_idx on public.disponibilites (creneau_id);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- Lecture et écriture réservées aux utilisateurs authentifiés (greffe, médiateur).
-- Les pages publiques (QR code) passent par des server actions avec la clé
-- service_role, qui contourne la RLS.
-- -----------------------------------------------------------------------------

alter table public.mediateurs enable row level security;
alter table public.creneaux enable row level security;
alter table public.dossiers enable row level security;
alter table public.parties enable row level security;
alter table public.disponibilites enable row level security;

create policy "Accès complet aux utilisateurs authentifiés"
  on public.mediateurs for all to authenticated using (true) with check (true);

create policy "Accès complet aux utilisateurs authentifiés"
  on public.creneaux for all to authenticated using (true) with check (true);

create policy "Accès complet aux utilisateurs authentifiés"
  on public.dossiers for all to authenticated using (true) with check (true);

create policy "Accès complet aux utilisateurs authentifiés"
  on public.parties for all to authenticated using (true) with check (true);

create policy "Accès complet aux utilisateurs authentifiés"
  on public.disponibilites for all to authenticated using (true) with check (true);

-- -----------------------------------------------------------------------------
-- Realtime : le tableau de bord du médiateur suit dossiers et parties en direct
-- -----------------------------------------------------------------------------

alter publication supabase_realtime add table public.dossiers, public.parties;

-- -----------------------------------------------------------------------------
-- Recalcul du statut d'un dossier
--
--   rdv_fixe                 un créneau commun a été trouvé (ou fixé à la main)
--   en_attente               aucune partie confirmée
--   partiellement_joignable  une partie confirmée sur deux
--   joignable                toutes les parties confirmées
--
-- Une partie est « confirmée » quand elle a donné son consentement RGPD et
-- validé ses coordonnées (confirme_le renseigné).
--
-- Quand toutes les parties sont confirmées, on réserve automatiquement le
-- premier créneau à venir du médiateur choisi par toutes les parties et pas
-- déjà pris par un autre dossier. Un rendez-vous déjà fixé n'est jamais modifié.
-- -----------------------------------------------------------------------------

create or replace function public.recalculer_statut_dossier(p_dossier_id uuid)
returns public.statut_dossier
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dossier public.dossiers%rowtype;
  v_nb_parties integer;
  v_nb_confirmees integer;
  v_creneau_id uuid;
  v_statut public.statut_dossier;
begin
  select * into v_dossier
  from public.dossiers
  where id = p_dossier_id
  for update;

  if not found then
    return null;
  end if;

  select
    count(*),
    count(*) filter (where p.consentement_rgpd and p.confirme_le is not null)
  into v_nb_parties, v_nb_confirmees
  from public.parties p
  where p.dossier_id = p_dossier_id;

  v_creneau_id := v_dossier.rdv_creneau_id;

  if v_creneau_id is null and v_nb_parties > 0 and v_nb_confirmees = v_nb_parties then
    select c.id into v_creneau_id
    from public.creneaux c
    join public.disponibilites d on d.creneau_id = c.id
    join public.parties p on p.id = d.partie_id
    where p.dossier_id = p_dossier_id
      and c.mediateur_id = v_dossier.mediateur_id
      and c.debut > now()
      and not exists (
        select 1 from public.dossiers autre where autre.rdv_creneau_id = c.id
      )
    group by c.id, c.debut
    having count(distinct d.partie_id) = v_nb_parties
    order by c.debut
    limit 1;
  end if;

  v_statut := case
    when v_creneau_id is not null then 'rdv_fixe'
    when v_nb_confirmees = 0 then 'en_attente'
    when v_nb_confirmees < v_nb_parties then 'partiellement_joignable'
    else 'joignable'
  end;

  update public.dossiers
  set statut = v_statut,
      rdv_creneau_id = v_creneau_id
  where id = p_dossier_id
    and (statut is distinct from v_statut or rdv_creneau_id is distinct from v_creneau_id);

  return v_statut;
end;
$$;

revoke execute on function public.recalculer_statut_dossier(uuid) from public, anon;
grant execute on function public.recalculer_statut_dossier(uuid) to authenticated, service_role;

-- Déclencheurs : toute modification d'une partie ou de ses disponibilités
-- recalcule le statut du dossier concerné.

create or replace function public.parties_recalculer_statut()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- En INSERT, old vaut null ; en DELETE, new vaut null.
  if tg_op <> 'INSERT' then
    perform public.recalculer_statut_dossier(old.dossier_id);
  end if;
  if tg_op <> 'DELETE' and new.dossier_id is distinct from old.dossier_id then
    perform public.recalculer_statut_dossier(new.dossier_id);
  end if;
  return null;
end;
$$;

create trigger parties_recalculer_statut
  after insert or update or delete on public.parties
  for each row execute function public.parties_recalculer_statut();

create or replace function public.disponibilites_recalculer_statut()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partie_id uuid := case when tg_op = 'DELETE' then old.partie_id else new.partie_id end;
begin
  perform public.recalculer_statut_dossier(
    (select dossier_id from public.parties where id = v_partie_id)
  );
  return null;
end;
$$;

create trigger disponibilites_recalculer_statut
  after insert or delete on public.disponibilites
  for each row execute function public.disponibilites_recalculer_statut();

revoke execute on function public.parties_recalculer_statut() from public, anon, authenticated;
revoke execute on function public.disponibilites_recalculer_statut() from public, anon, authenticated;
