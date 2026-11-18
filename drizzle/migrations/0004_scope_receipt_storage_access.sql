ALTER POLICY "Signed-in read receipts" ON storage.objects
USING (
  bucket_id = 'receipts' AND (
    owner_id = (SELECT auth.uid()::text)
    OR (
      (storage.foldername(name))[1] = 'receipts'
      AND EXISTS (
        SELECT 1
        FROM public.parcel_receipts AS receipt
        JOIN public.parcels AS parcel ON parcel.id = receipt.parcel_id
        WHERE receipt.receipt_image_url = storage.objects.name
          AND receipt.uploaded_by::text = storage.objects.owner_id
          AND (
            parcel.seller_id = (SELECT auth.uid())
            OR (SELECT public.is_pap_staff(auth.uid()))
          )
      )
    )
  )
);

ALTER POLICY "Signed-in upload receipts" ON storage.objects
WITH CHECK (
  bucket_id = 'receipts'
  AND owner_id = (SELECT auth.uid()::text)
  AND cardinality(storage.foldername(name)) = 1
  AND (
    (
      (storage.foldername(name))[1] = 'avatars'
      AND starts_with(storage.filename(name), (SELECT auth.uid()::text) || '-')
    )
    OR (
      (storage.foldername(name))[1] = 'receipts'
      AND (SELECT public.is_pap_staff(auth.uid()))
    )
  )
);