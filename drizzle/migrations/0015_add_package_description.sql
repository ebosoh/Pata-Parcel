ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS package_description text;
COMMENT ON COLUMN public.parcels.package_description IS 'Optional seller-provided details about package contents.';