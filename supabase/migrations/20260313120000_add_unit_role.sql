-- Add unit_role column to units table
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS unit_role text NOT NULL DEFAULT 'normal';

-- Backfill existing bonus rows
UPDATE public.units SET unit_role = 'bonus' WHERE is_bonus = true;

-- Add CHECK constraint for valid unit_role values
ALTER TABLE public.units ADD CONSTRAINT units_unit_role_check
  CHECK (unit_role IN ('normal', 'bonus', 'repeat', 'extra_resources'));
