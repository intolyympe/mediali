-- =============================================================================
-- Vide les données métier, à coller dans l'éditeur SQL de Supabase AVANT le
-- contenu de seed.sql pour remettre la démo à zéro.
-- Ne touche pas aux comptes (auth.users) ni aux médiateurs.
-- =============================================================================

delete from public.evenements;
delete from public.disponibilites;
delete from public.parties;
delete from public.dossiers;
delete from public.creneaux;
