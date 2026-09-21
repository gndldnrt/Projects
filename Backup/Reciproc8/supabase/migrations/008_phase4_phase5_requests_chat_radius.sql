-- Phase 4/5: swap approvals, authorization-gated chat, and radius filtering.
create extension if not exists pgcrypto;

do $$
begin
  create type public.swap_request_status as enum ('Pending', 'Accepted', 'Declined');
exception
  when duplicate_object then null;
end
$$;

create sequence if not exists public.swap_request_sequence;

create table if not exists public.swap_requests (
  id varchar primary key default (
    'SW-' || to_char(current_date, 'YYYYMMDD') || '-' ||
    lpad(nextval('public.swap_request_sequence')::text, 3, '0')
  ),
  sender_id varchar not null references public.profiles(id) on delete cascade,
  receiver_id varchar not null references public.profiles(id) on delete cascade,
  status public.swap_request_status not null default 'Pending',
  created_at timestamptz not null default now(),
  constraint swap_requests_distinct_users check (sender_id <> receiver_id)
);

alter table public.swap_requests enable row level security;

create index if not exists swap_requests_sender_idx on public.swap_requests(sender_id);
create index if not exists swap_requests_receiver_idx on public.swap_requests(receiver_id);

create or replace function public.prevent_swap_request_identity_change()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if new.sender_id <> old.sender_id or new.receiver_id <> old.receiver_id
     or old.status <> 'Pending' then
    raise exception 'swap request participants and completed status cannot be changed';
  end if;
  return new;
end;
$function$;

drop trigger if exists protect_swap_request_identity on public.swap_requests;
create trigger protect_swap_request_identity
before update on public.swap_requests
for each row execute function public.prevent_swap_request_identity_change();

drop policy if exists "participants can view swap requests" on public.swap_requests;
create policy "participants can view swap requests"
  on public.swap_requests for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.auth_id = auth.uid()
        and (p.id = sender_id or p.id = receiver_id)
    )
  );

drop policy if exists "profiles can send swap requests" on public.swap_requests;
create policy "profiles can send swap requests"
  on public.swap_requests for insert to authenticated
  with check (
    sender_id <> receiver_id
    and exists (
      select 1 from public.profiles p
      where p.id = sender_id and p.auth_id = auth.uid()
    )
  );

drop policy if exists "receivers can approve swap requests" on public.swap_requests;
create policy "receivers can approve swap requests"
  on public.swap_requests for update to authenticated
  using (
    status = 'Pending'
    and
    exists (
      select 1 from public.profiles p
      where p.id = receiver_id and p.auth_id = auth.uid()
    )
  )
  with check (
    status in ('Accepted', 'Declined')
    and exists (
      select 1 from public.profiles p
      where p.id = receiver_id and p.auth_id = auth.uid()
    )
  );

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  swap_request_id varchar not null references public.swap_requests(id) on delete cascade,
  sender_id varchar not null references public.profiles(id) on delete cascade,
  receiver_id varchar not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  constraint messages_distinct_users check (sender_id <> receiver_id)
);

alter table public.messages enable row level security;
create index if not exists messages_swap_request_idx on public.messages(swap_request_id, created_at);

drop policy if exists "accepted participants can view messages" on public.messages;
create policy "accepted participants can view messages"
  on public.messages for select to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      join public.swap_requests sr
        on sr.id = messages.swap_request_id
       and sr.status = 'Accepted'
       and ((sr.sender_id = messages.sender_id and sr.receiver_id = messages.receiver_id)
         or (sr.sender_id = messages.receiver_id and sr.receiver_id = messages.sender_id))
      where p.auth_id = auth.uid()
        and (p.id = messages.sender_id or p.id = messages.receiver_id)
    )
  );

drop policy if exists "accepted participants can send messages" on public.messages;
create policy "accepted participants can send messages"
  on public.messages for insert to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      join public.swap_requests sr
        on sr.id = messages.swap_request_id
       and sr.status = 'Accepted'
       and ((sr.sender_id = messages.sender_id and sr.receiver_id = messages.receiver_id)
         or (sr.sender_id = messages.receiver_id and sr.receiver_id = messages.sender_id))
      where p.auth_id = auth.uid()
        and p.id = messages.sender_id
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.swap_requests;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end
$$;

create or replace function public.find_profiles_within_radius(
  p_profile_id varchar,
  p_radius_miles integer default 25
)
returns table (
  profile_id varchar,
  full_name text,
  bio text,
  zip_code varchar,
  distance_miles double precision,
  user_skills jsonb
)
language sql
security definer
set search_path = public, extensions
as $function$
  select
    candidate.id,
    candidate.full_name,
    candidate.bio,
    candidate.zip_code,
    round((extensions.st_distance(origin.point, location.point) / 1609.344)::numeric, 2)::double precision,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', us.id,
        'skill_id', us.skill_id,
        'skill_type', us.skill_type,
        'experience_level', us.experience_level,
        'name', s.name
      ) order by s.name)
      from public.user_skills us
      join public.skills s on s.id = us.skill_id
      where us.profile_id = candidate.id
    ), '[]'::jsonb)
  from public.profiles viewer
  join public.profile_locations origin on origin.profile_id = viewer.id
  join public.profile_locations location on true
  join public.profiles candidate on candidate.id = location.profile_id
  where viewer.id = p_profile_id
    and viewer.auth_id = auth.uid()
    and candidate.id <> viewer.id
    and p_radius_miles in (5, 10, 25)
    and extensions.st_dwithin(origin.point, location.point, p_radius_miles * 1609.344)
  order by 5;
$function$;

revoke all on function public.find_profiles_within_radius(varchar, integer) from public;
grant execute on function public.find_profiles_within_radius(varchar, integer) to authenticated;
