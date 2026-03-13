ALTER TABLE public.units DROP CONSTRAINT IF EXISTS units_unit_role_check;

ALTER TABLE public.units ADD CONSTRAINT units_unit_role_check
  CHECK (unit_role IN ('normal', 'bonus', 'repeat', 'extra_resources', 'cycle_recap'));
