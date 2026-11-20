ALTER TABLE public.parcels
  DROP CONSTRAINT parcels_sending_method_check;

ALTER TABLE public.parcels
  ADD CONSTRAINT parcels_sending_method_check
  CHECK (sending_method IN ('pickup_mtaani','pata_parcel','door_to_door','psv','psv_driver'));