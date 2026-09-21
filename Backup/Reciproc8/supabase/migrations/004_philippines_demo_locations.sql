-- RECIPROC8 demo data: move the existing sample profiles to Metro Manila.
-- Run after 003_phase3_matching_postgis.sql.

update public.profiles
set
  zip_code = case id
    when 'P-20260915-001' then '1000'
    when 'P-20260915-002' then '1100'
    when 'P-20260915-003' then '1200'
    when 'P-20260915-004' then '1300'
    when 'P-20260915-005' then '1400'
    when 'P-20260915-006' then '1500'
    when 'P-20260915-007' then '1600'
    when 'P-20260915-008' then '1700'
    when 'P-20260915-009' then '1800'
    when 'P-20260915-010' then '1900'
    else zip_code
  end
where id like 'P-20260915-%';

insert into public.profile_locations (profile_id, point)
values
  ('P-20260915-001', extensions.st_setsrid(extensions.st_makepoint(120.9842, 14.5995), 4326)::extensions.geography),
  ('P-20260915-002', extensions.st_setsrid(extensions.st_makepoint(121.0000, 14.6760), 4326)::extensions.geography),
  ('P-20260915-003', extensions.st_setsrid(extensions.st_makepoint(120.9822, 14.5547), 4326)::extensions.geography),
  ('P-20260915-004', extensions.st_setsrid(extensions.st_makepoint(121.0560, 14.6091), 4326)::extensions.geography),
  ('P-20260915-005', extensions.st_setsrid(extensions.st_makepoint(120.9820, 14.6042), 4326)::extensions.geography),
  ('P-20260915-006', extensions.st_setsrid(extensions.st_makepoint(121.0223, 14.6178), 4326)::extensions.geography),
  ('P-20260915-007', extensions.st_setsrid(extensions.st_makepoint(121.0437, 14.6760), 4326)::extensions.geography),
  ('P-20260915-008', extensions.st_setsrid(extensions.st_makepoint(120.9939, 14.5378), 4326)::extensions.geography),
  ('P-20260915-009', extensions.st_setsrid(extensions.st_makepoint(121.0614, 14.6507), 4326)::extensions.geography),
  ('P-20260915-010', extensions.st_setsrid(extensions.st_makepoint(121.0223, 14.6178), 4326)::extensions.geography)
on conflict (profile_id)
do update set
  point = excluded.point,
  updated_at = now();
