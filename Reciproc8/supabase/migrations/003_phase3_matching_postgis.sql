-- RECIPROC8 Phase 3: PostGIS matching and privacy-safe map points.
-- Run this entire file in Supabase SQL Editor as one migration.

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

create table if not exists public.profile_locations (
  profile_id varchar primary key references public.profiles(id) on delete cascade,
  point extensions.geography(point, 4326) not null,
  updated_at timestamptz not null default now()
);

alter table public.profile_locations enable row level security;

drop policy if exists "profiles can manage own location" on public.profile_locations;
create policy "profiles can manage own location"
  on public.profile_locations
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = profile_locations.profile_id
        and p.auth_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = profile_locations.profile_id
        and p.auth_id = auth.uid()
    )
  );

drop function if exists public.find_profile_matches(varchar, integer);

create or replace function public.find_profile_matches(
  p_profile_id varchar,
  p_radius_miles integer default 25
)
returns table (
  profile_id varchar,
  full_name text,
  bio text,
  distance_miles double precision,
  latitude double precision,
  longitude double precision,
  match_type text,
  matched_teach_skill_ids integer[],
  matched_learn_skill_ids integer[]
)
language sql
security definer
set search_path = public, extensions
as $function$
  with authorized_viewer as (
    select p.id
    from public.profiles p
    where p.id = p_profile_id
      and p.auth_id = auth.uid()
    limit 1
  ),
  candidates as (
    select
      p.id,
      p.full_name,
      p.bio,
      pl.point,
      extensions.st_distance(viewer_location.point, pl.point) / 1609.344 as distance_miles
    from authorized_viewer av
    join public.profile_locations viewer_location
      on viewer_location.profile_id = av.id
    join public.profiles p
      on p.id <> av.id
    join public.profile_locations pl
      on pl.profile_id = p.id
    where p_radius_miles between 1 and 100
      and extensions.st_dwithin(
        viewer_location.point,
        pl.point,
        p_radius_miles::double precision * 1609.344
      )
  ),
  match_rows as (
    select
      c.*,
      coalesce((
        select array_agg(distinct current_skill.skill_id order by current_skill.skill_id)
        from public.user_skills current_skill
        where current_skill.profile_id = p_profile_id
          and current_skill.skill_type = 'teach'
          and exists (
            select 1
            from public.user_skills candidate_skill
            where candidate_skill.profile_id = c.id
              and candidate_skill.skill_type = 'learn'
              and candidate_skill.skill_id = current_skill.skill_id
          )
      ), '{}'::integer[]) as teach_matches,
      coalesce((
        select array_agg(distinct current_skill.skill_id order by current_skill.skill_id)
        from public.user_skills current_skill
        where current_skill.profile_id = p_profile_id
          and current_skill.skill_type = 'learn'
          and exists (
            select 1
            from public.user_skills candidate_skill
            where candidate_skill.profile_id = c.id
              and candidate_skill.skill_type = 'teach'
              and candidate_skill.skill_id = current_skill.skill_id
          )
      ), '{}'::integer[]) as learn_matches
    from candidates c
  ),
  obfuscated as (
    select
      o.*,
      extensions.st_project(
        o.point,
        200 + random() * 300,
        random() * 2 * pi()
      ) as shifted_point
    from match_rows o
    where cardinality(o.teach_matches) > 0
       or cardinality(o.learn_matches) > 0
  )
  select
    o.id,
    o.full_name,
    o.bio,
    round(o.distance_miles::numeric, 2)::double precision,
    extensions.st_y(o.shifted_point::geometry)::double precision,
    extensions.st_x(o.shifted_point::geometry)::double precision,
    case
      when cardinality(o.teach_matches) > 0
       and cardinality(o.learn_matches) > 0
        then 'mutual'
      else 'partial'
    end,
    o.teach_matches,
    o.learn_matches
  from obfuscated o
  order by
    case
      when cardinality(o.teach_matches) > 0
       and cardinality(o.learn_matches) > 0
        then 0
      else 1
    end,
    o.distance_miles;
$function$;

revoke all on function public.find_profile_matches(varchar, integer) from public;
grant execute on function public.find_profile_matches(varchar, integer) to authenticated;
