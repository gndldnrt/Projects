-- Seed 20 visible, non-authenticated Philippine profiles for local development.
-- Run after migrations 003, 004, 005, and 006.
-- These records intentionally have auth_id = NULL: they are display-only sample
-- accounts and cannot be used to sign in.

insert into public.skills (name, category)
select seed.name, seed.category
from (values
  ('Photography', 'Creative'),
  ('Guitar', 'Music'),
  ('Baking', 'Food'),
  ('Gardening', 'Nature'),
  ('Drawing', 'Creative'),
  ('Coding', 'Technology'),
  ('Yoga', 'Wellness'),
  ('Woodworking', 'Making'),
  ('Cooking', 'Food'),
  ('Painting', 'Creative')
) as seed(name, category)
where not exists (
  select 1 from public.skills existing where lower(existing.name) = lower(seed.name)
);

insert into public.profiles (id, auth_id, full_name, email, bio, zip_code, created_at)
values
  ('P-20260917-101', null, 'Ana Reyes', 'ana.reyes.demo@reciproc8.local', 'Street photographer exploring portraits and film cameras.', '1000', now()),
  ('P-20260917-102', null, 'Marco Santos', 'marco.santos.demo@reciproc8.local', 'Home baker who enjoys teaching sourdough basics.', '1001', now()),
  ('P-20260917-103', null, 'Lia Cruz', 'lia.cruz.demo@reciproc8.local', 'Beginner gardener growing herbs in a small city balcony.', '1002', now()),
  ('P-20260917-104', null, 'Paolo Garcia', 'paolo.garcia.demo@reciproc8.local', 'Guitar player looking to trade music lessons for coding help.', '1003', now()),
  ('P-20260917-105', null, 'Bea Torres', 'bea.torres.demo@reciproc8.local', 'Watercolor hobbyist and weekend sketcher.', '1004', now()),
  ('P-20260917-106', null, 'Nico Flores', 'nico.flores.demo@reciproc8.local', 'Frontend developer learning food photography.', '1005', now()),
  ('P-20260917-107', null, 'Mia Navarro', 'mia.navarro.demo@reciproc8.local', 'Yoga learner and casual home cook.', '1006', now()),
  ('P-20260917-108', null, 'Carlo Mendoza', 'carlo.mendoza.demo@reciproc8.local', 'Woodworker making practical furniture for small spaces.', '1007', now()),
  ('P-20260917-109', null, 'Sofia Aquino', 'sofia.aquino.demo@reciproc8.local', 'Baker and aspiring watercolor painter.', '1008', now()),
  ('P-20260917-110', null, 'Enzo Rivera', 'enzo.rivera.demo@reciproc8.local', 'Teaching beginner Python and learning guitar.', '1009', now()),
  ('P-20260917-111', null, 'Ivy Castillo', 'ivy.castillo.demo@reciproc8.local', 'Plant parent interested in sustainable urban gardening.', '1010', now()),
  ('P-20260917-112', null, 'Jules Ramos', 'jules.ramos.demo@reciproc8.local', 'Portrait artist looking for creative collaborators.', '1011', now()),
  ('P-20260917-113', null, 'Rina Bautista', 'rina.bautista.demo@reciproc8.local', 'Home cook who wants to learn food styling and photography.', '1012', now()),
  ('P-20260917-114', null, 'Theo Villanueva', 'theo.villanueva.demo@reciproc8.local', 'DIY maker learning woodworking and basic design.', '1013', now()),
  ('P-20260917-115', null, 'Kara Domingo', 'kara.domingo.demo@reciproc8.local', 'Yoga instructor who enjoys helping beginners build a habit.', '1014', now()),
  ('P-20260917-116', null, 'Luis Santiago', 'luis.santiago.demo@reciproc8.local', 'Amateur guitarist and weekend street photographer.', '1015', now()),
  ('P-20260917-117', null, 'Nina Valdez', 'nina.valdez.demo@reciproc8.local', 'Learning to code while sharing easy recipes with friends.', '1016', now()),
  ('P-20260917-118', null, 'Gio Mercado', 'gio.mercado.demo@reciproc8.local', 'Painter interested in exchanging lessons with local makers.', '1017', now()),
  ('P-20260917-119', null, 'Ella Padilla', 'ella.padilla.demo@reciproc8.local', 'Gardener and beginner baker looking for nearby mentors.', '1018', now()),
  ('P-20260917-120', null, 'Sam Ocampo', 'sam.ocampo.demo@reciproc8.local', 'Curious maker learning photography, coding, and woodworking.', '1019', now())
on conflict (id) do update set
  auth_id = excluded.auth_id,
  full_name = excluded.full_name,
  email = excluded.email,
  bio = excluded.bio,
  zip_code = excluded.zip_code;

do $$
declare
  seeded_profile_count integer;
begin
  select count(*)
    into seeded_profile_count
  from public.profiles
  where id like 'P-20260917-%';

  if seeded_profile_count <> 20 then
    raise exception 'Expected 20 seeded profiles, found %; verify the public.profiles schema and rerun this migration', seeded_profile_count;
  end if;
end
$$;

delete from public.user_skills
where profile_id between 'P-20260917-101' and 'P-20260917-120';

insert into public.user_skills (id, profile_id, skill_id, skill_type, experience_level)
select
  seed.mapping_id,
  seed.profile_id,
  skills.id,
  seed.skill_type,
  seed.experience_level
from (values
  ('US-20260917-101', 'P-20260917-101', 'Photography', 'teach', 'advanced'),
  ('US-20260917-102', 'P-20260917-101', 'Drawing', 'learn', 'beginner'),
  ('US-20260917-103', 'P-20260917-102', 'Baking', 'teach', 'advanced'),
  ('US-20260917-104', 'P-20260917-102', 'Cooking', 'learn', 'intermediate'),
  ('US-20260917-105', 'P-20260917-103', 'Gardening', 'teach', 'intermediate'),
  ('US-20260917-106', 'P-20260917-103', 'Yoga', 'learn', 'beginner'),
  ('US-20260917-107', 'P-20260917-104', 'Guitar', 'teach', 'advanced'),
  ('US-20260917-108', 'P-20260917-104', 'Coding', 'learn', 'beginner'),
  ('US-20260917-109', 'P-20260917-105', 'Drawing', 'teach', 'intermediate'),
  ('US-20260917-110', 'P-20260917-105', 'Painting', 'learn', 'beginner'),
  ('US-20260917-111', 'P-20260917-106', 'Coding', 'teach', 'advanced'),
  ('US-20260917-112', 'P-20260917-106', 'Photography', 'learn', 'beginner'),
  ('US-20260917-113', 'P-20260917-107', 'Yoga', 'teach', 'advanced'),
  ('US-20260917-114', 'P-20260917-107', 'Cooking', 'learn', 'intermediate'),
  ('US-20260917-115', 'P-20260917-108', 'Woodworking', 'teach', 'advanced'),
  ('US-20260917-116', 'P-20260917-108', 'Drawing', 'learn', 'beginner'),
  ('US-20260917-117', 'P-20260917-109', 'Baking', 'teach', 'intermediate'),
  ('US-20260917-118', 'P-20260917-109', 'Painting', 'teach', 'beginner'),
  ('US-20260917-119', 'P-20260917-110', 'Coding', 'teach', 'intermediate'),
  ('US-20260917-120', 'P-20260917-110', 'Guitar', 'learn', 'beginner'),
  ('US-20260917-121', 'P-20260917-111', 'Gardening', 'teach', 'advanced'),
  ('US-20260917-122', 'P-20260917-111', 'Cooking', 'learn', 'beginner'),
  ('US-20260917-123', 'P-20260917-112', 'Painting', 'teach', 'advanced'),
  ('US-20260917-124', 'P-20260917-112', 'Photography', 'learn', 'intermediate'),
  ('US-20260917-125', 'P-20260917-113', 'Cooking', 'teach', 'advanced'),
  ('US-20260917-126', 'P-20260917-113', 'Photography', 'learn', 'beginner'),
  ('US-20260917-127', 'P-20260917-114', 'Woodworking', 'teach', 'intermediate'),
  ('US-20260917-128', 'P-20260917-114', 'Coding', 'learn', 'beginner'),
  ('US-20260917-129', 'P-20260917-115', 'Yoga', 'teach', 'advanced'),
  ('US-20260917-130', 'P-20260917-115', 'Gardening', 'learn', 'beginner'),
  ('US-20260917-131', 'P-20260917-116', 'Guitar', 'teach', 'intermediate'),
  ('US-20260917-132', 'P-20260917-116', 'Photography', 'learn', 'beginner'),
  ('US-20260917-133', 'P-20260917-117', 'Coding', 'learn', 'beginner'),
  ('US-20260917-134', 'P-20260917-117', 'Cooking', 'teach', 'intermediate'),
  ('US-20260917-135', 'P-20260917-118', 'Painting', 'teach', 'intermediate'),
  ('US-20260917-136', 'P-20260917-118', 'Woodworking', 'learn', 'beginner'),
  ('US-20260917-137', 'P-20260917-119', 'Gardening', 'teach', 'beginner'),
  ('US-20260917-138', 'P-20260917-119', 'Baking', 'learn', 'beginner'),
  ('US-20260917-139', 'P-20260917-120', 'Photography', 'teach', 'intermediate'),
  ('US-20260917-140', 'P-20260917-120', 'Woodworking', 'learn', 'beginner')
) as seed(mapping_id, profile_id, skill_name, skill_type, experience_level)
join public.profiles profiles
 on profiles.id = seed.profile_id
join public.skills skills
 on lower(skills.name) = lower(seed.skill_name);

insert into public.profile_locations (profile_id, point)
select
  seed.profile_id,
  extensions.st_setsrid(extensions.st_makepoint(seed.longitude, seed.latitude), 4326)::extensions.geography
from (values
  ('P-20260917-101', 120.9842::double precision, 14.5995::double precision),
  ('P-20260917-102', 120.9822, 14.6042),
  ('P-20260917-103', 120.9939, 14.6042),
  ('P-20260917-104', 121.0000, 14.6760),
  ('P-20260917-105', 121.0223, 14.6178),
  ('P-20260917-106', 121.0437, 14.6760),
  ('P-20260917-107', 120.9820, 14.5547),
  ('P-20260917-108', 121.0560, 14.6091),
  ('P-20260917-109', 121.0614, 14.6507),
  ('P-20260917-110', 121.0223, 14.6178),
  ('P-20260917-111', 120.9842, 14.5995),
  ('P-20260917-112', 121.0000, 14.6760),
  ('P-20260917-113', 120.9822, 14.5547),
  ('P-20260917-114', 121.0437, 14.6760),
  ('P-20260917-115', 121.0560, 14.6091),
  ('P-20260917-116', 120.9939, 14.5378),
  ('P-20260917-117', 121.0614, 14.6507),
  ('P-20260917-118', 121.0223, 14.6178),
  ('P-20260917-119', 120.9820, 14.6042),
  ('P-20260917-120', 120.9842, 14.5995)
) as seed(profile_id, longitude, latitude)
join public.profiles profiles
  on profiles.id = seed.profile_id
on conflict (profile_id) do update set
  point = excluded.point,
  updated_at = now();
