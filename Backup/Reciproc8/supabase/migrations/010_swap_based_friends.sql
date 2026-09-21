-- Friends are derived from Accepted swap requests. No separate friendship
-- table is needed, so accepted swaps remain the source of truth.
drop trigger if exists create_friendship_after_accept on public.swap_requests;
drop function if exists public.create_friendship_after_accept();
drop table if exists public.friendships;
drop sequence if exists public.friendship_sequence;

create or replace function public.can_view_accepted_profile(target_profile_id varchar)
returns boolean
language sql
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.profiles viewer
    join public.swap_requests sr
      on sr.status = 'Accepted'
     and ((sr.sender_id = viewer.id and sr.receiver_id = target_profile_id)
       or (sr.receiver_id = viewer.id and sr.sender_id = target_profile_id))
    where viewer.auth_id = auth.uid()
  );
$function$;

revoke all on function public.can_view_accepted_profile(varchar) from public;
grant execute on function public.can_view_accepted_profile(varchar) to authenticated;

drop policy if exists "accepted swap participants can view profiles" on public.profiles;
create policy "accepted swap participants can view profiles"
  on public.profiles for select to authenticated
  using (
    auth_id = auth.uid()
    or public.can_view_accepted_profile(id)
  );

drop policy if exists "accepted swap participants can view skills" on public.user_skills;
create policy "accepted swap participants can view skills"
  on public.user_skills for select to authenticated
  using (
    public.can_view_accepted_profile(profile_id)
    or exists (
      select 1 from public.profiles owner
      where owner.id = user_skills.profile_id and owner.auth_id = auth.uid()
    )
  );
