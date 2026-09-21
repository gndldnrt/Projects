-- Profile editing, accepted-swap friendships, and removal of only the seeded demo data.
create sequence if not exists public.friendship_sequence;

create table if not exists public.friendships (
  id varchar primary key default (
    'FR-' || to_char(current_date, 'YYYYMMDD') || '-' ||
    lpad(nextval('public.friendship_sequence')::text, 3, '0')
  ),
  profile_id varchar not null references public.profiles(id) on delete cascade,
  friend_id varchar not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint friendships_distinct_profiles check (profile_id <> friend_id),
  constraint friendships_unique_pair unique (profile_id, friend_id)
);

alter table public.friendships enable row level security;

drop policy if exists "profiles can manage own skill mappings" on public.user_skills;
create policy "profiles can manage own skill mappings"
  on public.user_skills for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.auth_id = auth.uid()))
  with check (exists (select 1 from public.profiles p where p.id = profile_id and p.auth_id = auth.uid()));

drop policy if exists "friends can view friendship rows" on public.friendships;
create policy "friends can view friendship rows"
  on public.friendships for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.auth_id = auth.uid()
        and (p.id = profile_id or p.id = friend_id)
    )
  );

create or replace function public.create_friendship_after_accept()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if new.status = 'Accepted' and old.status is distinct from 'Accepted' then
    insert into public.friendships (profile_id, friend_id)
    values (new.sender_id, new.receiver_id), (new.receiver_id, new.sender_id)
    on conflict (profile_id, friend_id) do nothing;
  end if;
  return new;
end;
$function$;

drop trigger if exists create_friendship_after_accept on public.swap_requests;
create trigger create_friendship_after_accept
after update of status on public.swap_requests
for each row execute function public.create_friendship_after_accept();

-- Safe cleanup: only records created by migration 007 are removed.
delete from public.profile_locations
where profile_id like 'P-20260917-%';

delete from public.user_skills
where profile_id like 'P-20260917-%';

delete from public.profiles
where id like 'P-20260917-%'
  and auth_id is null;

-- Keep the existing Leaflet/PostGIS map usable for new profiles. This is a
-- privacy-safe Metro Manila fallback point, not an exact address.
create or replace function public.ensure_profile_map_location()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $function$
begin
  insert into public.profile_locations (profile_id, point)
  values (
    new.id,
    extensions.st_setsrid(extensions.st_makepoint(120.9842, 14.5995), 4326)::extensions.geography
  )
  on conflict (profile_id) do nothing;
  return new;
end;
$function$;

drop trigger if exists ensure_profile_map_location on public.profiles;
create trigger ensure_profile_map_location
after insert on public.profiles
for each row execute function public.ensure_profile_map_location();

insert into public.profile_locations (profile_id, point)
select
  p.id,
  extensions.st_setsrid(extensions.st_makepoint(120.9842, 14.5995), 4326)::extensions.geography
from public.profiles p
where not exists (
  select 1 from public.profile_locations pl where pl.profile_id = p.id
)
on conflict (profile_id) do nothing;
