-- 2026-10-13: remove PostGIS (never used).
-- Why: Supabase security advisor flagged public.spatial_ref_sys (PostGIS's
-- coordinate-system table) as "RLS disabled in public". That table is owned by
-- supabase_admin, so RLS can't be enabled and anon write grants can't be revoked
-- from the postgres role. claims.geom was the only PostGIS column and is empty
-- (0 of 546 rows on 13 Oct); no app or script code reads it.
-- Also clears the st_estimatedextent SECURITY DEFINER and extension_in_public warnings.
begin;
set local lock_timeout = '10s';
drop view public.current_claims;
drop index if exists public.claims_geom;
alter table public.claims drop column geom;
create view public.current_claims with (security_invoker = true) as
  select id, ballot_paper_id, candidate_id, party_ec_id, topic, tier, claim_text,
         source_id, source_quote, applies_if, status, supersedes, drafted_by,
         created_at, "precision"
  from public.claims c
  where not exists (select 1 from public.claims n where n.supersedes = c.id);
drop extension postgis;
commit;
