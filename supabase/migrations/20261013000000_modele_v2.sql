-- =============================================================================
-- Modèle V2 (retours des professionnels du droit)
-- Médiation ou conciliation, co-médiation, plusieurs parties par rôle, choix
-- et préférences des parties, format du rendez-vous, issue du dossier,
-- timeline des événements.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Types énumérés
-- -----------------------------------------------------------------------------

create type public.mode_amiable as enum ('mediation', 'conciliation');
create type public.fonction_amiable as enum ('mediateur', 'conciliateur');
create type public.choix_partie as enum ('information', 'accepte', 'refuse');
create type public.preference_format as enum ('ensemble', 'separe', 'indifferent');
create type public.preference_lieu as enum ('presentiel', 'distanciel', 'indifferent');
create type public.format_rdv as enum ('ensemble', 'separe');
create type public.lieu_rdv as enum ('presentiel', 'distanciel');
create type public.issue_dossier as enum (
  'en_cours',
  'accord_total',
  'accord_partiel',
  'echec',
  'carence',
  'refus'
);

-- -----------------------------------------------------------------------------
-- Colonnes
-- -----------------------------------------------------------------------------

-- Un « médiateur » peut être médiateur ou conciliateur
alter table public.mediateurs
  add column fonction public.fonction_amiable not null default 'mediateur';

alter table public.dossiers
  add column mode public.mode_amiable not null default 'mediation',
  -- Co-médiation (dossiers à plus de 2 parties)
  add column co_mediateur_id uuid references public.mediateurs (id) on delete set null,
  -- Format du premier rendez-vous, choisi par le médiateur
  add column rdv_format public.format_rdv,
  add column rdv_lieu public.lieu_rdv,
  add column issue public.issue_dossier not null default 'en_cours',
  add column compte_rendu text,
  add column cloture_le timestamptz,
  add constraint dossiers_co_mediateur_different
    check (co_mediateur_id is null or co_mediateur_id <> mediateur_id);

create index dossiers_co_mediateur_idx on public.dossiers (co_mediateur_id);

-- Plusieurs demandeurs et plusieurs défendeurs par dossier
alter table public.parties drop constraint parties_un_role_par_dossier;

alter table public.parties
  add column telephone_2 text,
  add column email_2 text,
  add column adresse text,
  add column choix public.choix_partie,
  add column pref_format public.preference_format,
  add column pref_lieu public.preference_lieu;

-- -----------------------------------------------------------------------------
-- Timeline des événements d'un dossier
-- -----------------------------------------------------------------------------

create table public.evenements (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossiers (id) on delete cascade,
  type text not null,
  libelle text not null,
  acteur text not null
    check (acteur in ('juridiction', 'partie', 'avocat', 'mediateur', 'systeme')),
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index evenements_dossier_date_idx on public.evenements (dossier_id, created_at);

alter table public.evenements enable row level security;

create policy "Accès complet aux utilisateurs authentifiés"
  on public.evenements for all to authenticated using (true) with check (true);

alter publication supabase_realtime add table public.evenements;

-- -----------------------------------------------------------------------------
-- Recalcul du statut avec plusieurs parties
--
--   rdv_fixe                 un créneau est réservé
--   en_attente               aucune partie n'a répondu
--   partiellement_joignable  au moins une partie a répondu, pas toutes
--   joignable                toutes les parties ont répondu
--
-- Une partie « a répondu » quand confirme_le est renseigné et qu'elle a donné
-- son consentement RGPD, ou qu'elle a refusé (choix = 'refuse').
--
-- Quand toutes les parties ont répondu et qu'au moins 2 n'ont pas refusé, la
-- base réserve le premier créneau à venir du médiateur choisi par TOUTES les
-- parties qui n'ont pas refusé. Un rendez-vous fixé n'est jamais modifié.
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
  v_nb_repondu integer;
  v_nb_participants integer;
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
    count(*) filter (
      where p.confirme_le is not null and (p.consentement_rgpd or p.choix = 'refuse')
    ),
    count(*) filter (where p.choix is distinct from 'refuse')
  into v_nb_parties, v_nb_repondu, v_nb_participants
  from public.parties p
  where p.dossier_id = p_dossier_id;

  v_creneau_id := v_dossier.rdv_creneau_id;

  if v_creneau_id is null
    and v_nb_parties > 0
    and v_nb_repondu = v_nb_parties
    and v_nb_participants >= 2
  then
    select c.id into v_creneau_id
    from public.creneaux c
    join public.disponibilites d on d.creneau_id = c.id
    join public.parties p on p.id = d.partie_id
    where p.dossier_id = p_dossier_id
      and p.choix is distinct from 'refuse'
      and c.mediateur_id = v_dossier.mediateur_id
      and c.debut > now()
      and not exists (
        select 1 from public.dossiers autre where autre.rdv_creneau_id = c.id
      )
    group by c.id, c.debut
    having count(distinct d.partie_id) = v_nb_participants
    order by c.debut
    limit 1;
  end if;

  v_statut := case
    when v_creneau_id is not null then 'rdv_fixe'
    when v_nb_repondu = 0 then 'en_attente'
    when v_nb_repondu < v_nb_parties then 'partiellement_joignable'
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

-- Les déclencheurs existants (parties, disponibilites) appellent déjà cette
-- fonction : rien d'autre à changer.

-- -----------------------------------------------------------------------------
-- Événements automatiques
-- Chaque événement est daté de l'action elle-même (création du dossier, date de
-- réponse de la partie) pour que la timeline reste dans l'ordre.
-- -----------------------------------------------------------------------------

-- Création du dossier → « Ordonnance enregistrée »
create or replace function public.evenement_dossier_cree()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.evenements (dossier_id, type, libelle, acteur, details, created_at)
  values (
    new.id, 'ordonnance', 'Ordonnance enregistrée', 'juridiction',
    jsonb_build_object('numero_rg', new.numero_rg, 'mode', new.mode),
    new.created_at
  );
  return null;
end;
$$;

create trigger dossiers_evenement_creation
  after insert on public.dossiers
  for each row execute function public.evenement_dossier_cree();

-- Rendez-vous fixé, changement d'issue, compte rendu
create or replace function public.evenements_dossier_modifie()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_debut timestamptz;
begin
  if new.rdv_creneau_id is not null and new.rdv_creneau_id is distinct from old.rdv_creneau_id then
    select debut into v_debut from public.creneaux where id = new.rdv_creneau_id;
    insert into public.evenements (dossier_id, type, libelle, acteur, details)
    values (
      new.id, 'rdv_fixe',
      'Premier rendez-vous fixé le '
        || to_char(v_debut at time zone 'Indian/Reunion', 'DD/MM/YYYY "à" HH24"h"MI'),
      'systeme',
      jsonb_build_object('creneau_id', new.rdv_creneau_id, 'debut', v_debut)
    );
  end if;

  if new.issue is distinct from old.issue then
    insert into public.evenements (dossier_id, type, libelle, acteur, details)
    values (
      new.id, 'issue',
      'Issue : ' || case new.issue
        when 'en_cours' then 'en cours'
        when 'accord_total' then 'accord total'
        when 'accord_partiel' then 'accord partiel'
        when 'echec' then 'échec'
        when 'carence' then 'carence'
        when 'refus' then 'refus'
      end,
      'mediateur',
      jsonb_build_object('avant', old.issue, 'apres', new.issue)
    );
  end if;

  if coalesce(new.compte_rendu, '') <> '' and new.compte_rendu is distinct from old.compte_rendu then
    insert into public.evenements (dossier_id, type, libelle, acteur)
    values (
      new.id, 'compte_rendu',
      case when coalesce(old.compte_rendu, '') = '' then 'Compte rendu ajouté' else 'Compte rendu modifié' end,
      'mediateur'
    );
  end if;

  return null;
end;
$$;

create trigger dossiers_evenements
  after update on public.dossiers
  for each row execute function public.evenements_dossier_modifie();

-- Réponse ou refus d'une partie (y compris via son avocat)
create or replace function public.evenement_reponse_partie()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- En INSERT, old vaut null
  v_vient_de_refuser boolean :=
    new.choix = 'refuse' and (tg_op = 'INSERT' or old.choix is distinct from 'refuse');
  v_vient_de_repondre boolean :=
    new.confirme_le is not null and (tg_op = 'INSERT' or old.confirme_le is null);
  v_nom text := new.prenom || ' ' || new.nom;
  v_acteur text := case when new.rempli_par = 'avocat' then 'avocat' else 'partie' end;
  v_mode public.mode_amiable;
begin
  if v_vient_de_refuser then
    select mode into v_mode from public.dossiers where id = new.dossier_id;
    insert into public.evenements (dossier_id, type, libelle, acteur, details, created_at)
    values (
      new.dossier_id, 'refus',
      v_nom || ' refuse la ' || case v_mode when 'conciliation' then 'conciliation' else 'médiation' end,
      v_acteur,
      jsonb_build_object('partie_id', new.id),
      coalesce(new.confirme_le, now())
    );
  elsif v_vient_de_repondre then
    insert into public.evenements (dossier_id, type, libelle, acteur, details, created_at)
    values (
      new.dossier_id, 'reponse',
      v_nom || ' a transmis ses coordonnées'
        || case when new.rempli_par = 'avocat' then ' via son avocat' else '' end,
      v_acteur,
      jsonb_build_object('partie_id', new.id, 'choix', new.choix),
      new.confirme_le
    );
  end if;
  return null;
end;
$$;

-- Nom choisi pour passer avant parties_recalculer_statut (ordre alphabétique)
create trigger parties_evenement_reponse
  after insert or update on public.parties
  for each row execute function public.evenement_reponse_partie();

revoke execute on function public.evenement_dossier_cree() from public, anon, authenticated;
revoke execute on function public.evenements_dossier_modifie() from public, anon, authenticated;
revoke execute on function public.evenement_reponse_partie() from public, anon, authenticated;
