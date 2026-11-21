CREATE TABLE public.payment_code_reservations (
 code text PRIMARY KEY,
 parcel_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.payment_code_reservations TO service_role;
ALTER TABLE public.payment_code_reservations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payment_fraud_phones (
 phone text PRIMARY KEY,
 duplicate_attempts integer NOT NULL DEFAULT 0,
 blacklisted_at timestamptz,
 last_attempt_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_fraud_phones TO authenticated;
GRANT ALL ON public.payment_fraud_phones TO service_role;
ALTER TABLE public.payment_fraud_phones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view payment fraud phones" ON public.payment_fraud_phones FOR SELECT TO authenticated USING (public.is_pap_staff(auth.uid()));

CREATE TABLE public.payment_code_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 phone text NOT NULL,
 code text,
 seller_id uuid NOT NULL,
 outcome text NOT NULL CHECK (outcome IN ('duplicate_warning','blacklisted','blocked')),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_code_attempts TO authenticated;
GRANT ALL ON public.payment_code_attempts TO service_role;
ALTER TABLE public.payment_code_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view payment code attempts" ON public.payment_code_attempts FOR SELECT TO authenticated USING (public.is_pap_staff(auth.uid()));
CREATE INDEX payment_code_attempts_phone_idx ON public.payment_code_attempts(phone, created_at);

INSERT INTO public.payment_code_reservations(code, parcel_id, created_at)
 SELECT DISTINCT ON (upper(trim(payment_code))) upper(trim(payment_code)), id, created_at
 FROM public.parcels WHERE nullif(trim(payment_code),'') IS NOT NULL
 ORDER BY upper(trim(payment_code)), created_at, id;

CREATE OR REPLACE FUNCTION public.guard_parcel_payment_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_phone text; v_code text; v_attempts integer; v_message text;
BEGIN
 v_phone := public.normalize_phone(NEW.buyer_phone);
 v_code := nullif(upper(trim(NEW.payment_code)), '');
 NEW.payment_code := v_code;
 IF TG_OP = 'UPDATE' THEN
  IF v_phone = public.normalize_phone(OLD.buyer_phone) AND v_code IS NOT DISTINCT FROM nullif(upper(trim(OLD.payment_code)), '') THEN RETURN NEW; END IF;
 END IF;
 IF v_phone !~ '^[71][0-9]{8}$' THEN RAISE EXCEPTION 'Please enter a valid Kenyan phone number'; END IF;
 IF v_code IS NOT NULL AND v_code !~ '^[A-Z0-9]{6,20}$' THEN RAISE EXCEPTION 'Please enter a valid M-Pesa / Airtel Money code'; END IF;
 PERFORM set_config('app.payment_rejection', '', true);
 PERFORM pg_advisory_xact_lock(hashtextextended('payment-phone:' || v_phone, 0));
 IF EXISTS (SELECT 1 FROM public.payment_fraud_phones WHERE phone = v_phone AND blacklisted_at IS NOT NULL) THEN
  INSERT INTO public.payment_code_attempts(phone,code,seller_id,outcome) VALUES(v_phone,v_code,NEW.seller_id,'blocked');
  PERFORM set_config('app.payment_rejection', 'This phone number is blacklisted because of repeated payment-code reuse. New orders are blocked. Contact Pata Parcel for review.', true);
  RETURN NULL;
 END IF;
 IF v_code IS NULL THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('payment-code:' || v_code, 0));
 IF EXISTS (SELECT 1 FROM public.payment_code_reservations WHERE code = v_code AND parcel_id <> NEW.id) THEN
  INSERT INTO public.payment_fraud_phones(phone,duplicate_attempts) VALUES(v_phone,1)
  ON CONFLICT(phone) DO UPDATE SET duplicate_attempts = payment_fraud_phones.duplicate_attempts + 1, last_attempt_at = now()
  RETURNING duplicate_attempts INTO v_attempts;
  IF v_attempts >= 2 THEN
   UPDATE public.payment_fraud_phones SET blacklisted_at = coalesce(blacklisted_at, now()) WHERE phone = v_phone;
   v_message := 'This payment code is already used. This phone number is now blacklisted after repeated reuse attempts. New orders are blocked. Contact Pata Parcel for review.';
  ELSE
   v_message := 'This payment code is already used. Do not reuse M-Pesa or Airtel Money codes. Another reuse attempt will blacklist this phone number.';
  END IF;
  INSERT INTO public.payment_code_attempts(phone,code,seller_id,outcome) VALUES(v_phone,v_code,NEW.seller_id,CASE WHEN v_attempts >= 2 THEN 'blacklisted' ELSE 'duplicate_warning' END);
  PERFORM set_config('app.payment_rejection', v_message, true);
  RETURN NULL;
 END IF;
 INSERT INTO public.payment_code_reservations(code,parcel_id) VALUES(v_code,NEW.id) ON CONFLICT(code) DO NOTHING;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_parcel_payment_code() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_parcel_payment_code BEFORE INSERT OR UPDATE OF payment_code,buyer_phone ON public.parcels FOR EACH ROW EXECUTE FUNCTION public.guard_parcel_payment_code();

CREATE OR REPLACE FUNCTION public.submit_buyer_order(_code text, _buyer_name text, _buyer_phone text, _destination text, _sending_method text, _psv_sacco text, _pick_point text, _package_type text, _package_description text, _sending_fee numeric, _goods_amount numeric, _payment_code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _seller uuid; _ref text; _phone text;
BEGIN
 SELECT id INTO _seller FROM public.profiles WHERE order_link_code = _code;
 IF _seller IS NULL THEN RAISE EXCEPTION 'This order link is not valid'; END IF;
 _phone := regexp_replace(coalesce(_buyer_phone,''), '\s', '', 'g');
 IF length(trim(coalesce(_buyer_name,''))) NOT BETWEEN 2 AND 80 THEN RAISE EXCEPTION 'Please enter your name'; END IF;
 IF _phone !~ '^(07|01)[0-9]{8}$' THEN RAISE EXCEPTION 'Please enter a valid Kenyan phone number'; END IF;
 IF length(trim(coalesce(_destination,''))) NOT BETWEEN 2 AND 80 THEN RAISE EXCEPTION 'Please choose a destination town'; END IF;
 IF _sending_method IS NULL OR _sending_method NOT IN ('pickup_mtaani','pata_parcel','door_to_door','psv','psv_driver') THEN RAISE EXCEPTION 'Please choose a sending method'; END IF;
 IF _sending_method = 'psv' AND length(trim(coalesce(_psv_sacco,''))) = 0 THEN RAISE EXCEPTION 'Please choose a SACCO'; END IF;
 IF _sending_method = 'door_to_door' AND length(trim(coalesce(_pick_point,''))) = 0 THEN RAISE EXCEPTION 'Please choose a pick-point'; END IF;
 IF coalesce(_goods_amount, -1) < 0 OR _goods_amount > 10000000 THEN RAISE EXCEPTION 'Please enter the amount you paid'; END IF;
 IF coalesce(upper(trim(_payment_code)),'') !~ '^[A-Z0-9]{6,20}$' THEN RAISE EXCEPTION 'Please enter your M-Pesa / Airtel Money code'; END IF;
 IF length(coalesce(_package_description,'')) > 500 OR length(coalesce(_package_type,'')) > 300 THEN RAISE EXCEPTION 'Description is too long'; END IF;
 INSERT INTO public.parcels(seller_id,buyer_name,buyer_phone,destination,sending_method,psv_sacco,pick_point,package_type,package_description,num_packages,sending_fee_per_package,total_sending_fee,payment_status,tracking_status,goods_amount,payment_code,goods_paid,order_source)
 VALUES(_seller,trim(_buyer_name),_phone,trim(_destination),_sending_method,
 CASE WHEN _sending_method IN ('psv','psv_driver') THEN nullif(trim(_psv_sacco),'') END,
 CASE WHEN _sending_method = 'door_to_door' THEN nullif(trim(_pick_point),'') END,
 coalesce(nullif(trim(_package_type),''),'Other'),nullif(trim(_package_description),''),1,
 CASE WHEN _sending_method = 'psv_driver' THEN 0 ELSE greatest(coalesce(_sending_fee,0),0) END,
 CASE WHEN _sending_method = 'psv_driver' THEN 0 ELSE greatest(coalesce(_sending_fee,0),0) END,
 CASE WHEN _sending_method = 'psv_driver' THEN 'pay_on_delivery' ELSE 'paid' END,
 'awaiting_verification',_goods_amount,upper(trim(_payment_code)),false,'buyer_link') RETURNING reference_number INTO _ref;
 IF _ref IS NULL THEN RETURN 'PAYMENT_REJECTED:' || coalesce(nullif(current_setting('app.payment_rejection',true),''),'Order could not be created'); END IF;
 RETURN _ref;
END $$;
REVOKE ALL ON FUNCTION public.submit_buyer_order(text,text,text,text,text,text,text,text,text,numeric,numeric,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_buyer_order(text,text,text,text,text,text,text,text,text,numeric,numeric,text) TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.seller_create_parcel(_input jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_parcel public.parcels; v_method text; v_fee numeric;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in to create a dispatch'; END IF;
 v_method := _input->>'sending_method';
 v_fee := (_input->>'sending_fee')::numeric;
 IF length(trim(coalesce(_input->>'buyer_name',''))) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'Please enter the buyer name'; END IF;
 IF length(trim(coalesce(_input->>'destination',''))) NOT BETWEEN 2 AND 80 THEN RAISE EXCEPTION 'Please select a destination town'; END IF;
 IF v_method IS NULL OR v_method NOT IN ('pickup_mtaani','pata_parcel','door_to_door','psv','psv_driver') THEN RAISE EXCEPTION 'Please choose a sending method'; END IF;
 IF v_method = 'psv' AND nullif(trim(_input->>'psv_sacco'),'') IS NULL THEN RAISE EXCEPTION 'Please choose a SACCO'; END IF;
 IF v_method = 'door_to_door' AND nullif(trim(_input->>'pick_point'),'') IS NULL THEN RAISE EXCEPTION 'Please choose a pick-point'; END IF;
 IF v_fee IS NULL OR v_fee < 0 OR v_fee > 10000000 THEN RAISE EXCEPTION 'Please enter a valid sending fee'; END IF;
 IF coalesce((_input->>'goods_amount')::numeric,0) < 0 OR coalesce((_input->>'goods_amount')::numeric,0) > 10000000 THEN RAISE EXCEPTION 'Please enter a valid goods amount'; END IF;
 IF length(coalesce(_input->>'package_description','')) > 500 OR length(coalesce(_input->>'package_type','')) NOT BETWEEN 1 AND 300 THEN RAISE EXCEPTION 'Please check the package details'; END IF;
 INSERT INTO public.parcels(seller_id,buyer_name,buyer_phone,destination,sending_method,psv_sacco,pick_point,package_type,package_description,num_packages,sending_fee_per_package,total_sending_fee,payment_status,tracking_status,goods_amount,payment_code,goods_paid,order_source)
 VALUES(auth.uid(),trim(_input->>'buyer_name'),trim(_input->>'buyer_phone'),trim(_input->>'destination'),v_method,
 CASE WHEN v_method IN ('psv','psv_driver') THEN nullif(trim(_input->>'psv_sacco'),'') END,
 CASE WHEN v_method = 'door_to_door' THEN nullif(trim(_input->>'pick_point'),'') END,
 trim(_input->>'package_type'),nullif(trim(_input->>'package_description'),''),1,
 CASE WHEN v_method = 'psv_driver' THEN 0 ELSE v_fee END,CASE WHEN v_method = 'psv_driver' THEN 0 ELSE v_fee END,
 CASE WHEN v_method = 'psv_driver' THEN 'pay_on_delivery' ELSE 'paid' END,'awaiting_verification',(_input->>'goods_amount')::numeric,
 nullif(upper(trim(_input->>'payment_code')),''),false,'seller') RETURNING * INTO v_parcel;
 IF v_parcel.id IS NULL THEN RETURN jsonb_build_object('error',coalesce(nullif(current_setting('app.payment_rejection',true),''),'Order could not be created')); END IF;
 RETURN jsonb_build_object('parcel',to_jsonb(v_parcel));
END $$;
REVOKE ALL ON FUNCTION public.seller_create_parcel(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seller_create_parcel(jsonb) TO authenticated,service_role;