-- Enable UUID generation extension
create extension if not exists "uuid-ossp";

-- Patients table
create table if not exists public.patients (
  id uuid primary key default uuid_generate_v4(),
  hn_number text not null unique,
  name text not null,
  age integer not null check (age >= 0 and age <= 130),
  sex text not null check (sex in ('Male', 'Female', 'Other')),
  height_cm double precision not null check (height_cm > 0),
  created_at timestamptz not null default now()
);

-- Scans table
create table if not exists public.scans (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  scan_date timestamptz not null default now(),

  -- Mandatory smart-scale metrics
  weight_kg double precision not null check (weight_kg >= 0),
  bmi double precision not null check (bmi >= 0),
  body_fat_percent double precision not null check (body_fat_percent >= 0),
  body_fat_kg double precision not null check (body_fat_kg >= 0),
  subcutaneous_fat_total_percent double precision not null check (subcutaneous_fat_total_percent >= 0),
  subcutaneous_fat_arms_percent double precision not null check (subcutaneous_fat_arms_percent >= 0),
  subcutaneous_fat_trunk_percent double precision not null check (subcutaneous_fat_trunk_percent >= 0),
  subcutaneous_fat_legs_percent double precision not null check (subcutaneous_fat_legs_percent >= 0),
  skeletal_muscle_total_percent double precision not null check (skeletal_muscle_total_percent >= 0),
  skeletal_muscle_total_kg double precision not null check (skeletal_muscle_total_kg >= 0),
  skeletal_muscle_arms_percent double precision not null check (skeletal_muscle_arms_percent >= 0),
  skeletal_muscle_trunk_percent double precision not null check (skeletal_muscle_trunk_percent >= 0),
  skeletal_muscle_legs_percent double precision not null check (skeletal_muscle_legs_percent >= 0),
  visceral_fat_level integer not null check (visceral_fat_level >= 0),
  resting_metabolism_kcal integer not null check (resting_metabolism_kcal >= 0),
  body_age_years integer not null check (body_age_years >= 0),

  -- Optional clinical metrics
  total_body_water_l double precision,
  protein_kg double precision,
  minerals_kg double precision,
  waist_circumference_cm double precision,
  hip_circumference_cm double precision,
  daily_activity_limitation text check (daily_activity_limitation in ('None', 'Mild', 'Moderate', 'Severe')),
  breathlessness_symptom boolean,
  joint_pain_mobility_limitation boolean,
  organ_dysfunction_signs boolean,
  obesity_related_dysfunction boolean,
  report_note text,

  created_at timestamptz not null default now()
);

create index if not exists idx_scans_patient_id on public.scans(patient_id);
create index if not exists idx_scans_scan_date on public.scans(scan_date desc);

alter table public.patients enable row level security;
alter table public.scans enable row level security;

-- Replace auth.uid() ownership logic with your own tenancy model if needed.
create policy "authenticated_select_patients"
  on public.patients
  for select
  to authenticated
  using (true);

create policy "authenticated_insert_patients"
  on public.patients
  for insert
  to authenticated
  with check (true);

create policy "authenticated_update_patients"
  on public.patients
  for update
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_delete_patients"
  on public.patients
  for delete
  to authenticated
  using (true);

create policy "authenticated_select_scans"
  on public.scans
  for select
  to authenticated
  using (true);

create policy "authenticated_insert_scans"
  on public.scans
  for insert
  to authenticated
  with check (true);

create policy "authenticated_update_scans"
  on public.scans
  for update
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_delete_scans"
  on public.scans
  for delete
  to authenticated
  using (true);

-- Migration helper (run for existing databases created before report_note was added):
alter table public.scans
  add column if not exists report_note text;

alter table public.scans
  add column if not exists waist_circumference_cm double precision,
  add column if not exists hip_circumference_cm double precision,
  add column if not exists daily_activity_limitation text,
  add column if not exists breathlessness_symptom boolean,
  add column if not exists joint_pain_mobility_limitation boolean,
  add column if not exists organ_dysfunction_signs boolean,
  add column if not exists obesity_related_dysfunction boolean;

alter table public.scans
  drop constraint if exists scans_daily_activity_limitation_check;

alter table public.scans
  add constraint scans_daily_activity_limitation_check
  check (daily_activity_limitation in ('None', 'Mild', 'Moderate', 'Severe'));
