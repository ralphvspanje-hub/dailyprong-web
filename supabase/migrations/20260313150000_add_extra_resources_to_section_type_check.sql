ALTER TABLE public.units DROP CONSTRAINT IF EXISTS units_section_type_check;

ALTER TABLE public.units ADD CONSTRAINT units_section_type_check
  CHECK (section_type IN ('concept', 'deep_dive', 'case_study', 'hands_on', 'synthesis', 'extra_resources'));
