CREATE OR REPLACE FUNCTION public.set_parcel_tracking_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _name text;
BEGIN
  SELECT regexp_replace(initcap(coalesce(nullif(owner_name,''), nullif(business_name,''), 'Seller')), '[^A-Za-z0-9]', '', 'g')
    INTO _name FROM public.profiles WHERE id = NEW.seller_id;
  IF _name IS NULL OR _name = '' THEN _name := 'Seller'; END IF;
  NEW.reference_number := left(_name, 24) || '-' || lpad((nextval('parcel_ref_seq') % 1000000)::text, 6, '0');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_set_parcel_tracking_code ON public.parcels;
CREATE TRIGGER trg_set_parcel_tracking_code BEFORE INSERT ON public.parcels
FOR EACH ROW EXECUTE FUNCTION public.set_parcel_tracking_code();
CREATE UNIQUE INDEX IF NOT EXISTS parcels_reference_number_key ON public.parcels (reference_number);