-- Philippine postal codes are four numeric characters.
update public.profiles
set zip_code = lpad(regexp_replace(zip_code, '[^0-9]', '', 'g'), 4, '0')
where zip_code is not null
  and zip_code !~ '^[0-9]{4}$';

alter table public.profiles
  drop constraint if exists profiles_zip_code_philippines_check;

alter table public.profiles
  add constraint profiles_zip_code_philippines_check
  check (zip_code ~ '^[0-9]{4}$');
